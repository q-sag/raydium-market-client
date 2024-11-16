// test_migration_ws_pump.ts

import { redisPublisher, redisSubscriber } from '../../utils/utils'; // Ensure correct path
import * as readline from 'readline';
import { Redis as IORedis } from 'ioredis';
import { pump_MIGRATION_ALL, pump_MIGRATION_SUBSCRIBE, pump_MIGRATION_UNSUBSCRIBE } from '../../utils/utils';
/**
 * Logger Utility
 */
class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  info(message: string) {
    console.log(`[INFO] [${this.prefix}] ${message}`);
  }

  warn(message: string) {
    console.warn(`[WARN] [${this.prefix}] ${message}`);
  }

  error(message: string) {
    console.error(`[ERROR] [${this.prefix}] ${message}`);
  }
}

const logger = new Logger('TestMigrationPump');

/**
 * Interface for Subscription Entries
 */
interface SubscriptionEntry {
  trade_id: string;
  tokenMint: string;
}

/**
 * Additional Set to track subscriptions using composite keys
 */
const subscriptions: Set<string> = new Set();

/**
 * Flag to control emitting all updates
 */
let emitAllUpdates: boolean = false;

/**
 * Function to handle subscription messages
 */
function handleSubscribeMessage(trade_id: string, tokenMint: string) {
  const key = `${trade_id}:${tokenMint}`;
  if (subscriptions.has(key)) {
    logger.warn(`Already subscribed to trade_id: ${trade_id}, tokenMint: ${tokenMint}`);
    return;
  }
  subscriptions.add(key);
  logger.info(`Subscribed to trade_id: ${trade_id}, tokenMint: ${tokenMint}`);
}

/**
 * Function to handle unsubscription messages
 */
function handleUnsubscribeMessage(trade_id: string, tokenMint: string) {
  const key = `${trade_id}:${tokenMint}`;
  if (subscriptions.has(key)) {
    subscriptions.delete(key);
    logger.info(`Unsubscribed from trade_id: ${trade_id}, tokenMint: ${tokenMint}`);
  } else {
    logger.warn(`No existing subscription for trade_id: ${trade_id}, tokenMint: ${tokenMint}`);
  }
}

/**
 * Function to handle global update control
 */
function handleGlobalUpdate(message: string) {
  if (message === 'start') {
    emitAllUpdates = true;
    logger.info(`pump_MIGRATION_ALL channel activated. All updates will be emitted.`);
  } else if (message === 'stop') {
    emitAllUpdates = false;
    logger.info(`pump_MIGRATION_ALL channel deactivated. Emitting updates based on subscriptions.`);
  } else {
    logger.warn(`Unknown message on pump_MIGRATION_ALL channel: ${message}`);
  }
}

/**
 * Function to listen for emitted updates
 */
function listenForUpdates() {
  // Subscribe to pump_MIGRATION_SUBSCRIBE channel for specific updates
  redisSubscriber.subscribe(pump_MIGRATION_SUBSCRIBE, (err, count) => {
    if (err) {
      logger.error(`Failed to subscribe to pump_MIGRATION_SUBSCRIBE: ${err.message}`);
      process.exit(1);
    }
    logger.info(`Subscribed to pump_MIGRATION_SUBSCRIBE channel. Currently subscribed to ${count} channel(s).`);
  });

  // Subscribe to pump_MIGRATION_ALL channel for global updates
  redisSubscriber.subscribe(pump_MIGRATION_ALL, (err, count) => {
    if (err) {
      logger.error(`Failed to subscribe to pump_MIGRATION_ALL: ${err.message}`);
      process.exit(1);
    }
    logger.info(`Subscribed to pump_MIGRATION_ALL channel. Currently subscribed to ${count} channel(s).`);
  });

  // Handle incoming messages
  redisSubscriber.on('message', (channel: string, message: string) => {
    if (channel === pump_MIGRATION_SUBSCRIBE) {
      logger.info(`Received update on pump_MIGRATION_SUBSCRIBE: ${message}`);
    } else if (channel === pump_MIGRATION_ALL) {
      logger.info(`Received update on pump_MIGRATION_ALL: ${message}`);
    }
  });
}

/**
 * Function to publish subscription messages
 */
async function publishSubscription(publisher: IORedis, channel: string, trade_id: string, tokenMint: string) {
  const message = JSON.stringify({ trade_id, tokenMint });
  await publisher.publish(channel, message);
}

/**
 * Function to set up the command-line interface
 */
function setupCommandLineInterface(publisher: IORedis) {
  logger.info('Setting up command-line interface...');
  logger.info('Available Commands:');
  logger.info('  subscribe <trade_id> <tokenMint>    - Subscribe to updates for a specific trade_id and tokenMint.');
  logger.info('  unsubscribe <trade_id> <tokenMint>  - Unsubscribe from updates for a specific trade_id and tokenMint.');
  logger.info('  start_all                           - Start receiving all updates.');
  logger.info('  stop_all                            - Stop receiving all updates.');
  logger.info('  exit                                - Exit the test script.');
  rl.prompt();

  rl.on('line', async (input: string) => {
    const args = input.trim().split(' ');
    const command = args[0].toLowerCase();

    switch (command) {
      case 'subscribe':
        if (args.length !== 3) {
          logger.warn('Usage: subscribe <trade_id> <tokenMint>');
        } else {
          const trade_id = args[1];
          const tokenMint = args[2];
          await publishSubscription(publisher, pump_MIGRATION_SUBSCRIBE, trade_id, tokenMint);
          handleSubscribeMessage(trade_id, tokenMint);
        }
        break;

      case 'unsubscribe':
        if (args.length !== 3) {
          logger.warn('Usage: unsubscribe <trade_id> <tokenMint>');
        } else {
          const trade_id = args[1];
          const tokenMint = args[2];
          await publishSubscription(publisher, pump_MIGRATION_UNSUBSCRIBE, trade_id, tokenMint);
          handleUnsubscribeMessage(trade_id, tokenMint);
        }
        break;

      case 'start_all':
        await publisher.publish(pump_MIGRATION_ALL, 'start');
        emitAllUpdates = true;
        logger.info('Published "start" message to pump_MIGRATION_ALL channel.');
        break;

      case 'stop_all':
        await publisher.publish(pump_MIGRATION_ALL, 'stop');
        emitAllUpdates = false;
        logger.info('Published "stop" message to pump_MIGRATION_ALL channel.');
        break;

      case 'exit':
        logger.info('Exiting test script...');
        rl.close();
        break;

      default:
        logger.warn('Unknown command. Please use one of the available commands.');
    }

    rl.prompt();
  });
}

/**
 * Function to gracefully shutdown the script
 */
async function gracefulShutdown(publisher: IORedis, subscriber: IORedis) {
  logger.info('Shutting down gracefully...');

  try {
    // Unsubscribe from all channels
    await subscriber.unsubscribe(pump_MIGRATION_SUBSCRIBE);
    await subscriber.unsubscribe(pump_MIGRATION_ALL);
    logger.info('Unsubscribed from all Redis channels.');

    // Disconnect Redis clients
    await subscriber.quit();
    await publisher.quit();
    logger.info('Disconnected from Redis.');

    process.exit(0);
  } catch (error: any) {
    logger.error(`Error during shutdown: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Setup Readline interface
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'TestMigrationPump> ',
});

/**
 * Main Execution
 */
(async () => {
  try {
    // Ensure that redisPublisher and redisSubscriber are connected
    if (!redisPublisher || !redisSubscriber) {
      logger.error('redisPublisher and/or redisSubscriber are not initialized.');
      process.exit(1);
    }

    // Listen for emitted updates
    listenForUpdates();

    // Set up command-line interface
    setupCommandLineInterface(redisPublisher);

    // Handle graceful shutdown on SIGINT and SIGTERM
    const shutdown = async () => {
      await gracefulShutdown(redisPublisher, redisSubscriber);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error: any) {
    logger.error(`Error initializing test script: ${error.message}`);
    process.exit(1);
  }
})();
