// raydium_clmm.ts

import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import * as BufferLayout from 'buffer-layout';
import BN from 'bn.js';
import { Buffer } from 'buffer';
import * as dotenv from 'dotenv';
import Logger from '../utils/logger';
import { RewardInfo, RewardInfoSerializable, ClmmConfigInfo, ClmmConfigInfoSerializable, ClmmPoolInfo, ClmmPoolInfoSerializable } from '../utils/interfaces';
import { fetchAccountData } from '../fetch/raydium_fetchPoolData';

// Initialize environment variables
dotenv.config();

const logger = new Logger(`raydium_clmm`);

// Configuration
const RPC_URL = process.env.RPC_URL || clusterApiUrl('mainnet-beta');
const RAYDIUM_CLMM_PROGRAM_ID = process.env.RAYDIUM_CLMM_PROGRAM_ID || 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK';

// Initialize Solana connection
const connection = new Connection(RPC_URL, 'confirmed');

// -------------------------
// Buffer Layout Definitions
// -------------------------

/**
 * Define a blob layout.
 * @param length Number of bytes in the blob.
 * @param property Name of the property.
 */
const blob = (length: number, property: string) =>
  BufferLayout.blob(length, property);

/**
 * Define a u8 layout.
 * @param property Name of the property.
 */
const u8 = (property: string) => BufferLayout.u8(property);

/**
 * Define a u16 layout.
 * @param property Name of the property.
 */
const u16 = (property: string) => BufferLayout.u16(property, true); // true for little-endian

/**
 * Define a u32 layout.
 * @param property Name of the property.
 */
const u32 = (property: string) => BufferLayout.u32(property, true); // true for little-endian

/**
 * Define a s32 (signed 32-bit integer) layout.
 * @param property Name of the property.
 */
const s32 = (property: string) => {
  const layout = BufferLayout.blob(4, property);
  layout.decode = (buffer: Buffer, offset: number) => buffer.readInt32LE(offset);
  layout.encode = (src: number, buffer: Buffer, offset: number) => buffer.writeInt32LE(src, offset);
  return layout;
};

/**
 * Define a u64 layout as a blob (8 bytes).
 * @param property Name of the property.
 */
const u64 = (property: string) => BufferLayout.blob(8, property);

/**
 * Define a u128 layout as a blob (16 bytes).
 * @param property Name of the property.
 */
const u128 = (property: string) => BufferLayout.blob(16, property);

/**
 * Define a public key layout as a blob (32 bytes).
 * @param property Name of the property.
 */
const publicKeyLayout = (property: string) => BufferLayout.blob(32, property);

/**
 * Define a boolean layout.
 * @param property Name of the property.
 */
const bool = (property: string) => {
  const layout = BufferLayout.u8(property);
  const decode = layout.decode.bind(layout);
  layout.decode = (buffer: Buffer, offset: number) => !!decode(buffer, offset);
  return layout;
};

/**
 * Define a sequence layout.
 * @param element BufferLayout for the element.
 * @param length Number of elements.
 * @param property Name of the property.
 */
const seqLayout = (element: BufferLayout.Layout<any>, length: number, property: string) =>
  BufferLayout.seq(element, length, property);

// -------------------------
// CLMM Layouts
// -------------------------

// Define the RewardInfo Layout
const RewardInfoLayout = BufferLayout.struct([
  publicKeyLayout('rewardVault'),
  publicKeyLayout('rewardMint'),
  u128('emissionsPerSecondX64'),
  u128('growthGlobalX64'),
  u64('accumulator'),
  u64('lastUpdatedTimestamp'),
  u64('startTimestamp'),
  u64('endTimestamp'),
]);

// Define the CLMM Pool Info Layout
const ClmmPoolInfoLayout = BufferLayout.struct([
  blob(8, 'padding'), // 8-byte padding or discriminator
  u8('bump'),
  publicKeyLayout('ammConfig'),
  publicKeyLayout('creator'),
  publicKeyLayout('mintA'),
  publicKeyLayout('mintB'),
  publicKeyLayout('vaultA'),
  publicKeyLayout('vaultB'),
  publicKeyLayout('observationId'),
  u8('mintDecimalsA'),
  u8('mintDecimalsB'),
  u16('tickSpacing'),
  u128('liquidity'),
  u128('sqrtPriceX64'),
  s32('tickCurrent'),
  u32('feeProtocol'), // unnamed u32, given a name
  u128('feeGrowthGlobalX64A'),
  u128('feeGrowthGlobalX64B'),
  u64('protocolFeesTokenA'),
  u64('protocolFeesTokenB'),
  u128('swapInAmountTokenA'),
  u128('swapOutAmountTokenB'),
  u128('swapInAmountTokenB'),
  u128('swapOutAmountTokenA'),
  u8('status'),
  seqLayout(u8('padding'), 7, 'padding2'),
  seqLayout(RewardInfoLayout, 3, 'rewardInfos'),
  seqLayout(u64('tickArrayBitmapItem'), 16, 'tickArrayBitmap'),
  u64('totalFeesTokenA'),
  u64('totalFeesClaimedTokenA'),
  u64('totalFeesTokenB'),
  u64('totalFeesClaimedTokenB'),
  u64('fundFeesTokenA'),
  u64('fundFeesTokenB'),
  u64('startTime'),
  seqLayout(u64('paddingItem'), 15 * 4 - 3, 'padding3'),
]);

// Define the CLMM Config Layout
const ClmmConfigLayout = BufferLayout.struct([
  blob(8, 'padding'), // 8-byte padding or discriminator
  u8('bump'),
  u16('index'),
  publicKeyLayout('owner'),
  u32('protocolFeeRate'),
  u32('tradeFeeRate'),
  u16('tickSpacing'),
  seqLayout(u64('paddingItem'), 8, 'padding'),
]);

// -------------------------
// Helper Functions
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
 * Deserialize RewardInfo.
 * @param decoded The decoded buffer object.
 * @returns Parsed RewardInfo object.
 */
function deserializeRewardInfo(decoded: any): RewardInfo {
  return {
    rewardVault: blobToPublicKey(decoded.rewardVault),
    rewardMint: blobToPublicKey(decoded.rewardMint),
    emissionsPerSecondX64: blobToBN(decoded.emissionsPerSecondX64),
    growthGlobalX64: blobToBN(decoded.growthGlobalX64),
    accumulator: blobToBN(decoded.accumulator),
    lastUpdatedTimestamp: blobToBN(decoded.lastUpdatedTimestamp),
    startTimestamp: blobToBN(decoded.startTimestamp),
    endTimestamp: blobToBN(decoded.endTimestamp),
  };
}

/**
 * Convert RewardInfo to RewardInfoSerializable.
 * @param rewardInfo RewardInfo object.
 * @returns RewardInfoSerializable object.
 */
function convertRewardInfoToSerializable(
  rewardInfo: RewardInfo
): RewardInfoSerializable {
  return {
    rewardVault: rewardInfo.rewardVault.toBase58(),
    rewardMint: rewardInfo.rewardMint.toBase58(),
    emissionsPerSecondX64: rewardInfo.emissionsPerSecondX64.toString(),
    growthGlobalX64: rewardInfo.growthGlobalX64.toString(),
    accumulator: rewardInfo.accumulator.toString(),
    lastUpdatedTimestamp: rewardInfo.lastUpdatedTimestamp.toString(),
    startTimestamp: rewardInfo.startTimestamp.toString(),
    endTimestamp: rewardInfo.endTimestamp.toString(),
  };
}

/**
 * Convert BN to string.
 * @param bn BN instance.
 * @returns String representation.
 */
const bnToString = (bn: BN): string => bn.toString(10);

/**
 * Convert ClmmPoolInfo to ClmmPoolInfoSerializable.
 * @param pool ClmmPoolInfo object.
 * @returns ClmmPoolInfoSerializable object.
 */
export function convertClmmPoolInfoToSerializable(
  pool: ClmmPoolInfo
): ClmmPoolInfoSerializable {
  return {
    bump: pool.bump,
    ammConfig: pool.ammConfig.toBase58(),
    creator: pool.creator.toBase58(),
    mintA: pool.mintA.toBase58(),
    mintB: pool.mintB.toBase58(),
    vaultA: pool.vaultA.toBase58(),
    vaultB: pool.vaultB.toBase58(),
    observationId: pool.observationId.toBase58(),
    mintDecimalsA: pool.mintDecimalsA,
    mintDecimalsB: pool.mintDecimalsB,
    tickSpacing: pool.tickSpacing,
    liquidity: bnToString(pool.liquidity),
    sqrtPriceX64: bnToString(pool.sqrtPriceX64),
    tickCurrent: pool.tickCurrent,
    feeProtocol: pool.feeProtocol,
    feeGrowthGlobalX64A: bnToString(pool.feeGrowthGlobalX64A),
    feeGrowthGlobalX64B: bnToString(pool.feeGrowthGlobalX64B),
    protocolFeesTokenA: bnToString(pool.protocolFeesTokenA),
    protocolFeesTokenB: bnToString(pool.protocolFeesTokenB),
    swapInAmountTokenA: bnToString(pool.swapInAmountTokenA),
    swapOutAmountTokenB: bnToString(pool.swapOutAmountTokenB),
    swapInAmountTokenB: bnToString(pool.swapInAmountTokenB),
    swapOutAmountTokenA: bnToString(pool.swapOutAmountTokenA),
    status: pool.status,
    rewardInfos: pool.rewardInfos.map(convertRewardInfoToSerializable),
    tickArrayBitmap: pool.tickArrayBitmap.map(bnToString),
    totalFeesTokenA: bnToString(pool.totalFeesTokenA),
    totalFeesClaimedTokenA: bnToString(pool.totalFeesClaimedTokenA),
    totalFeesTokenB: bnToString(pool.totalFeesTokenB),
    totalFeesClaimedTokenB: bnToString(pool.totalFeesClaimedTokenB),
    fundFeesTokenA: bnToString(pool.fundFeesTokenA),
    fundFeesTokenB: bnToString(pool.fundFeesTokenB),
    startTime: bnToString(pool.startTime),
  };
}

/**
 * Convert ClmmConfigInfo to ClmmConfigInfoSerializable.
 * @param config ClmmConfigInfo object.
 * @returns ClmmConfigInfoSerializable object.
 */
function convertClmmConfigInfoToSerializable(
  config: ClmmConfigInfo
): ClmmConfigInfoSerializable {
  return {
    bump: config.bump,
    index: config.index,
    owner: config.owner.toBase58(),
    protocolFeeRate: config.protocolFeeRate,
    tradeFeeRate: config.tradeFeeRate,
    tickSpacing: config.tickSpacing,
  };
}

// -------------------------
// Deserialization Functions
// -------------------------

/**
 * Deserialize CLMM Pool Info and convert it to a serializable format.
 * @param buffer Buffer containing the pool account data.
 * @returns Parsed ClmmPoolInfoSerializable object.
 */
export function deserializeClmmPoolInfo(
  buffer: Buffer
): ClmmPoolInfoSerializable {
  const decoded = ClmmPoolInfoLayout.decode(buffer);

  const rewardInfos = decoded.rewardInfos.map((rewardInfo: any) =>
    deserializeRewardInfo(rewardInfo)
  );

  const clmmPoolInfo: ClmmPoolInfo = {
    bump: decoded.bump,
    ammConfig: blobToPublicKey(decoded.ammConfig),
    creator: blobToPublicKey(decoded.creator),
    mintA: blobToPublicKey(decoded.mintA),
    mintB: blobToPublicKey(decoded.mintB),
    vaultA: blobToPublicKey(decoded.vaultA),
    vaultB: blobToPublicKey(decoded.vaultB),
    observationId: blobToPublicKey(decoded.observationId),
    mintDecimalsA: decoded.mintDecimalsA,
    mintDecimalsB: decoded.mintDecimalsB,
    tickSpacing: decoded.tickSpacing,
    liquidity: blobToBN(decoded.liquidity),
    sqrtPriceX64: blobToBN(decoded.sqrtPriceX64),
    tickCurrent: decoded.tickCurrent,
    feeProtocol: decoded.feeProtocol,
    feeGrowthGlobalX64A: blobToBN(decoded.feeGrowthGlobalX64A),
    feeGrowthGlobalX64B: blobToBN(decoded.feeGrowthGlobalX64B),
    protocolFeesTokenA: blobToBN(decoded.protocolFeesTokenA),
    protocolFeesTokenB: blobToBN(decoded.protocolFeesTokenB),
    swapInAmountTokenA: blobToBN(decoded.swapInAmountTokenA),
    swapOutAmountTokenB: blobToBN(decoded.swapOutAmountTokenB),
    swapInAmountTokenB: blobToBN(decoded.swapInAmountTokenB),
    swapOutAmountTokenA: blobToBN(decoded.swapOutAmountTokenA),
    status: decoded.status,
    rewardInfos: rewardInfos,
    tickArrayBitmap: decoded.tickArrayBitmap.map(blobToBN),
    totalFeesTokenA: blobToBN(decoded.totalFeesTokenA),
    totalFeesClaimedTokenA: blobToBN(decoded.totalFeesClaimedTokenA),
    totalFeesTokenB: blobToBN(decoded.totalFeesTokenB),
    totalFeesClaimedTokenB: blobToBN(decoded.totalFeesClaimedTokenB),
    fundFeesTokenA: blobToBN(decoded.fundFeesTokenA),
    fundFeesTokenB: blobToBN(decoded.fundFeesTokenB),
    startTime: blobToBN(decoded.startTime),
  };

  // Convert to serializable format
  const poolInfo = convertClmmPoolInfoToSerializable(clmmPoolInfo)
  return poolInfo;
}

/**
 * Deserialize CLMM Config Info and convert it to a serializable format.
 * @param buffer Buffer containing the config account data.
 * @returns Parsed ClmmConfigInfoSerializable object.
 */
function deserializeClmmConfigInfo(
  buffer: Buffer
): ClmmConfigInfoSerializable {
  const decoded = ClmmConfigLayout.decode(buffer);

  const clmmConfigInfo: ClmmConfigInfo = {
    bump: decoded.bump,
    index: decoded.index,
    owner: blobToPublicKey(decoded.owner),
    protocolFeeRate: decoded.protocolFeeRate,
    tradeFeeRate: decoded.tradeFeeRate,
    tickSpacing: decoded.tickSpacing,
  };

  // Convert to serializable format
  return convertClmmConfigInfoToSerializable(clmmConfigInfo);
}

// // -------------------------
// // Data Fetching Functions
// // -------------------------

// /**
//  * Fetch account data from the Solana blockchain.
//  * @param connection Solana connection object.
//  * @param accountPubKey The public key of the account to fetch.
//  * @param programId The expected owner program ID of the account.
//  * @returns Buffer containing the account data.
//  */
// async function fetchAccountData(
//   connection: Connection,
//   accountPubKey: string,
//   programId: string
// ): Promise<Buffer> {
//   const publicKey = new PublicKey(accountPubKey);
//   const programPublicKey = new PublicKey(programId);

//   const accountInfo = await connection.getAccountInfo(publicKey);

//   if (!accountInfo) {
//     throw new Error(`Account ${accountPubKey} not found`);
//   }

//   if (!accountInfo.owner.equals(programPublicKey)) {
//     throw new Error(`Account ${accountPubKey} is not owned by the program ${programId}`);
//   }

//   return Buffer.from(accountInfo.data);
// }

/**
 * Fetch and parse CLMM pool data from Raydium.
 * @param poolId The public key of the CLMM pool account.
 * @returns An object containing both config and pool information.
 */
async function fetchClmmPoolData(poolId: string, accountInfo: any): Promise<{
  // config: ClmmConfigInfoSerializable;
  pool: ClmmPoolInfoSerializable;
}> {
  try {
    const accountOwner = accountInfo.value.owner.toBase58();

    console.log(accountOwner)

    // Fetch pool account data
    const poolData = await fetchAccountData(connection, poolId, RAYDIUM_CLMM_PROGRAM_ID, accountInfo);

    // Deserialize pool info
    const poolInfo = deserializeClmmPoolInfo(poolData);

    const pool : ClmmPoolInfoSerializable = poolInfo;

    return {pool}  ;

  } catch (error) {
    throw new Error(`Failed to fetch CLMM pool data: ${(error as Error).message, error.stack}`);
  }
}

async function clmmPoolDataForWS(poolData: any) {
  logger.debug(poolData);
  // Extract necessary data for WebSocket
  const data = {
    baseVault: poolData.pool.vaultA,
    baseMint: poolData.pool.mintA,
    baseDecimal: poolData.pool.mintDecimalsA,
    quoteVault: poolData.pool.vaultB,
    quoteMint: poolData.pool.mintB,
    quoteDecimal: poolData.pool.mintDecimalsB,
  };

  return data;
}

// -------------------------
// Exported for Testing or Importing
// -------------------------

export {
  fetchClmmPoolData,
  ClmmConfigLayout,
  ClmmPoolInfoLayout,
  ClmmConfigInfo,
  // ClmmPoolInfo,
  ClmmConfigInfoSerializable,
  // ClmmPoolInfoSerializable,
  clmmPoolDataForWS,
};
