// migration_ws.pump.ts

import { PublicKey } from "@solana/web3.js";
import { connection, redisPublisher } from '../utils/utils'; // Ensure this exports a Connection instance
import Logger from '../utils/logger';
import { RAYDIUM_AUTHORITY, RAYDIUM_PROGRAM, PUMP_MIGRATION_ACCOUNT, pump_MIGRATION_ALL } from "../utils/utils";
import fs from 'fs';
import path from 'path';

// Initialize the logger
const logger = new Logger('PumpMigration');

// Define the owners to filter
const TARGET_OWNERS = [
  RAYDIUM_AUTHORITY,
  PUMP_MIGRATION_ACCOUNT
];

// Add after other constants
const UNMATCHED_EVENTS_LOG = 'unmatched_migrations.log';

// Update the tracking interface at the top
interface TokenEvent {
  withdrawTime?: Date;
  addTime?: Date;
  signature: string;
}

// Replace the simple Set with our new tracking structure
const tokenEventMap = new Map<string, TokenEvent>();

// Add time check constant
const TIMEOUT_MINUTES = 30;

// Add function to check for timed-out events
function checkTimeoutEvents() {
  const now = new Date();
  for (const [mint, events] of tokenEventMap.entries()) {
    if (events.withdrawTime && !events.addTime) {
      const timeDiffMinutes = (now.getTime() - events.withdrawTime.getTime()) / (1000 * 60);
      
      if (timeDiffMinutes >= TIMEOUT_MINUTES) {
        const logEntry = {
          timestamp: now.toISOString(),
          mint,
          status: 'timeout',
          withdrawTime: events.withdrawTime.toISOString(),
          signature: events.signature,
          message: `No 'add' event received within ${TIMEOUT_MINUTES} minutes of withdraw`
        };

        fs.appendFileSync(
          path.join(__dirname, '..', 'logs', UNMATCHED_EVENTS_LOG),
          JSON.stringify(logEntry) + '\n'
        );

        // Remove the tracked event after logging timeout
        tokenEventMap.delete(mint);
      }
    }
  }
}

// Handler function for incoming logs
async function handleLog(logs: any, status: 'withdraw' | 'add') {
  try {
    logger.debug(`Handling log with status: ${status}`);
    logger.debug(`Raw logs: ${JSON.stringify(logs)}`);

    const signature: string = logs.signature;
    logger.debug(`New transaction detected: ${signature}`);

    // Fetch the transaction details
    const transaction = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (transaction === null || transaction.meta === null) {
      logger.warn(`Transaction details not found or meta is null for signature: ${signature}.`);
      return;
    }

    // Extract token balances after the transaction
    const postTokenBalances = transaction.meta.postTokenBalances || [];

    // Filter balances where owner is in TARGET_OWNERS and decimals is 6
    const filteredBalances = postTokenBalances.filter(balance =>
      balance.owner && TARGET_OWNERS.includes(balance.owner) &&
      balance.uiTokenAmount.decimals === 6
    );

    // Extract mint addresses
    const mintAddresses = filteredBalances.map(balance => balance.mint);

    // Current timestamp in ISO format
    const timestamp = new Date().toISOString();

    if (mintAddresses.length === 0) {
      logger.warn(`No tokenMint found in transaction ${signature}.`);
      return;
    }

    const mint = mintAddresses[0];
    
    // Track the event for this token
    if (!tokenEventMap.has(mint)) {
      tokenEventMap.set(mint, { signature: logs.signature });
    }

    const tokenEvent = tokenEventMap.get(mint)!;
    
    if (status === 'withdraw') {
      tokenEvent.withdrawTime = new Date();
    } else if (status === 'add') {
      tokenEvent.addTime = new Date();
      
      // If we have both events, remove from tracking
      if (tokenEvent.withdrawTime) {
        tokenEventMap.delete(mint);
      }
    }

    const output: any = {
      timestamp,
      token: mint,
      status,
    };

    if (status === 'add') {
      // Extract the poolId from inner instructions
      let poolId: string | null = null;

      const innerInstructions = transaction.meta.innerInstructions || [];
      innerInstructions.forEach((innerInstructionGroup: any) => {
        innerInstructionGroup.instructions.forEach((instruction: any) => {
          const parsed = instruction.parsed;
          if (parsed?.info?.owner === RAYDIUM_PROGRAM) {
            const account = parsed.info.account;
            poolId = account;
          }
        });
      });

      if (poolId) {
        output.poolId = poolId;
      } else {
        logger.debug(`No poolId found for transaction ${signature}.`);
      }
    }

    logger.debug(`Emitting update: ${JSON.stringify(output)}`);
    emitUpdate(output);

  } catch (error: any) {
    logger.error(`Error handling log: ${error.message || error}`);
  }
}

// Function to emit updates to Redis channel
function emitUpdate(data: any) {
  const message = JSON.stringify(data);
  redisPublisher.publish(pump_MIGRATION_ALL, message, (err, count) => {
    if (err) {
      logger.error(`Failed to publish message to ${pump_MIGRATION_ALL}: ${err}`);
    } else {
      logger.debug(`Published message to ${pump_MIGRATION_ALL}. Subscribers: ${count}`);
    }
  });
}

// Add cleanup function to log remaining unmatched events
function logRemainingUnmatched() {
  const remaining = Array.from(tokenEventMap.entries()).map(([mint, events]) => ({
    mint,
    status: {
      withdraw: events.withdrawTime?.toISOString(),
      add: events.addTime?.toISOString(),
    },
    signature: events.signature,
    timestamp: new Date().toISOString(),
  }));

  if (remaining.length > 0) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message: 'Remaining unmatched events at shutdown',
      tokens: remaining,
    };

    fs.appendFileSync(
      path.join(__dirname, '..', 'logs', UNMATCHED_EVENTS_LOG),
      JSON.stringify(logEntry) + '\n'
    );
  }
}

(async () => {
  try {
    // No need to initialize Redis subscriber since we're only publishing

    // Convert the account string to a PublicKey object
    const ACCOUNT_TO_WATCH = new PublicKey(PUMP_MIGRATION_ACCOUNT);

    // Subscribe to logs mentioning the target account
    const subscriptionId = await connection.onLogs(
      ACCOUNT_TO_WATCH,
      async (logs, context) => {
        try {
          // logger.info(logs.signature)
          // logger.info(logs.logs)

          const transaction = await connection.getParsedTransaction(logs.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });

          if (!transaction?.meta) return;

          // Check both logs and instruction data
          const withdrawDetected = logs.logs.some((log: string) => log.includes("Withdraw"));
          const mintInstructionDetected = logs.logs.some((log: string) => log.includes("MintTo"));

          if (withdrawDetected) {
            handleLog(logs, 'withdraw');
          }

          if (mintInstructionDetected) {
            handleLog(logs, 'add');
          }
        } catch (error) {
          logger.error(`Error processing transaction: ${error}`);
        }
      },
      'confirmed'
    );

    logger.debug(`Subscribed to transaction logs for account: ${ACCOUNT_TO_WATCH.toBase58()} with subscription ID: ${subscriptionId}`);

    // Add periodic check for timeout events
    const checkInterval = setInterval(checkTimeoutEvents, 5 * 60 * 1000); // Check every 5 minutes

    // Graceful shutdown handler
    const gracefulShutdown = async () => {
      logger.debug('Shutting down gracefully...');
      
      clearInterval(checkInterval);
      logRemainingUnmatched();

      redisPublisher.quit();
      logger.debug('Redis publisher connection closed.');

      const removed = await connection.removeOnLogsListener(subscriptionId);
      logger.debug(`Unsubscribed from Solana logs. Subscription ID: ${subscriptionId} removed.`);

      process.exit(0);
    };

    // Listen for termination signals
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error: any) {
    logger.error(`Error in main execution: ${error.message || error}`);
    process.exit(1);
  }
})();
