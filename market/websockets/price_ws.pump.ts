// src/market/price_ws.pump.ts


import {
  Connection,
  PublicKey,
  Commitment,
  AccountInfo,
  AccountSubscriptionConfig,
} from '@solana/web3.js';
import {
  BondingCurveSubscribe,
  BondingCurveUnsubscribe,
  TracedAccount,
  TracedAccountExtended,
  VaultData,
} from '../utils/interfaces';
import { Client } from 'pg';
import Logger from '../utils/logger'; // Adjust the path as necessary
import Redis from 'ioredis';
import {TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, AccountLayout} from "@solana/spl-token";
import Big from 'big.js';
import {
  DATABASE_URL,
  pgClient,
  redisPublisher,
  redisSubscriber,
  connection,
  pump_SUBSCRIPTIONS_CHANNEL,
  pump_UNSUBSCRIPTIONS_CHANNEL,
} from '../utils/utils'

// Initialize Logger
const logger = new Logger('price_ws.pump');

// Validate environment variables
if (!DATABASE_URL) {
  logger.error('Error: DATABASE_URL must be set in the .env file.');
  process.exit(1);
}

// Function to initialize Redis listeners for both subscriptions and unsubscriptions
function initializeRedis() {
  // Subscribe to the pump_SUBSCRIPTIONS_CHANNEL channel
  redisSubscriber.subscribe(pump_SUBSCRIPTIONS_CHANNEL, (err, count) => {
    if (err) {
      logger.error(`Failed to subscribe to pump_SUBSCRIPTIONS_CHANNEL channel: ${err}`);
      process.exit(1);
    }
    logger.debug(
      `Subscribed to pump_SUBSCRIPTIONS_CHANNEL channel. Currently subscribed to ${count} channel(s).`
    );
  });

  // Subscribe to the pump_UNSUBSCRIPTIONS_CHANNEL channel
  redisSubscriber.subscribe(pump_UNSUBSCRIPTIONS_CHANNEL, (err, count) => {
    if (err) {
      logger.error(`Failed to subscribe to pump_UNSUBSCRIPTIONS_CHANNEL channel: ${err}`);
      process.exit(1);
    }
    logger.debug(
      `Subscribed to pump_UNSUBSCRIPTIONS_CHANNEL channel. Currently subscribed to ${count} channel(s).`
    );
  });

  // Handle incoming messages
  redisSubscriber.on('message', (channel, message) => {
    if (channel === pump_SUBSCRIPTIONS_CHANNEL) {
      handleBondingCurveSubscribe(message);
    } else if (channel === pump_UNSUBSCRIPTIONS_CHANNEL) {
      handleBondingCurveUnsubscribe(message);
    }
  });
}

const accountBalances: Map<string, { solBalance: number | null, tokenBalance: number | null }> = new Map();

const accountsToTrace: Map<string, TracedAccountExtended> = new Map();

// Additional Map to track tokenMint to subscription IDs
const tokenMintToSubscriptionIds: Map<string, Set<number>> = new Map();

// Function to handle incoming subscription messages
function handleBondingCurveSubscribe(message: string) {
  try {
    const parsed: BondingCurveSubscribe = JSON.parse(message);
    const { tokenMint, trade_id } = parsed;

    if (!tokenMint || !trade_id) {
      logger.error(`Invalid subscription message: ${message}`);
      return;
    }

    // Check if the account is already being traced
    if (accountsToTrace.has(trade_id)) {
      logger.warn(`Trade ID ${trade_id} is already being traced.`);
      return;
    }

    logger.debug(
      `Received subscription for Trade ID: ${trade_id}, Token Mint: ${tokenMint}`
    );

    // Fetch bonding_curve from PostgreSQL
    fetchVaultAddresses(tokenMint)
      .then((vaultData) => {
        if (vaultData) {
          const tracedAccount: TracedAccountExtended = {
            trade_id,
            tokenMint,
            bondingCurve: vaultData.bonding_curve,
            associatedBondingCurve: vaultData.associated_bonding_curve,
            subscriptionIds: [],
          };
          accountsToTrace.set(trade_id, tracedAccount);
          logger.debug(`Added Trade ID ${trade_id} to tracing list.`);

          // Subscribe to bondingCurve account changes
          subscribeToAccountChanges(tracedAccount);
        } else {
          logger.error(
            `No vault data found for Token Mint: ${tokenMint}. Trade ID: ${trade_id} not added.`
          );
        }
      })
      .catch((error) => {
        logger.error(
          `Error fetching vault data for Token Mint: ${tokenMint}: ${error}`
        );
      });
  } catch (error) {
    logger.error(
      `Failed to parse subscription message: ${message}. Error: ${error}`
    );
  }
}

// Function to handle incoming unsubscription messages
function handleBondingCurveUnsubscribe(message: string) {
  try {
    const parsed: BondingCurveUnsubscribe = JSON.parse(message);
    const { tokenMint } = parsed;

    if (!tokenMint) {
      logger.error(`Invalid unsubscription message: ${message}`);
      return;
    }

    logger.debug(`Received unsubscription request for Token Mint: ${tokenMint}`);

    // Retrieve all subscription IDs associated with the tokenMint
    const subscriptionIds = tokenMintToSubscriptionIds.get(tokenMint);

    if (!subscriptionIds || subscriptionIds.size === 0) {
      logger.warn(`No active subscriptions found for Token Mint: ${tokenMint}`);
      return;
    }

    // Unsubscribe from all associated subscriptions
    subscriptionIds.forEach((subId) => {
      connection
        .removeAccountChangeListener(subId)
        .then(() => {
          logger.debug(
            `Removed subscription ID ${subId} for Token Mint ${tokenMint}.`
          );
        })
        .catch((error) => {
          logger.error(
            `Failed to remove subscription ID ${subId} for Token Mint ${tokenMint}: ${error}`
          );
        });
    });

    // Remove the entries from both maps
    subscriptionIds.forEach((subId) => {
      // Find the trade_id associated with this subscription ID
      for (const [trade_id, tracedAccount] of accountsToTrace.entries()) {
        if (tracedAccount.subscriptionIds.includes(subId)) {
          tracedAccount.subscriptionIds = tracedAccount.subscriptionIds.filter(
            (id) => id !== subId
          );
          if (tracedAccount.subscriptionIds.length === 0) {
            accountsToTrace.delete(trade_id);
            logger.debug(
              `Removed Trade ID ${trade_id} from tracing list as all subscriptions are removed.`
            );
          }
          break;
        }
      }
    });

    // Remove the tokenMint entry from tokenMintToSubscriptionIds
    tokenMintToSubscriptionIds.delete(tokenMint);
    logger.debug(`Unsubscribed all listeners for Token Mint: ${tokenMint}.`);
  } catch (error) {
    logger.error(
      `Failed to parse unsubscription message: ${message}. Error: ${error}`
    );
  }
}

// Function to fetch bonding Curve addresses
async function fetchVaultAddresses(
  tokenMint: string
): Promise<{ bonding_curve: string, associated_bonding_curve : string } | null> {
  try {
    const pumpProgramAddress = new PublicKey(process.env.PUMP_PROGRAM);
    const mint = new PublicKey(tokenMint);

    const [bc] = PublicKey.findProgramAddressSync([Buffer.from('bonding-curve'), mint.toBytes()], pumpProgramAddress);
    const [abc] = PublicKey.findProgramAddressSync([bc.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID);

    // logger.debug(bc)
    // logger.debug(abc)
    const bonding_curve = (bc).toBase58().toString();
    const associated_bonding_curve = (abc).toBase58().toString();
         
    return { bonding_curve, associated_bonding_curve };
  } catch (error) {
    logger.error(`Error fetching bonding curves :  ${error}`);
    return null;
  }
}

// Function to subscribe to account changes for a traced account
function subscribeToAccountChanges(
  tracedAccount: TracedAccountExtended) {
  const { trade_id, bondingCurve, tokenMint, associatedBondingCurve } = tracedAccount;

  const bondingCurvePubKey = new PublicKey(bondingCurve);
  const assocBondingPubkey = new PublicKey(associatedBondingCurve);

  // Define subscription config
  const subscriptionConfig: AccountSubscriptionConfig = {
    commitment: 'confirmed',
  };

  logger.debug(`Subscribing to Bonding`)
  // Subscribe to bondingCurve account changes
  const subscriptionId = connection.onAccountChange(
    bondingCurvePubKey,
    (updatedAccountInfo, context) => {
      logger.debug(`Bonding Update for Trade ID ${trade_id}:`);
      // logger.debug(updatedAccountInfo);
      handleAccountUpdate(trade_id, updatedAccountInfo, 'bonding');
    },
    subscriptionConfig
  );

  // Store the subscription ID in tracedAccount
  tracedAccount.subscriptionIds.push(subscriptionId);

  logger.debug(`Subscribing to Associated`)

  // Subscribe to bondingCurve account changes
  const subscriptionId2 = connection.onAccountChange(
    assocBondingPubkey,
    (updatedAccountInfo, context) => {
      logger.debug(`Associated Bonding Update for Trade ID ${trade_id}:`);
      // logger.debug(updatedAccountInfo);
      handleAccountUpdate(trade_id, updatedAccountInfo, 'associated');
    },
    subscriptionConfig
  );

  // Store the subscription ID in tracedAccount
  tracedAccount.subscriptionIds.push(subscriptionId2);

  logger.debug(
    `Subscribed to bondingCurve account changes for Trade ID ${trade_id} with subscription ID ${subscriptionId}.`
  );

  // Also store the subscription ID in tokenMintToSubscriptionIds map
  if (!tokenMintToSubscriptionIds.has(tokenMint)) {
    tokenMintToSubscriptionIds.set(tokenMint, new Set());
  }
  tokenMintToSubscriptionIds.get(tokenMint)?.add(subscriptionId);
  tokenMintToSubscriptionIds.get(tokenMint)?.add(subscriptionId2);

}

// Function to handle account updates received via WebSocket
async function handleAccountUpdate(
  trade_id: string,
  updatedAccountInfo: AccountInfo<Buffer>,
  channel: 'bonding' | 'associated'
) {
  try {
    const tracedAccount = accountsToTrace.get(trade_id);
    if (!tracedAccount) {
      logger.warn(`Received update for Trade ID ${trade_id} which is not being traced.`);
      return;
    }

    // Get current balances or initialize if not exist
    let balances = accountBalances.get(trade_id) || { solBalance: null, tokenBalance: null };

    if (channel === 'bonding') {
      const lamportsBalance = updatedAccountInfo.lamports;
      balances.solBalance = lamportsBalance / Math.pow(10, 9); // Convert lamports to SOL
      logger.debug(`Updated SOL balance for Trade ID ${trade_id}: ${balances.solBalance} SOL`);
    } else if (channel === 'associated') {
      const accountInfo = AccountLayout.decode(updatedAccountInfo.data);
      const amount: bigint = accountInfo.amount;
      balances.tokenBalance = Number(
        Big(amount.toString()).div(Big(10).pow(6)).toString()
      );
      logger.debug(`Updated Token balance for Trade ID ${trade_id}: ${balances.tokenBalance} tokens`);
    }

    // Update the balances in the map
    accountBalances.set(trade_id, balances);

    // Only proceed if we have both balances
    if (balances.solBalance !== null && balances.tokenBalance !== null) {
      await processBalancesAndEmitPrice(trade_id, tracedAccount.tokenMint, balances.solBalance, balances.tokenBalance);
    } else {
      logger.debug(`Waiting for both balances to be available for Trade ID ${trade_id}`);
    }

  } catch (error) {
    logger.error(`Error handling account update for Trade ID ${trade_id}: ${error}`);
  }
}

async function processBalancesAndEmitPrice(trade_id: string, tokenMint: string, solBalance: number, tokenBalance: number) {
  // Check if solBalance falls below 1
  if (solBalance < 1) {
    await handleLiquidityWithdrawn(trade_id, tokenMint);
    return;
  }

  // Calculate token price
  const tokenPrice = calculatePrice(solBalance, tokenBalance);

  if (tokenPrice !== 0 ) {
  // Prepare the result
  const vaultDataResult: VaultData = {
    trade_id,
    mint: tokenMint,
    tokenPrice,
    solVaultBalance: solBalance,
    tokenVaultBalance: tokenBalance,
  };

  // Emit the results through Redis
  await emitPriceUpdate(vaultDataResult);

  logger.debug(`Updated price for Trade ID ${trade_id}: ${tokenPrice.toFixed(9)} SOL/token`);
  }
}

// Function to handle liquidity withdrawn scenario
async function handleLiquidityWithdrawn(trade_id: string, tokenMint: string) {
  // Emit message "liquidity withdrawn" including trade_id
  const payload = {
    timestamp: new Date().toISOString(),
    trade_id,
    message: 'liquidity withdrawn',
  };
  
  try {
    await redisPublisher.publish('liquidityWithdrawn', JSON.stringify(payload));
    logger.debug(`Emitted liquidity withdrawn message for Trade ID: ${trade_id}`);
  } catch (error) {
    logger.error(
      `Failed to emit liquidity withdrawn message for Trade ID: ${trade_id}. Error: ${error}`
    );
  }

  // Unsubscribe from account changes as liquidity has been withdrawn
  await unsubscribeFromAccountChanges(trade_id, tokenMint);
}

// Function to unsubscribe from account changes
async function unsubscribeFromAccountChanges(trade_id: string, tokenMint: string) {
  const tracedAccount = accountsToTrace.get(trade_id);
  if (tracedAccount) {
    const unsubscribePromises = tracedAccount.subscriptionIds.map((subId) =>
      connection.removeAccountChangeListener(subId)
        .then(() => {
          logger.debug(
            `Removed subscription ID ${subId} for Trade ID ${trade_id} after liquidity withdrawal.`
          );
          // Remove from tokenMintToSubscriptionIds map
          const tokenSubscriptions = tokenMintToSubscriptionIds.get(tokenMint);
          tokenSubscriptions?.delete(subId);
          if (tokenSubscriptions && tokenSubscriptions.size === 0) {
            tokenMintToSubscriptionIds.delete(tokenMint);
          }
        })
        .catch((error) => {
          logger.error(
            `Failed to remove subscription ID ${subId} for Trade ID ${trade_id}: ${error}`
          );
        })
    );
    await Promise.all(unsubscribePromises);
    accountsToTrace.delete(trade_id);
    logger.debug(
      `Removed Trade ID ${trade_id} from tracing list after liquidity withdrawal.`
    );
  }
}

// Function to calculate the price per token
function calculatePrice(solBalance: number, tokenBalance: number): number {
  if (tokenBalance === 0) {
    logger.warn('Warning: Token balance is zero. Cannot calculate price.');
    return 0;
  }
  return solBalance / tokenBalance;
}

// Function to emit price updates through Redis
async function emitPriceUpdate(vaultData: VaultData) {
  const payload = {
    timestamp: new Date().toISOString(),
    trade_id: vaultData.trade_id,
    mint: vaultData.mint,
    price: parseFloat(vaultData.tokenPrice.toFixed(9)),
    solBalance: vaultData.solVaultBalance,
    tokenBalance: vaultData.tokenVaultBalance,
  };

  try {
    await redisPublisher.publish('PumpPriceUpdates', JSON.stringify(payload));
    logger.debug(
      `Emitted PumpPriceUpdates for Trade ID ${vaultData.trade_id}: ${vaultData.tokenPrice.toFixed(
        9
      )} SOL/token`
    );
  } catch (error) {
    logger.error(
      `Failed to emit PumpPriceUpdates for Trade ID ${vaultData.trade_id}: ${error}`
    );
  }
}



// Main Execution Function
async function main() {
  // Initialize PostgreSQL connection
  try {
    await pgClient.connect();
    logger.debug('Connected to PostgreSQL database successfully.');
  } catch (error) {
    logger.error(`Error connecting to PostgreSQL: ${error}`);
    process.exit(1);
  }

  // Initialize Redis listeners for subscriptions and unsubscriptions
  initializeRedis();

  logger.debug('BatchFetchVaultPrices service is up and running.');
}

// Handle graceful shutdown
async function shutdown() {
  logger.debug('Shutting down BatchFetchVaultPrices service...');

  // Unsubscribe from all active account change listeners
  try {
    const unsubscribePromises: Promise<void>[] = [];
    for (const [trade_id, tracedAccount] of accountsToTrace.entries()) {
      tracedAccount.subscriptionIds.forEach((subId) => {
        const promise = connection
          .removeAccountChangeListener(subId)
          .then(() => {
            logger.debug(
              `Removed subscription ID ${subId} for Trade ID ${trade_id} during shutdown.`
            );
            // Remove from tokenMintToSubscriptionIds map
            const tokenSubscriptions = tokenMintToSubscriptionIds.get(
              tracedAccount.tokenMint
            );
            tokenSubscriptions?.delete(subId);
            if (tokenSubscriptions && tokenSubscriptions.size === 0) {
              tokenMintToSubscriptionIds.delete(tracedAccount.tokenMint);
            }
          })
          .catch((error) => {
            logger.error(
              `Failed to remove subscription ID ${subId} for Trade ID ${trade_id} during shutdown: ${error}`
            );
          });
        unsubscribePromises.push(promise);
      });
    }
    await Promise.all(unsubscribePromises);
    logger.debug('All account change listeners have been removed.');
  } catch (error) {
    logger.error(`Error during unsubscription in shutdown: ${error}`);
  }

  // Disconnect Redis clients
  try {
    await redisSubscriber.quit();
    logger.debug('Redis subscriber disconnected.');
  } catch (error) {
    logger.error(`Error disconnecting Redis subscriber: ${error}`);
  }

  try {
    await redisPublisher.quit();
    logger.debug('Redis publisher disconnected.');
  } catch (error) {
    logger.error(`Error disconnecting Redis publisher: ${error}`);
  }

  // Close PostgreSQL connection
  try {
    await pgClient.end();
    logger.debug('PostgreSQL connection closed.');
  } catch (error) {
    logger.error(`Error closing PostgreSQL connection: ${error}`);
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Execute the main function if the script is run directly
if (require.main === module) {
  main().catch((error) => {
    logger.error(`Unhandled error in batchFetchVaultPrices.ts: ${error}`);
    shutdown();
  });
}
