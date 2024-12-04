// migration_ws.pump.ts

import { PublicKey } from "@solana/web3.js";
import { connection, redisPublisher } from '../utils/utils'; // Ensure this exports a Connection instance
import Logger from '../utils/logger';
import { RAYDIUM_AUTHORITY, RAYDIUM_PROGRAM, PUMP_MIGRATION_ACCOUNT, pump_MIGRATION_ALL } from "../utils/utils";

// Initialize the logger
const logger = new Logger('PumpMigration');

// Define the owners to filter
const TARGET_OWNERS = [
  RAYDIUM_AUTHORITY,
  PUMP_MIGRATION_ACCOUNT
];

// Handler function for incoming logs
async function handleLog(logs: any, status: 'withdraw' | 'add') {
  try {
    logger.debug(`Handling log with status: ${status}`);

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

(async () => {
  try {
    // No need to initialize Redis subscriber since we're only publishing

    // Convert the account string to a PublicKey object
    const ACCOUNT_TO_WATCH = new PublicKey(PUMP_MIGRATION_ACCOUNT);

    // Subscribe to logs mentioning the target account
    const subscriptionId = await connection.onLogs(
      ACCOUNT_TO_WATCH,
      (logs, context) => {
        const withdrawDetected = logs.logs.some((log: string) => log.includes("Withdraw"));
        const addDetected = logs.logs.some((log: string) => log.includes("MintTo"));

        // Trigger handleLog with appropriate status if the condition is met
        if (withdrawDetected) {
          handleLog(logs, 'withdraw');
        }

        if (addDetected) {
          handleLog(logs, 'add');
        }
      },
      'confirmed'
    );

    logger.debug(`Subscribed to transaction logs for account: ${ACCOUNT_TO_WATCH.toBase58()} with subscription ID: ${subscriptionId}`);

    // Graceful shutdown handler
    const gracefulShutdown = async () => {
      logger.debug('Shutting down gracefully...');

      redisPublisher.quit();
      logger.debug('Redis publisher connection closed.');

      // Unsubscribe from Solana logs
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
