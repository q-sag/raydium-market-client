// src/market/price_ws.AmmPool.ts


import { fetchRaydiumPoolData } from '../fetch/raydium_fetchPoolData';
import { Connection, PublicKey, Commitment } from '@solana/web3.js';
// import * as dotenv from 'dotenv';
import Logger from '../utils/logger'; // Ensure this logger utility aligns with your existing setup
import Big from 'big.js';
import {AccountLayout,
        AccountInfo,
        SubscriptionMessage,
        UnsubscriptionMessage,
        PoolInfo,
        TrackedPool,
 }from '../utils/interfaces';

 import {
  RPC_WSS,
  RPC_URL,
  DATABASE_URL,
  pgClient,
  redisPublisher,
  redisSubscriber,
  connection,
  SPLTOKEN_PROGRAM,
  SOL_MINT,
  USDC_MINT,
  USDT_MINT,
  RAYDIUM_SUBSCRIPTIONS_CHANNEL,
  RAYDIUM_UNSUBSCRIBE_CHANNEL,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_PROGRAM,
} from '../utils/utils'
import { cpmmPoolDataForWS } from '../fetch/raydium_cpmm';
import { clmmPoolDataForWS } from '../dev/raydium_clmm copy 3';
// Initialize Logger
const logger = new Logger('price_ws.AmmPool');

// Validate essential environment variables
if (!DATABASE_URL) {
  logger.error('Error: DATABASE_URL must be set in the .env file.');
  process.exit(1);
}

if (!RPC_URL || !RPC_WSS) {
  logger.error('Error: Both RPC_URL and RPC_WSS must be set in the .env file.');
  process.exit(1);
}

/**
 * Function to initialize Redis listeners for subscriptions and unsubscriptions
 */
function initializeRedis() {
  // Subscribe to the RAYDIUM_SUBSCRIPTIONS_CHANNEL channel
  redisSubscriber.subscribe(RAYDIUM_SUBSCRIPTIONS_CHANNEL, (err, count) => {
    if (err) {
      logger.error(`Failed to subscribe to RAYDIUM_SUBSCRIPTIONS_CHANNEL channel: ${err}`);
      process.exit(1);
    }
    logger.debug(`Subscribed to RAYDIUM_SUBSCRIPTIONS_CHANNEL channel. Currently subscribed to ${count} channel(s).`);
  });

  // Subscribe to the RAYDIUM_UNSUBSCRIBE_CHANNEL channel
  redisSubscriber.subscribe(RAYDIUM_UNSUBSCRIBE_CHANNEL, (err, count) => {
    if (err) {
      logger.error(`Failed to subscribe to RAYDIUM_UNSUBSCRIBE_CHANNEL channel: ${err}`);
      process.exit(1);
    }
    logger.debug(`Subscribed to RAYDIUM_UNSUBSCRIBE_CHANNEL channel. Currently subscribed to ${count} channel(s).`);
  });

  // Handle incoming messages
  redisSubscriber.on('message', (channel, message) => {
    if (channel === RAYDIUM_SUBSCRIPTIONS_CHANNEL) {
      handlePoolSubscriptionMessage(message);
    } else if (channel === RAYDIUM_UNSUBSCRIBE_CHANNEL) {
      handlePoolUnsubscriptionMessage(message);
    }
  });
}


// In-memory storage for tracked pools
const trackedPools: Map<string, TrackedPool> = new Map();

/**
 * Function to calculate price based on quoteMint
 * @param quoteMint PublicKey string of the quote mint
 * @param quoteVaultBalance Balance of the quote vault
 * @param baseVaultBalance Balance of the base vault
 * @returns Calculated price as a number
 */
function calculatePrice(
  quoteMint: string,
  baseMint: string,
  quoteVaultBalance: number,
  baseVaultBalance: number
): number {
  if (quoteMint === SOL_MINT || quoteMint === USDC_MINT || quoteMint === USDT_MINT) {
    if (baseVaultBalance === 0) {
      logger.warn('Base Vault Balance is zero, cannot calculate price.');
      return 0;
    }
    return quoteVaultBalance / baseVaultBalance;
  } else if (baseMint === SOL_MINT || baseMint === USDC_MINT || baseMint === USDT_MINT) {
    if (quoteVaultBalance === 0) {
      logger.warn('Quote Vault Balance is zero, cannot calculate price.');
      return 0;
    }
    return baseVaultBalance / quoteVaultBalance;
  } else {
    if (quoteVaultBalance === 0) {
      logger.warn('Quote Vault Balance is zero, cannot calculate price.');
      return 0;
    }
    return   baseVaultBalance / quoteVaultBalance  ;
  }
}

/**
 * Function to emit pool update
 * @param poolInfo Structured information about the pool
 */
function emitPoolUpdate(poolInfo: PoolInfo) {
  const payload = {
    timestamp: new Date().toISOString(),
    poolID: poolInfo.poolID,
    quoteMint: poolInfo.quoteMint,
    quoteVault: poolInfo.quoteVault,
    quoteVaultBalance: poolInfo.quoteVaultBalance,
    baseMint: poolInfo.baseMint,
    baseVault: poolInfo.baseVault,
    baseVaultBalance: poolInfo.baseVaultBalance,
    // price: poolInfo.price,

    price: parseFloat(poolInfo.price.toFixed(9)),
  };

  redisPublisher
    .publish('RaydiumPriceUpdates', JSON.stringify(payload))
    .then(() => {
      logger.debug(`Emitted pool update for Pool ID: ${poolInfo.poolID}`);
    })
    .catch((error) => {
      logger.error(`Failed to emit pool update for Pool ID: ${poolInfo.poolID}. Error: ${error}`);
    });
}

/**
 * Function to handle account updates
 * @param pool The tracked pool object
 * @param updatedAccountInfo The updated account information
 * @param connection The Solana connection object for fetching additional data
 */
async function handleAccountUpdate(
  pool: TrackedPool,
  updatedAccountInfo: AccountInfo<Buffer> | null,
  connection: Connection
): Promise<void> {
  if (updatedAccountInfo) {
    logger.debug(`--- Update for Pool: ${pool.poolId} ---`);

    const dataBuffer: Buffer = updatedAccountInfo.data;

    // console.log(pool)
    // console.log(updatedAccountInfo);
    if (updatedAccountInfo.owner.equals(SPLTOKEN_PROGRAM)) {
      try {
        // Decode the SPL Token account data
        const decoded = AccountLayout.decode(dataBuffer);

        const mintPublicKey = new PublicKey(decoded.mint);
        const ownerPublicKey = new PublicKey(decoded.owner);
        const amount: bigint = decoded.amount; // amount is a bigint

        // Determine which vault was updated based on the mint
        let humanReadableAmount: number;
        if (mintPublicKey.toBase58() === pool.quoteMint.toBase58()) {
          // Quote Vault
          humanReadableAmount = Number(
            Big(amount.toString()).div(Big(10).pow(pool.quoteDecimal)).toString()
          );
          pool.quoteVaultBalance = humanReadableAmount;
        } else if (mintPublicKey.toBase58() === pool.baseMint.toBase58()) {
          // Base Vault
          humanReadableAmount = Number(
            Big(amount.toString()).div(Big(10).pow(pool.baseDecimal)).toString()
          );
          pool.baseVaultBalance = humanReadableAmount;
        } else {
          logger.warn(`Received update for untracked mint: ${mintPublicKey.toBase58()}`);
          return; // Ignore updates for unrelated mints
        }

        logger.debug(`Mint: ${mintPublicKey.toBase58()}`);
        logger.debug(`Owner of Token Account: ${ownerPublicKey.toBase58()}`);
        logger.debug(`Amount: ${humanReadableAmount} Tokens`);

        // Recalculate price
        const price = calculatePrice(
          pool.quoteMint.toBase58(),
          pool.baseMint.toBase58(),
          pool.quoteVaultBalance,
          pool.baseVaultBalance
        );

        if (price !== 0) { 
          // Emit the update
        const updatedPoolInfo: PoolInfo = {
          poolID: pool.poolId,
          quoteMint: pool.quoteMint.toBase58(),
          quoteVault: pool.quoteVaultPubKey.toBase58(),
          quoteVaultBalance: pool.quoteVaultBalance,
          baseMint: pool.baseMint.toBase58(),
          baseVault: pool.baseVaultPubKey.toBase58(),
          baseVaultBalance: pool.baseVaultBalance,
          price,
        };
        console.log(`PRICE`, price)
        emitPoolUpdate(updatedPoolInfo);
        }
        
      } catch (parseError) {
        logger.error(
          `Failed to parse SPL Token account data for Pool ID: ${pool.poolId}. Error: ${
            (parseError as Error).message
          }`
        );
      }
    } else {
      // Handle non-SPL Token accounts if necessary
      logger.debug(
        `Non-SPL Token account data for Pool ID: ${pool.poolId}. Data (base64): ${dataBuffer.toString(
          'base64'
        )}`
      );
    }
  } else {
    logger.warn(`--- Pool ${pool.poolId} account has been closed or does not exist ---`);
  }
}

/**
 * Function to start watching a pool
 * @param poolId The public key of the liquidity pool account
 */
async function startWatchingPool(poolId: string): Promise<void> {
  if (trackedPools.has(poolId)) {
    logger.warn(`Pool ID ${poolId} is already being watched.`);
    return;
  }

  try {
    // Parse liquidity pool account to get pool information
    logger.debug(`Parsing liquidity pool account: ${poolId}...`);
    const poolData = await fetchRaydiumPoolData(poolId);

    let baseVaultPubKey;
    let quoteVaultPubKey;
    let quoteMintPubKey;
    let baseMintPubKey;
    let quoteDecimal;
    let baseDecimal;
    
    logger.debug('Successfully parsed liquidity pool data.');
    if (poolData.owner === RAYDIUM_CPMM_PROGRAM_ID){
      logger.info(`CPMM`);
      const data = await cpmmPoolDataForWS(poolData);
      logger.info(data);
      // Extract necessary public keys and decimals
      baseVaultPubKey = new PublicKey(data.baseVault);
      quoteVaultPubKey = new PublicKey(data.quoteVault);
      quoteMintPubKey = new PublicKey(data.quoteMint);
      baseMintPubKey = new PublicKey(data.baseMint);
      // Extract decimals
      quoteDecimal = parseInt(data.quoteDecimal, 10);
      baseDecimal = parseInt(data.baseDecimal, 10);

    } else if (poolData.owner === RAYDIUM_PROGRAM){
      logger.info(`LIQUIDITY`);
      // Extract necessary public keys and decimals
      baseVaultPubKey = new PublicKey(poolData.baseVault);
      quoteVaultPubKey = new PublicKey(poolData.quoteVault);
      quoteMintPubKey = new PublicKey(poolData.quoteMint);
      baseMintPubKey = new PublicKey(poolData.baseMint);
      // Extract decimals
      quoteDecimal = parseInt(poolData.quoteDecimal, 10);
      baseDecimal = parseInt(poolData.baseDecimal, 10);
    } else if (poolData.owner === RAYDIUM_CLMM_PROGRAM_ID){
      logger.info(`CLMM`);
      const data = await clmmPoolDataForWS(poolData);
      logger.info(data);
      // Extract necessary public keys and decimals
      baseVaultPubKey = new PublicKey(data.baseVault);
      quoteVaultPubKey = new PublicKey(data.quoteVault);
      quoteMintPubKey = new PublicKey(data.quoteMint);
      baseMintPubKey = new PublicKey(data.baseMint);
      // Extract decimals
      quoteDecimal = parseInt(data.quoteDecimal, 10);
      baseDecimal = parseInt(data.baseDecimal, 10);
    }


    if (isNaN(quoteDecimal) || isNaN(baseDecimal)) {
      throw new Error('Invalid decimal values in pool data.');
    }

    logger.debug(`Base Vault Public Key: ${baseVaultPubKey.toBase58()}`);
    logger.debug(`Quote Vault Public Key: ${quoteVaultPubKey.toBase58()}`);
    logger.debug(`Quote Mint Public Key: ${quoteMintPubKey.toBase58()}`);
    logger.debug(`Base Mint Public Key: ${baseMintPubKey.toBase58()}`);
    logger.debug(`Quote Decimal: ${quoteDecimal}`);
    logger.debug(`Base Decimal: ${baseDecimal}`);

    // Initialize balances to zero; they will be updated upon receiving account updates
    const initialQuoteVaultBalance = 0;
    const initialBaseVaultBalance = 0;

    // Subscribe to baseVault account updates via WSS
    logger.debug(`Subscribing to updates for Base Vault: ${baseVaultPubKey.toBase58()}...`);
    const baseVaultSubscriptionId = connection.onAccountChange(
      baseVaultPubKey,
      async (updatedAccountInfo, context) => {
        logger.debug(`[Base Vault Update] Pool ID: ${poolId}, Slot: ${context.slot}`);
        const pool = trackedPools.get(poolId);
        if (pool) {
          await handleAccountUpdate(pool, updatedAccountInfo, connection);
        }
      },
      { commitment: 'confirmed' } // Updated to use AccountSubscriptionConfig
    );

    // Subscribe to quoteVault account updates via WSS
    logger.debug(`Subscribing to updates for Quote Vault: ${quoteVaultPubKey.toBase58()}...`);
    const quoteVaultSubscriptionId = connection.onAccountChange(
      quoteVaultPubKey,
      async (updatedAccountInfo, context) => {
        logger.debug(`[Quote Vault Update] Pool ID: ${poolId}, Slot: ${context.slot}`);
        const pool = trackedPools.get(poolId);
        if (pool) {
          await handleAccountUpdate(pool, updatedAccountInfo, connection);
        }
      },
      { commitment: 'confirmed' } // Updated to use AccountSubscriptionConfig
    );

    // Store the tracked pool information with initial balances and decimals
    const trackedPool: TrackedPool = {
      poolId,
      connection: connection,
      baseVaultPubKey,
      quoteVaultPubKey,
      baseVaultSubscriptionId,
      quoteVaultSubscriptionId,
      quoteVaultBalance: initialQuoteVaultBalance,
      baseVaultBalance: initialBaseVaultBalance,
      quoteMint: quoteMintPubKey,
      baseMint: baseMintPubKey,
      quoteDecimal,
      baseDecimal,
    };

    trackedPools.set(poolId, trackedPool);

    logger.debug(`Started watching Pool ID: ${poolId}`);
  } catch (error) {
    logger.error(`Failed to watch Pool ID: ${poolId}. Error: ${(error as Error).message}`);
  }
}

/**
 * Function to stop watching a pool
 * @param poolId The public key of the liquidity pool account
 */
async function stopWatchingPool(poolId: string): Promise<void> {
  const pool = trackedPools.get(poolId);
  if (!pool) {
    logger.warn(`Pool ID ${poolId} is not being watched.`);
    return;
  }

  try {
    // Remove account change listeners
    await pool.connection.removeAccountChangeListener(pool.baseVaultSubscriptionId);
    await pool.connection.removeAccountChangeListener(pool.quoteVaultSubscriptionId);

    // Remove the pool from tracked pools
    trackedPools.delete(poolId);
    logger.debug(`Stopped watching Pool ID: ${poolId}`);
  } catch (error) {
    logger.error(`Failed to stop watching Pool ID: ${poolId}. Error: ${(error as Error).message}`);
  }
}

/**
 * Function to handle incoming pool subscription messages
 * @param message The Redis message payload
 */
function handlePoolSubscriptionMessage(message: string) {
  try {
    const parsed: SubscriptionMessage = JSON.parse(message);
    const { poolId } = parsed;

    if (!poolId) {
      logger.error(`Invalid pool subscription message: ${message}`);
      return;
    }

    logger.debug(`Received subscription for Pool ID: ${poolId}`);

    // Start watching the pool
    startWatchingPool(poolId);
  } catch (error) {
    logger.error(`Failed to parse pool subscription message: ${message}. Error: ${(error as Error).message}`);
  }
}

/**
 * Function to handle incoming pool unsubscription messages
 * @param message The Redis message payload
 */
function handlePoolUnsubscriptionMessage(message: string) {
  try {
    const parsed: UnsubscriptionMessage = JSON.parse(message);
    const { poolId } = parsed;

    if (!poolId) {
      logger.error(`Invalid pool unsubscription message: ${message}`);
      return;
    }

    logger.debug(`Received unsubscription for Pool ID: ${poolId}`);

    // Stop watching the pool
    stopWatchingPool(poolId);
  } catch (error) {
    logger.error(`Failed to parse pool unsubscription message: ${message}. Error: ${(error as Error).message}`);
  }
}

/**
 * Main Execution Function
 */
async function main() {
  // Initialize PostgreSQL connection (if needed)
  try {
    await pgClient.connect();
    logger.debug('Connected to PostgreSQL database successfully.');
  } catch (error) {
    logger.error(`Error connecting to PostgreSQL: ${(error as Error).message}`);
    process.exit(1);
  }

  // Initialize Redis listeners for pool subscriptions and unsubscriptions
  initializeRedis();

  logger.debug('RaydiumPriceUpdate service is up and running.');
}

/**
 * Handle graceful shutdown
 */
async function shutdown() {
  logger.debug('Shutting down RaydiumPriceUpdateservice...');

  // Unsubscribe from all tracked pools
  for (const poolId of trackedPools.keys()) {
    await stopWatchingPool(poolId);
  }

  // Disconnect Redis clients
  redisSubscriber.quit().then(() => {
    logger.debug('Redis subscriber disconnected.');
  }).catch(error => {
    logger.error(`Error disconnecting Redis subscriber: ${error}`);
  });

  redisPublisher.quit().then(() => {
    logger.debug('Redis publisher disconnected.');
  }).catch(error => {
    logger.error(`Error disconnecting Redis publisher: ${error}`);
  });

  // Close PostgreSQL connection
  pgClient.end().then(() => {
    logger.debug('PostgreSQL connection closed.');
    process.exit(0);
  }).catch(error => {
    logger.error(`Error closing PostgreSQL connection: ${error}`);
    process.exit(1);
  });
}

// Listen for termination signals to gracefully shut down
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Execute the main function if the script is run directly
if (require.main === module) {
  main().catch(error => {
    logger.error(`Unhandled error in RaydiumPriceUpdateservice.ts: ${(error as Error).message}`);
    shutdown();
  });
}
