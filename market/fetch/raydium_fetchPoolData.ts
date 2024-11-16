// src/market/data_raydiumPool.ts

import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import BN from 'bn.js';
import * as BufferLayout from 'buffer-layout';
import { Buffer } from 'buffer';
import * as dotenv from 'dotenv';
import {
  RAYDIUM_PROGRAM,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_STABLE_AMM,
  connection
} from '../utils/utils';
import { fetchCpmmPoolData } from './raydium_cpmm';
import { fetchClmmPoolData } from '../dev/raydium_clmm copy 3';
import { ClmmPoolInfoSerializable, market_RaydiumPoolData, ReadableCpmmPoolInfo, PoolData } from '../utils/interfaces';
import { AccountInfo } from '@solana/web3.js';
dotenv.config();
const RPC_URL = process.env.RPC_URL || clusterApiUrl('mainnet-beta');

// -------------------------
// Define Liquidity State Layouts using buffer-layout
// -------------------------

// Helper function to define a public key layout
const publicKeyLayout = (property: string) =>
  BufferLayout.blob(32, property);

// Helper function to define a u64 layout and convert it to BN
const u64Layout = (property: string) =>
  BufferLayout.blob(8, property);

// Helper function to define a u128 layout and convert it to BN
const u128Layout = (property: string) =>
  BufferLayout.blob(16, property);

// V4 Layout (752 bytes)
const liquidityStateV4Layout = BufferLayout.struct([
  u64Layout('status'),
  u64Layout('nonce'),
  u64Layout('maxOrder'),
  u64Layout('depth'),
  u64Layout('baseDecimal'),
  u64Layout('quoteDecimal'),
  u64Layout('state'),
  u64Layout('resetFlag'),
  u64Layout('minSize'),
  u64Layout('volMaxCutRatio'),
  u64Layout('amountWaveRatio'),
  u64Layout('baseLotSize'),
  u64Layout('quoteLotSize'),
  u64Layout('minPriceMultiplier'),
  u64Layout('maxPriceMultiplier'),
  u64Layout('systemDecimalValue'),
  u64Layout('minSeparateNumerator'),
  u64Layout('minSeparateDenominator'),
  u64Layout('tradeFeeNumerator'),
  u64Layout('tradeFeeDenominator'),
  u64Layout('pnlNumerator'),
  u64Layout('pnlDenominator'),
  u64Layout('swapFeeNumerator'),
  u64Layout('swapFeeDenominator'),
  u64Layout('baseNeedTakePnl'),
  u64Layout('quoteNeedTakePnl'),
  u64Layout('quoteTotalPnl'),
  u64Layout('baseTotalPnl'),
  u64Layout('poolOpenTime'),
  u64Layout('punishPcAmount'),
  u64Layout('punishCoinAmount'),
  u64Layout('orderbookToInitTime'),
  u128Layout('swapBaseInAmount'),
  u128Layout('swapQuoteOutAmount'),
  u64Layout('swapBase2QuoteFee'),
  u128Layout('swapQuoteInAmount'),
  u128Layout('swapBaseOutAmount'),
  u64Layout('swapQuote2BaseFee'),
  publicKeyLayout('baseVault'),
  publicKeyLayout('quoteVault'),
  publicKeyLayout('baseMint'),
  publicKeyLayout('quoteMint'),
  publicKeyLayout('lpMint'),
  publicKeyLayout('openOrders'),
  publicKeyLayout('marketId'),
  publicKeyLayout('marketProgramId'),
  publicKeyLayout('targetOrders'),
  publicKeyLayout('withdrawQueue'),
  publicKeyLayout('lpVault'),
  u64Layout('lpReserve'),
]);

// Type Definitions
type LiquidityStateV4 = {
  status: BN;
  nonce: BN;
  maxOrder: BN;
  depth: BN;
  baseDecimal: BN;
  quoteDecimal: BN;
  state: BN;
  resetFlag: BN;
  minSize: BN;
  volMaxCutRatio: BN;
  amountWaveRatio: BN;
  baseLotSize: BN;
  quoteLotSize: BN;
  minPriceMultiplier: BN;
  maxPriceMultiplier: BN;
  systemDecimalValue: BN;
  minSeparateNumerator: BN;
  minSeparateDenominator: BN;
  tradeFeeNumerator: BN;
  tradeFeeDenominator: BN;
  pnlNumerator: BN;
  pnlDenominator: BN;
  swapFeeNumerator: BN;
  swapFeeDenominator: BN;
  baseNeedTakePnl: BN;
  quoteNeedTakePnl: BN;
  quoteTotalPnl: BN;
  baseTotalPnl: BN;
  poolOpenTime: BN;
  punishPcAmount: BN;
  punishCoinAmount: BN;
  orderbookToInitTime: BN;
  swapBaseInAmount: BN;
  swapQuoteOutAmount: BN;
  swapBase2QuoteFee: BN;
  swapQuoteInAmount: BN;
  swapBaseOutAmount: BN;
  swapQuote2BaseFee: BN;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  lpMint: PublicKey;
  openOrders: PublicKey;
  marketId: PublicKey;
  marketProgramId: PublicKey;
  targetOrders: PublicKey;
  withdrawQueue: PublicKey;
  lpVault: PublicKey;
  lpReserve: BN;
};

// -------------------------
// Helper Functions for Deserialization
// -------------------------

/**
 * Convert a buffer blob to BN.
 * @param buffer Buffer containing the number in little-endian format.
 * @returns BN instance.
 */
function blobToBN(buffer: Buffer): BN {
  return new BN(buffer, 'le');
}

/**
 * Convert a buffer blob to PublicKey.
 * @param buffer Buffer containing the public key.
 * @returns PublicKey instance.
 */
function blobToPublicKey(buffer: Buffer): PublicKey {
  return new PublicKey(buffer);
}

/**
 * Deserialize liquidity state V4.
 * @param buffer Buffer containing the account data.
 * @returns Parsed LiquidityStateV4 object.
 */
function deserializeLiquidityStateV4(buffer: Buffer): LiquidityStateV4 {
  const decoded = liquidityStateV4Layout.decode(buffer);

  // Convert blobs to BN and PublicKey instances
  const liquidityState: LiquidityStateV4 = {
    status: blobToBN(decoded.status),
    nonce: blobToBN(decoded.nonce),
    maxOrder: blobToBN(decoded.maxOrder),
    depth: blobToBN(decoded.depth),
    baseDecimal: blobToBN(decoded.baseDecimal),
    quoteDecimal: blobToBN(decoded.quoteDecimal),
    state: blobToBN(decoded.state),
    resetFlag: blobToBN(decoded.resetFlag),
    minSize: blobToBN(decoded.minSize),
    volMaxCutRatio: blobToBN(decoded.volMaxCutRatio),
    amountWaveRatio: blobToBN(decoded.amountWaveRatio),
    baseLotSize: blobToBN(decoded.baseLotSize),
    quoteLotSize: blobToBN(decoded.quoteLotSize),
    minPriceMultiplier: blobToBN(decoded.minPriceMultiplier),
    maxPriceMultiplier: blobToBN(decoded.maxPriceMultiplier),
    systemDecimalValue: blobToBN(decoded.systemDecimalValue),
    minSeparateNumerator: blobToBN(decoded.minSeparateNumerator),
    minSeparateDenominator: blobToBN(decoded.minSeparateDenominator),
    tradeFeeNumerator: blobToBN(decoded.tradeFeeNumerator),
    tradeFeeDenominator: blobToBN(decoded.tradeFeeDenominator),
    pnlNumerator: blobToBN(decoded.pnlNumerator),
    pnlDenominator: blobToBN(decoded.pnlDenominator),
    swapFeeNumerator: blobToBN(decoded.swapFeeNumerator),
    swapFeeDenominator: blobToBN(decoded.swapFeeDenominator),
    baseNeedTakePnl: blobToBN(decoded.baseNeedTakePnl),
    quoteNeedTakePnl: blobToBN(decoded.quoteNeedTakePnl),
    quoteTotalPnl: blobToBN(decoded.quoteTotalPnl),
    baseTotalPnl: blobToBN(decoded.baseTotalPnl),
    poolOpenTime: blobToBN(decoded.poolOpenTime),
    punishPcAmount: blobToBN(decoded.punishPcAmount),
    punishCoinAmount: blobToBN(decoded.punishCoinAmount),
    orderbookToInitTime: blobToBN(decoded.orderbookToInitTime),
    swapBaseInAmount: blobToBN(decoded.swapBaseInAmount),
    swapQuoteOutAmount: blobToBN(decoded.swapQuoteOutAmount),
    swapBase2QuoteFee: blobToBN(decoded.swapBase2QuoteFee),
    swapQuoteInAmount: blobToBN(decoded.swapQuoteInAmount),
    swapBaseOutAmount: blobToBN(decoded.swapBaseOutAmount),
    swapQuote2BaseFee: blobToBN(decoded.swapQuote2BaseFee),
    baseVault: blobToPublicKey(decoded.baseVault),
    quoteVault: blobToPublicKey(decoded.quoteVault),
    baseMint: blobToPublicKey(decoded.baseMint),
    quoteMint: blobToPublicKey(decoded.quoteMint),
    lpMint: blobToPublicKey(decoded.lpMint),
    openOrders: blobToPublicKey(decoded.openOrders),
    marketId: blobToPublicKey(decoded.marketId),
    marketProgramId: blobToPublicKey(decoded.marketProgramId),
    targetOrders: blobToPublicKey(decoded.targetOrders),
    withdrawQueue: blobToPublicKey(decoded.withdrawQueue),
    lpVault: blobToPublicKey(decoded.lpVault),
    lpReserve: blobToBN(decoded.lpReserve),
  };

  return liquidityState;
}


// -------------------------
// Main Functionality
// -------------------------

/**
 * Convert the LiquidityStateV4 object to a plain JavaScript object with accessible properties.
 * @param state Parsed LiquidityStateV4 object.
 * @returns market_RaydiumPoolData object with string representations and base58 for PublicKeys.
 */
function convertLiquidityStateToObject(state: LiquidityStateV4): market_RaydiumPoolData {
  return {
    status: state.status.toString(),
    nonce: state.nonce.toString(),
    maxOrder: state.maxOrder.toString(),
    depth: state.depth.toString(),
    baseDecimal: state.baseDecimal.toNumber(),
    quoteDecimal: state.quoteDecimal.toNumber(),
    state: state.state.toString(),
    minSize: state.minSize.toString(),
    volMaxCutRatio: state.volMaxCutRatio.toString(),
    amountWaveRatio: state.amountWaveRatio.toString(),
    baseLotSize: state.baseLotSize.toString(),
    quoteLotSize: state.quoteLotSize.toString(),
    minPriceMultiplier: state.minPriceMultiplier.toString(),
    maxPriceMultiplier: state.maxPriceMultiplier.toString(),
    systemDecimalValue: state.systemDecimalValue.toString(),
    minSeparateNumerator: state.minSeparateNumerator.toString(),
    minSeparateDenominator: state.minSeparateDenominator.toString(),
    tradeFeeNumerator: state.tradeFeeNumerator.toString(),
    tradeFeeDenominator: state.tradeFeeDenominator.toString(),
    pnlNumerator: state.pnlNumerator.toString(),
    pnlDenominator: state.pnlDenominator.toString(),
    swapFeeNumerator: state.swapFeeNumerator.toString(),
    swapFeeDenominator: state.swapFeeDenominator.toString(),
    baseNeedTakePnl: state.baseNeedTakePnl.toString(),
    quoteNeedTakePnl: state.quoteNeedTakePnl.toString(),
    quoteTotalPnl: state.quoteTotalPnl.toString(),
    baseTotalPnl: state.baseTotalPnl.toString(),
    poolOpenTime: state.poolOpenTime.toString(),
    punishPcAmount: state.punishPcAmount.toString(),
    punishCoinAmount: state.punishCoinAmount.toString(),
    orderbookToInitTime: state.orderbookToInitTime.toString(),
    swapBaseInAmount: state.swapBaseInAmount.toString(),
    swapQuoteOutAmount: state.swapQuoteOutAmount.toString(),
    swapBase2QuoteFee: state.swapBase2QuoteFee.toString(),
    swapQuoteInAmount: state.swapQuoteInAmount.toString(),
    swapBaseOutAmount: state.swapBaseOutAmount.toString(),
    swapQuote2BaseFee: state.swapQuote2BaseFee.toString(),
    baseVault: state.baseVault.toBase58(),
    quoteVault: state.quoteVault.toBase58(),
    baseMint: state.baseMint.toBase58(),
    quoteMint: state.quoteMint.toBase58(),
    lpMint: state.lpMint.toBase58(),
    openOrders: state.openOrders.toBase58(),
    marketId: state.marketId.toBase58(),
    marketProgramId: state.marketProgramId.toBase58(),
    targetOrders: state.targetOrders.toBase58(),
    withdrawQueue: state.withdrawQueue.toBase58(),
    lpVault: state.lpVault.toBase58(),
    lpReserve: state.lpReserve.toString(),
  };
}

/**
 * Fetch account data from the Solana blockchain.
 * @param connection The Solana connection object.
 * @param accountPubKey The public key of the account to fetch.
 * @param programId The program ID to verify account ownership.
 * @returns Buffer containing the account data.
 */
export async function fetchAccountData(
  connection: Connection,
  accountPubKey: string,
  programId: string,
  accountInfo :  any,
): Promise<Buffer> {
  const publicKey = new PublicKey(accountPubKey);
  const programPublicKey = new PublicKey(programId);
  const accountOwnerPubkey = accountInfo.value.owner;

  // const accountInfo = await connection.getAccountInfo(publicKey);

  if (!accountInfo) {
    throw new Error('Account not found');
  }

  if (!accountOwnerPubkey.equals(programPublicKey)) {
    throw new Error('Account is not owned by the specified liquidity program');
  }

  return Buffer.from(accountInfo.value.data);
}

/**
 * Parse the liquidity state from the account data.
 * @param data Buffer containing the account data.
 * @returns Parsed LiquidityStateV4 object.
 */
function parseLiquidityStateV4(data: Buffer): LiquidityStateV4 {
  return deserializeLiquidityStateV4(data);
}

// -------------------------
// Main Functionality
// -------------------------

/**
 * Main function to parse liquidity account data.
 * @param poolId The public key of the liquidity pool account.
 * @returns Parsed liquidity state as a PoolData object.
 */
export async function fetchRaydiumPoolData(poolId: string): Promise<PoolData> {
  try {

    //TODO : ADD parameter : Owner. If owner was not provided, 
    const accountInfo = await connection.getParsedAccountInfo(new PublicKey(poolId));
    const accountOwner = accountInfo.value.owner.toBase58();

    if (accountOwner === RAYDIUM_PROGRAM) {
      // Fetch account data
      const accountData = await fetchAccountData(connection, poolId, RAYDIUM_PROGRAM, accountInfo);

      // Parse liquidity state V4
      const liquidityStateV4 = parseLiquidityStateV4(accountData);

      // Convert parsed data to an accessible object matching the interface
      const pool = convertLiquidityStateToObject(liquidityStateV4);

      return {
        owner: RAYDIUM_PROGRAM,
        pool,
      };
    } else if (accountOwner === RAYDIUM_CPMM_PROGRAM_ID || RAYDIUM_STABLE_AMM) {
      const cpmmData = await fetchCpmmPoolData(poolId, accountInfo);
      const poolData: ReadableCpmmPoolInfo = cpmmData.pool;
      return {
        owner: RAYDIUM_CPMM_PROGRAM_ID,
        pool: poolData,
      };
    } else if (accountOwner === RAYDIUM_CLMM_PROGRAM_ID) {
      const clmmData = await fetchClmmPoolData(poolId, accountInfo);
      const poolData: ClmmPoolInfoSerializable = clmmData.pool;
      return {
        owner: RAYDIUM_CLMM_PROGRAM_ID,
        pool: poolData,
      };
    } else {
      throw new Error(`Unsupported pool owner: ${accountOwner}`);
    }
  } catch (error) {
    throw new Error(`Failed to parse liquidity account: ${(error as Error).message}`);
  }
}
