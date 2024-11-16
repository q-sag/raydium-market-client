// testSubscription.ts

import { Connection, PublicKey, Commitment, AccountInfo, AccountSubscriptionConfig } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import Logger from '../../../utils/logger'; // Adjust the path as necessary
import Redis from 'ioredis';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { redisPublisher, redisSubscriber, pump_SUBSCRIPTIONS_CHANNEL, pump_UNSUBSCRIPTIONS_CHANNEL } from '../../utils/utils';
import { market_PumpPriceUpdates } from '../../../utils/interfaces'

// Initialize Logger
const logger = new Logger('testSubscription');

// Function to send a subscription request via Redis
function sendSubscriptionRequest(tokenMint: string, trade_id: string) {
  const subscriptionMessage = JSON.stringify({ tokenMint, trade_id });
  redisPublisher
    .publish(pump_SUBSCRIPTIONS_CHANNEL, subscriptionMessage)
    .then(() => {
      logger.info(`Sent subscription request: ${subscriptionMessage}`);
    })
    .catch((error) => {
      logger.error(`Failed to send subscription request: ${error}`);
    });
}

// Function to listen to pool updates
function listenToPumpPriceUpdates(): void {
  redisSubscriber.subscribe('PumpPriceUpdates', (err, count) => {
    if (err) {
      console.error('Failed to subscribe to PumpPriceUpdates channel:', err);
      process.exit(1);
    }
    console.log(`Listening for pool updates on 'PumpPriceUpdates' channel...`);
  });

  redisSubscriber.on('message', (channel, message) => {
    if (channel === 'PumpPriceUpdates') {
      try {
        // const update = JSON.parse(message);
        // console.log('Received Pool Update:', update);
        const update: market_PumpPriceUpdates = JSON.parse(message);
        console.log(update); 
      } catch (error) {
        console.error('Failed to parse pool update message:', message);
      }
    }
  });
}
// Main Execution Function
async function main() {
  // Parse and handle command-line arguments
//   handleCommands();
    const tokenMint= "CAbm3LgpUi7qEiLdYrggaK3WXjcgWfaA52pgoj41pump"


    listenToPumpPriceUpdates();

    sendSubscriptionRequest(tokenMint, 'test')
}

// Handle graceful shutdown
function shutdown() {
  logger.info('Shutting down testSubscription...');

  // Disconnect Redis publisher
  redisPublisher
    .quit()
    .then(() => {
      logger.info('Redis publisher disconnected.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`Error disconnecting Redis publisher: ${error}`);
      process.exit(1);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Execute the main function if the script is run directly
if (require.main === module) {
  main().catch((error) => {
    logger.error(`Unhandled error in testSubscription.ts: ${error}`);
    shutdown();
  });
}
