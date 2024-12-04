// src/market/price_ws.AmmPool.ts

import { fetchRaydiumPoolData } from '../fetch/raydium_fetchPoolData';
import { Connection, PublicKey } from '@solana/web3.js';
import Logger from '../utils/logger'; // Ensure this logger utility aligns with your existing setup
import Big from 'big.js';
import {
  AccountLayout,
  AccountInfo,
  SubscriptionMessage,
  UnsubscriptionMessage,
  PoolInfo,
  TrackedPool,
  ClmmPoolInfoSerializable,
  PoolData,
} from '../utils/interfaces';

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
} from '../utils/utils';
import { cpmmPoolDataForWS } from '../fetch/raydium_cpmm';
import {
  clmmPoolDataForWS,
  deserializeClmmPoolInfo,
} from '../fetch/raydium_clmm';
import { sqrtPriceX64ToPrice } from '../utils/utils';

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

// In-memory storage for tracked pools
const trackedPools: Map<string, TrackedPool> = new Map();


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
    logger.debug(
      `Subscribed to RAYDIUM_SUBSCRIPTIONS_CHANNEL channel. Currently subscribed to ${count} channel(s).`
    );
  });

  // Subscribe to the RAYDIUM_UNSUBSCRIBE_CHANNEL channel
  redisSubscriber.subscribe(RAYDIUM_UNSUBSCRIBE_CHANNEL, (err, count) => {
    if (err) {
      logger.error(`Failed to subscribe to RAYDIUM_UNSUBSCRIBE_CHANNEL channel: ${err}`);
      process.exit(1);
    }
    logger.debug(
      `Subscribed to RAYDIUM_UNSUBSCRIBE_CHANNEL channel. Currently subscribed to ${count} channel(s).`
    );
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
    return baseVaultBalance / quoteVaultBalance;
  }
}

/**
 * Function to emit pool update
 * @param poolInfo Structured information about the pool
 */
function emitPoolUpdate(poolInfo: PoolInfo) {
  const payload: any = {
    timestamp: new Date().toISOString(),
    poolID: poolInfo.poolID,
    quoteMint: poolInfo.quoteMint,
    baseMint: poolInfo.baseMint,
    price: parseFloat(poolInfo.price.toFixed(9)),
  };

  if (poolInfo.quoteVault) {
    payload.quoteVault = poolInfo.quoteVault;
  }
  if (poolInfo.quoteVaultBalance !== undefined) {
    payload.quoteVaultBalance = poolInfo.quoteVaultBalance;
  }
  if (poolInfo.baseVault) {
    payload.baseVault = poolInfo.baseVault;
  }
  if (poolInfo.baseVaultBalance !== undefined) {
    payload.baseVaultBalance = poolInfo.baseVaultBalance;
  }

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
 * Function to handle account updates for CLMM pools
 * @param poolId The pool ID
 * @param updatedAccountInfo The updated account information
 * @param connection The Solana connection object
 */
async function handleClmmAccountUpdate(
  poolId: string,
  updatedAccountInfo: AccountInfo<Buffer> | null,
  connection: Connection
): Promise<void> {
  if (updatedAccountInfo) {
    logger.debug(`--- CLMM Pool Update for Pool: ${poolId} ---`);

    const dataBuffer: Buffer = updatedAccountInfo.data;

    try {
      // Deserialize the CLMM pool account data
      const deserializedData = await deserializeClmmPoolInfo(dataBuffer);
      const poolInfoObject = deserializedData;

      const sqrtPriceX64 = poolInfoObject.sqrtPriceX64; // Should be a string

      // Use the decimals from the pool info object
      const decimalsA = poolInfoObject.mintDecimalsA;
      const decimalsB = poolInfoObject.mintDecimalsB;

      const price = Number(sqrtPriceX64ToPrice(sqrtPriceX64, decimalsA, decimalsB));

      logger.debug(`Calculated Price: ${price}`);

      if (price !== 0) {
        // Emit the update
        const updatedPoolInfo: PoolInfo = {
          poolID: poolId,
          quoteVault:poolInfoObject.vaultA,
          quoteVaultBalance: 0,
          baseVault: poolInfoObject.vaultB,
          baseVaultBalance: 0,
          quoteMint: poolInfoObject.mintA,
          baseMint: poolInfoObject.mintB,
          price: parseFloat(price.toFixed(9)),
        };
        emitPoolUpdate(updatedPoolInfo);
      }
    } catch (parseError) {
      logger.error(
        `Failed to parse CLMM pool account data for Pool ID: ${poolId}. Error: ${
          (parseError as Error).message
        }`
      );
    }
  } else {
    logger.warn(`--- CLMM Pool ${poolId} account has been closed or does not exist ---`);
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
    
    let baseVaultPubKey: PublicKey | undefined;
    let quoteVaultPubKey: PublicKey | undefined;
    let quoteMintPubKey: PublicKey;
    let baseMintPubKey: PublicKey;
    let quoteDecimal: number;
    let baseDecimal: number;

    logger.debug('Successfully parsed liquidity pool data.');

    if (poolData.owner === RAYDIUM_CPMM_PROGRAM_ID) {
      logger.debug(`CPMM`);
      const data = await cpmmPoolDataForWS(poolData.pool);
      logger.debug(data);
      // Extract necessary public keys and decimals
      baseVaultPubKey = new PublicKey(data.baseVault);
      quoteVaultPubKey = new PublicKey(data.quoteVault);
      quoteMintPubKey = new PublicKey(data.quoteMint);
      baseMintPubKey = new PublicKey(data.baseMint);
      // Extract decimals
      quoteDecimal = data.quoteDecimal;
      baseDecimal = data.baseDecimal;
    } else if (poolData.owner === RAYDIUM_PROGRAM) {
      logger.debug(`LIQUIDITY`);
      // Extract necessary public keys and decimals
      baseVaultPubKey = new PublicKey(poolData.pool.baseVault);
      quoteVaultPubKey = new PublicKey(poolData.pool.quoteVault);
      quoteMintPubKey = new PublicKey(poolData.pool.quoteMint);
      baseMintPubKey = new PublicKey(poolData.pool.baseMint);
      // Extract decimals
      quoteDecimal = poolData.pool.quoteDecimal
      baseDecimal = poolData.pool.baseDecimal
    } else if (poolData.owner === RAYDIUM_CLMM_PROGRAM_ID) {
      logger.debug(`CLMM`);
      const data = await clmmPoolDataForWS(poolData);
      logger.debug(data);
      // Extract necessary public keys and decimals
      quoteMintPubKey = new PublicKey(data.quoteMint);
      baseMintPubKey = new PublicKey(data.baseMint);
      // Extract decimals
      quoteDecimal = parseInt(data.quoteDecimal, 10);
      baseDecimal = parseInt(data.baseDecimal, 10);
    } else {
      throw new Error(`Unsupported pool owner`);
    }

    if (isNaN(quoteDecimal) || isNaN(baseDecimal)) {
      throw new Error('Invalid decimal values in pool data.');
    }

    logger.debug(`Quote Mint Public Key: ${quoteMintPubKey.toBase58()}`);
    logger.debug(`Base Mint Public Key: ${baseMintPubKey.toBase58()}`);
    logger.debug(`Quote Decimal: ${quoteDecimal}`);
    logger.debug(`Base Decimal: ${baseDecimal}`);

    if (poolData.owner === RAYDIUM_CLMM_PROGRAM_ID) {
      // For CLMM pools, we'll store minimal data in TrackedPool and handle updates differently
      const poolPubKey = new PublicKey(poolId)

      // Subscribe to pool account updates via WSS
      logger.debug(`Subscribing to updates for CLMM Pool Account: ${poolId}...`);
      const poolSubscriptionId = connection.onAccountChange(
        poolPubKey,
        async (updatedAccountInfo, context) => {
          logger.debug(`[CLMM Pool Update] Pool ID: ${poolId}, Slot: ${context.slot}`);
          await handleClmmAccountUpdate(poolId, updatedAccountInfo, connection);
        },
        { commitment: 'confirmed' }
      );

      // Store the tracked pool information with minimal fields
      const trackedPool: TrackedPool = {
        poolId,
        connection: connection,
        baseVaultPubKey: new PublicKey(poolData.pool.vaultA), // Placeholder
        quoteVaultPubKey: new PublicKey(poolData.pool.vaultB), // Placeholder
        baseVaultSubscriptionId: poolSubscriptionId, // Using baseVaultSubscriptionId for CLMM pool subscription ID
        quoteVaultSubscriptionId: 0, // Not used for CLMM
        quoteVaultBalance: 0,
        baseVaultBalance: 0,
        quoteMint: quoteMintPubKey,
        baseMint: baseMintPubKey,
        quoteDecimal,
        baseDecimal,
      };

      trackedPools.set(poolId, trackedPool);
    } else {
      // Initialize balances to zero; they will be updated upon receiving account updates
      const initialQuoteVaultBalance = 0;
      const initialBaseVaultBalance = 0;

      // Subscribe to baseVault account updates via WSS
      logger.debug(`Subscribing to updates for Base Vault: ${baseVaultPubKey!.toBase58()}...`);
      const baseVaultSubscriptionId = connection.onAccountChange(
        baseVaultPubKey!,
        async (updatedAccountInfo, context) => {
          logger.debug(`[Base Vault Update] Pool ID: ${poolId}, Slot: ${context.slot}`);
          const pool = trackedPools.get(poolId);
          if (pool) {
            await handleAccountUpdate(pool, updatedAccountInfo, connection);
          }
        },
        { commitment: 'confirmed' }
      );

      // Subscribe to quoteVault account updates via WSS
      logger.debug(`Subscribing to updates for Quote Vault: ${quoteVaultPubKey!.toBase58()}...`);
      const quoteVaultSubscriptionId = connection.onAccountChange(
        quoteVaultPubKey!,
        async (updatedAccountInfo, context) => {
          logger.debug(`[Quote Vault Update] Pool ID: ${poolId}, Slot: ${context.slot}`);
          const pool = trackedPools.get(poolId);
          if (pool) {
            await handleAccountUpdate(pool, updatedAccountInfo, connection);
          }
        },
        { commitment: 'confirmed' }
      );

      // Store the tracked pool information with initial balances and decimals
      const trackedPool: TrackedPool = {
        poolId,
        connection: connection,
        baseVaultPubKey: baseVaultPubKey!,
        quoteVaultPubKey: quoteVaultPubKey!,
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
    }
    logger.debug(`Started watching Pool ID: ${poolId}`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Failed to watch Pool ID: ${poolId}. Error: ${err.message}`, err.stack);
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
    if (pool.baseVaultSubscriptionId !== 0) {
      await pool.connection.removeAccountChangeListener(pool.baseVaultSubscriptionId);
    }
    if (pool.quoteVaultSubscriptionId !== 0) {
      await pool.connection.removeAccountChangeListener(pool.quoteVaultSubscriptionId);
    }

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
  redisSubscriber
    .quit()
    .then(() => {
      logger.debug('Redis subscriber disconnected.');
    })
    .catch((error) => {
      logger.error(`Error disconnecting Redis subscriber: ${error}`);
    });

  redisPublisher
    .quit()
    .then(() => {
      logger.debug('Redis publisher disconnected.');
    })
    .catch((error) => {
      logger.error(`Error disconnecting Redis publisher: ${error}`);
    });

  // Close PostgreSQL connection
  pgClient
    .end()
    .then(() => {
      logger.debug('PostgreSQL connection closed.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`Error closing PostgreSQL connection: ${error}`);
      process.exit(1);
    });
}

// Listen for termination signals to gracefully shut down
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Execute the main function if the script is run directly
if (require.main === module) {
  main().catch((error) => {
    logger.error(`Unhandled error in RaydiumPriceUpdateservice.ts: ${(error as Error).message}`);
    shutdown();
  });
}
