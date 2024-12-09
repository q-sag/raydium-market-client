// migration_ws.pump.ts

import { PublicKey } from "@solana/web3.js";
import { connection, redisPublisher } from '../utils/utils'; // Ensure this exports a Connection instance
import Logger from '../utils/logger';
import { RAYDIUM_AUTHORITY, RAYDIUM_PROGRAM, PUMP_MIGRATION_ACCOUNT, pump_MIGRATION_ALL } from "../utils/utils";
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { Connection } from '@solana/web3.js';

// Initialize the logger
const logger = new Logger('PumpMigration');

// Initialize PostgreSQL connection
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Add after PostgreSQL connection initialization
async function initializeDatabase() {
  try {
    // Drop existing table and recreate
    await pgPool.query(`
      DROP TABLE IF EXISTS migration_transactions CASCADE;
      
      CREATE TABLE migration_transactions (
        id SERIAL PRIMARY KEY,
        mint_address TEXT NOT NULL UNIQUE,
        withdraw_signature TEXT UNIQUE,
        withdraw_timestamp TIMESTAMP,
        add_signature TEXT UNIQUE,
        add_timestamp TIMESTAMP,
        pool_id TEXT,
        is_complete BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_mint UNIQUE (mint_address)
      );

      CREATE INDEX idx_migration_transactions_mint 
        ON migration_transactions(mint_address);
      CREATE INDEX idx_migration_transactions_withdraw 
        ON migration_transactions(withdraw_signature);
      CREATE INDEX idx_migration_transactions_add 
        ON migration_transactions(add_signature);
    `);
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// Define the owners to filter
const TARGET_OWNERS = [
  RAYDIUM_AUTHORITY,
  PUMP_MIGRATION_ACCOUNT
];

// Add after other constants
const UNMATCHED_EVENTS_LOG = 'unmatched_migrations.log';

// Add at the top with other constants
const subscriptionIds = new Map<string, number>();

// Update the tracking interface at the top
interface TokenEvent {
  withdrawTime?: Date;
  addTime?: Date;
  signature: string;
  provider?: string; // Track which provider sent the event
}

// Replace the simple Set with our new tracking structure
const tokenEventMap = new Map<string, TokenEvent>();

// Add time check constant
const TIMEOUT_MINUTES = 30;

// Add seen transactions set to prevent duplicates
const seenTransactions = new Set<string>();

// Create connections for different providers
const connections = {
  'Quicknode': new Connection(
    process.env.RPC_URL || "",
    {
      wsEndpoint: process.env.RPC_WSS || "",
      commitment: "processed"
    }
  ),
  'Helius': new Connection(
    process.env.HELIUS_RPC_URL || "",
    {
      wsEndpoint: process.env.HELIUS_WSS || "",
      commitment: "processed"
    }
  )
};

// Update database with migration event
async function recordMigrationEvent(
  mint: string, 
  signature: string, 
  eventType: 'withdraw' | 'add', 
  poolId?: string
) {
  try {
    const query = eventType === 'withdraw' 
      ? `
        INSERT INTO migration_transactions 
          (mint_address, withdraw_signature, withdraw_timestamp, is_complete)
        VALUES 
          ($1, $2, NOW(), false)
        ON CONFLICT (mint_address) DO UPDATE SET
          withdraw_signature = EXCLUDED.withdraw_signature,
          withdraw_timestamp = NOW(),
          updated_at = NOW()
        RETURNING *;
      `
      : `
        INSERT INTO migration_transactions 
          (mint_address, add_signature, add_timestamp, pool_id, is_complete)
        VALUES 
          ($1, $2, NOW(), $3, true)
        ON CONFLICT (mint_address) DO UPDATE SET
          add_signature = EXCLUDED.add_signature,
          add_timestamp = NOW(),
          pool_id = EXCLUDED.pool_id,
          is_complete = true,
          updated_at = NOW()
        RETURNING *;
      `;

    const values = eventType === 'withdraw' 
      ? [mint, signature]
      : [mint, signature, poolId];
    
    const result = await pgPool.query(query, values);
    logger.debug(`Recorded migration event: ${JSON.stringify(result.rows[0])}`);
  } catch (error) {
    logger.error(`Error recording migration event: ${error}`);
  }
}

// Handler function for incoming logs
async function handleLog(logs: any, status: 'withdraw' | 'add', provider: string) {
  try {
    const signature = logs.signature;

    // Skip if we've seen this transaction before
    if (seenTransactions.has(signature)) {
      logger.debug(`Skipping duplicate transaction: ${signature} from ${provider}`);
      return;
    }
    seenTransactions.add(signature);

    logger.debug(`Handling log with status: ${status}`);
    logger.debug(`Raw logs: ${JSON.stringify(logs)}`);

    logger.debug(`New transaction detected: ${signature}`);

    // Fetch the transaction details
    const transaction = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (transaction === null || transaction.meta === null) {
      logger.warn(`This is probably JITO TIP transaction: ${signature}`);
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
    
    // Record the event in database
    let poolId: string | undefined;
    if (status === 'add') {
      const innerInstructions = transaction.meta.innerInstructions || [];
      for (const innerGroup of innerInstructions) {
        for (const instruction of innerGroup.instructions) {
          if ('parsed' in instruction && 
              instruction.parsed?.info?.owner === RAYDIUM_PROGRAM) {
            poolId = instruction.parsed.info.account;
            break;
          }
        }
        if (poolId) break;
      }
    }

    await recordMigrationEvent(mint, signature, status, poolId);

    // Update token event tracking
    if (!tokenEventMap.has(mint)) {
      tokenEventMap.set(mint, { signature, provider });
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

// Update checkTimeoutEvents to match new schema
async function checkTimeoutEvents() {
  try {
    const query = `
      SELECT * FROM migration_transactions 
      WHERE withdraw_timestamp IS NOT NULL 
      AND add_timestamp IS NULL 
      AND withdraw_timestamp < NOW() - INTERVAL '30 minutes'
      AND is_complete = false
    `;
    
    const result = await pgPool.query(query);
    
    for (const row of result.rows) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        mint: row.mint_address,
        status: 'timeout',
        withdrawTime: row.withdraw_timestamp,
        withdrawSignature: row.withdraw_signature,
        message: `No 'add' event received within 30 minutes of withdraw`
      };

      fs.appendFileSync(
        path.join(__dirname, '..', 'logs', UNMATCHED_EVENTS_LOG),
        JSON.stringify(logEntry) + '\n'
      );
    }
  } catch (error) {
    logger.error(`Error checking timeout events: ${error}`);
  }
}

(async () => {
  try {
    await initializeDatabase();
    // No need to initialize Redis subscriber since we're only publishing

    // Convert the account string to a PublicKey object
    const ACCOUNT_TO_WATCH = new PublicKey(PUMP_MIGRATION_ACCOUNT);

    // Subscribe to both providers
    for (const [provider, connection] of Object.entries(connections)) {
      const subId = await connection.onLogs(
        ACCOUNT_TO_WATCH,
        async (logs, context) => {
          try {
            const transaction = await connection.getParsedTransaction(logs.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            });

            if (!transaction?.meta) return;

            const withdrawDetected = logs.logs.some((log: string) => 
              log.includes("Withdraw")
            );
            const mintInstructionDetected = logs.logs.some((log: string) => 
              log.includes("MintTo")
            );

            if (withdrawDetected) {
              handleLog(logs, 'withdraw', provider);
            }

            if (mintInstructionDetected) {
              handleLog(logs, 'add', provider);
            }
          } catch (error) {
            logger.error(`Error processing transaction: ${error}`);
          }
        },
        'confirmed'
      );
      subscriptionIds.set(provider, subId);
      logger.info(`Subscribed to logs with ${provider}, subscription ID: ${subId}`);
    }

    // Add periodic check for timeout events
    const checkInterval = setInterval(checkTimeoutEvents, 5 * 60 * 1000); // Check every 5 minutes

    // Graceful shutdown handler
    const gracefulShutdown = async () => {
      logger.debug('Shutting down gracefully...');
      
      clearInterval(checkInterval);
      logRemainingUnmatched();

      redisPublisher.quit();
      logger.debug('Redis publisher connection closed.');

      // Remove all subscriptions
      for (const [provider, subId] of subscriptionIds) {
        await connections[provider].removeOnLogsListener(subId);
        logger.debug(`Unsubscribed from ${provider} logs. Subscription ID: ${subId} removed.`);
      }

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
