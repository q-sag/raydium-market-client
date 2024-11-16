// raydium_cpmm.ts

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
import { ReadableCpmmConfigInfo, ReadableCpmmPoolInfo } from '../utils/interfaces';
import { fetchAccountData } from './raydium_fetchPoolData';

// Initialize environment variables
dotenv.config();

const logger = new Logger(`raydium_cpmm`);

// Configuration
const RPC_URL = process.env.RPC_URL || clusterApiUrl('mainnet-beta');
const RAYDIUM_CPMM_PROGRAM_ID = process.env.RAYDIUM_CPMM_PROGRAM_ID || 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C';

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
// CPMM Layouts
// -------------------------

// Define the CPMM Config Info Layout
const CpmmConfigInfoLayout = BufferLayout.struct([
  blob(8, 'padding'), // 8-byte padding or discriminator
  u8('bump'),
  bool('disableCreatePool'),
  u16('index'),
  u64('tradeFeeRate'),
  u64('protocolFeeRate'),
  u64('fundFeeRate'),
  u64('createPoolFee'),
  publicKeyLayout('protocolOwner'),
  publicKeyLayout('fundOwner'),
  seqLayout(u64('sequenceItem'), 16, 'additionalFees'),
]);

// Define the CPMM Pool Info Layout
const CpmmPoolInfoLayout = BufferLayout.struct([
  blob(8, 'padding'), // 8-byte padding or discriminator
  publicKeyLayout('configId'),
  publicKeyLayout('poolCreator'),
  publicKeyLayout('vaultA'),
  publicKeyLayout('vaultB'),
  publicKeyLayout('mintLp'),
  publicKeyLayout('mintA'),
  publicKeyLayout('mintB'),
  publicKeyLayout('mintProgramA'),
  publicKeyLayout('mintProgramB'),
  publicKeyLayout('observationId'),
  u8('bump'),
  u8('status'),
  u8('lpDecimals'),
  u8('mintDecimalA'),
  u8('mintDecimalB'),
  u64('lpAmount'),
  u64('protocolFeesMintA'),
  u64('protocolFeesMintB'),
  u64('fundFeesMintA'),
  u64('fundFeesMintB'),
  u64('openTime'),
  seqLayout(u64('sequenceItem'), 32, 'additionalData'),
]);

// -------------------------
// Type Definitions
// -------------------------

// Raw CPMM Config Info from on-chain data
type RawCpmmConfigInfo = {
  bump: number;
  disableCreatePool: boolean;
  index: number;
  tradeFeeRate: BN;
  protocolFeeRate: BN;
  fundFeeRate: BN;
  createPoolFee: BN;
  protocolOwner: PublicKey;
  fundOwner: PublicKey;
  additionalFees: BN[]; // Array of 16 BN instances
};

// Raw CPMM Pool Info from on-chain data
type RawCpmmPoolInfo = {
  configId: PublicKey;
  poolCreator: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  mintLp: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  mintProgramA: PublicKey;
  mintProgramB: PublicKey;
  observationId: PublicKey;
  bump: number;
  status: number;
  lpDecimals: number;
  mintDecimalA: number;
  mintDecimalB: number;
  lpAmount: BN;
  protocolFeesMintA: BN;
  protocolFeesMintB: BN;
  fundFeesMintA: BN;
  fundFeesMintB: BN;
  openTime: BN;
  additionalData: BN[]; // Array of 32 BN instances
};





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

// /**
//  * Deserialize CPMM Config Info.
//  * @param buffer Buffer containing the config account data.
//  * @returns Parsed RawCpmmConfigInfo object.
//  */
// function deserializeCpmmConfigInfo(buffer: Buffer): RawCpmmConfigInfo {
//   const decoded = CpmmConfigInfoLayout.decode(buffer);

//   const configInfo: RawCpmmConfigInfo = {
//     bump: decoded.bump,
//     disableCreatePool: decoded.disableCreatePool,
//     index: decoded.index,
//     tradeFeeRate: blobToBN(decoded.tradeFeeRate),
//     protocolFeeRate: blobToBN(decoded.protocolFeeRate),
//     fundFeeRate: blobToBN(decoded.fundFeeRate),
//     createPoolFee: blobToBN(decoded.createPoolFee),
//     protocolOwner: blobToPublicKey(decoded.protocolOwner),
//     fundOwner: blobToPublicKey(decoded.fundOwner),
//     additionalFees: decoded.additionalFees.map(blobToBN),
//   };

//   return configInfo;
// }

/**
 * Deserialize CPMM Pool Info.
 * @param buffer Buffer containing the pool account data.
 * @returns Parsed RawCpmmPoolInfo object.
 */
function deserializeCpmmPoolInfo(buffer: Buffer): RawCpmmPoolInfo {
  const decoded = CpmmPoolInfoLayout.decode(buffer);

  const poolInfo: RawCpmmPoolInfo = {
    configId: blobToPublicKey(decoded.configId),
    poolCreator: blobToPublicKey(decoded.poolCreator),
    vaultA: blobToPublicKey(decoded.vaultA),
    vaultB: blobToPublicKey(decoded.vaultB),
    mintLp: blobToPublicKey(decoded.mintLp),
    mintA: blobToPublicKey(decoded.mintA),
    mintB: blobToPublicKey(decoded.mintB),
    mintProgramA: blobToPublicKey(decoded.mintProgramA),
    mintProgramB: blobToPublicKey(decoded.mintProgramB),
    observationId: blobToPublicKey(decoded.observationId),
    bump: decoded.bump,
    status: decoded.status,
    lpDecimals: decoded.lpDecimals,
    mintDecimalA: decoded.mintDecimalA,
    mintDecimalB: decoded.mintDecimalB,
    lpAmount: blobToBN(decoded.lpAmount),
    protocolFeesMintA: blobToBN(decoded.protocolFeesMintA),
    protocolFeesMintB: blobToBN(decoded.protocolFeesMintB),
    fundFeesMintA: blobToBN(decoded.fundFeesMintA),
    fundFeesMintB: blobToBN(decoded.fundFeesMintB),
    openTime: blobToBN(decoded.openTime),
    additionalData: decoded.additionalData.map(blobToBN),
  };

  return poolInfo;
}

// /**
//  * Convert RawCpmmConfigInfo to ReadableCpmmConfigInfo.
//  * @param config Parsed RawCpmmConfigInfo object.
//  * @returns ReadableCpmmConfigInfo object with string representations.
//  */
// function convertCpmmConfigInfoToReadable(config: RawCpmmConfigInfo): ReadableCpmmConfigInfo {
//   return {
//     bump: config.bump,
//     disableCreatePool: config.disableCreatePool,
//     index: config.index,
//     tradeFeeRate: config.tradeFeeRate.toString(),
//     protocolFeeRate: config.protocolFeeRate.toString(),
//     fundFeeRate: config.fundFeeRate.toString(),
//     createPoolFee: config.createPoolFee.toString(),
//     protocolOwner: config.protocolOwner.toBase58(),
//     fundOwner: config.fundOwner.toBase58(),
//     additionalFees: config.additionalFees.map((fee) => fee.toString()),
//   };
// }

/**
 * Convert RawCpmmPoolInfo to ReadableCpmmPoolInfo.
 * @param pool Parsed RawCpmmPoolInfo object.
 * @returns ReadableCpmmPoolInfo object with string representations.
 */
function convertCpmmPoolInfoToReadable(pool: RawCpmmPoolInfo): ReadableCpmmPoolInfo {
  return {
    configId: pool.configId.toBase58(),
    poolCreator: pool.poolCreator.toBase58(),
    vaultA: pool.vaultA.toBase58(),
    vaultB: pool.vaultB.toBase58(),
    mintLp: pool.mintLp.toBase58(),
    mintA: pool.mintA.toBase58(),
    mintB: pool.mintB.toBase58(),
    mintProgramA: pool.mintProgramA.toBase58(),
    mintProgramB: pool.mintProgramB.toBase58(),
    observationId: pool.observationId.toBase58(),
    bump: pool.bump,
    status: pool.status,
    lpDecimals: pool.lpDecimals,
    mintDecimalA: pool.mintDecimalA,
    mintDecimalB: pool.mintDecimalB,
    lpAmount: pool.lpAmount.toString(),
    protocolFeesMintA: pool.protocolFeesMintA.toString(),
    protocolFeesMintB: pool.protocolFeesMintB.toString(),
    fundFeesMintA: pool.fundFeesMintA.toString(),
    fundFeesMintB: pool.fundFeesMintB.toString(),
    openTime: pool.openTime.toString(),
    additionalData: pool.additionalData.map((data) => data.toString()),
  };
}


/**
 * Fetch and parse CPMM pool data from Raydium.
 * @param poolId The public key of the CPMM pool account.
 * @returns An object containing both config and pool information in readable formats.
 */
async function fetchCpmmPoolData(poolId: string, accountInfo: any): Promise<{
  config: any;
  pool: ReadableCpmmPoolInfo;
}> {
  try {
    // Fetch pool account data
    const poolData = await fetchAccountData(connection, poolId, RAYDIUM_CPMM_PROGRAM_ID, accountInfo);
    logger.debug('Raw CPMM Pool Data:', poolData);

    // Deserialize pool info
    const rawPoolInfo = deserializeCpmmPoolInfo(poolData);
    logger.debug('Deserialized CPMM Pool Info:', rawPoolInfo);

    // Convert to readable object
    const readablePoolInfo = convertCpmmPoolInfoToReadable(rawPoolInfo);
    logger.debug('Readable CPMM Pool Info:', readablePoolInfo);

    // // Extract config ID from pool info
    // const configId = readablePoolInfo.configId;

    // // Fetch config account data
    // const configData = await fetchAccountData(connection, configId, RAYDIUM_CPMM_PROGRAM_ID);
    // logger.debug('Raw CPMM Config Data:', configData);

    // // Deserialize config info
    // const rawConfigInfo = deserializeCpmmConfigInfo(configData);
    // logger.debug('Deserialized CPMM Config Info:', rawConfigInfo);

    // // Convert to readable object
    // const readableConfigInfo = convertCpmmConfigInfoToReadable(rawConfigInfo);
    // logger.debug('Readable CPMM Config Info:', readableConfigInfo);

    return {
      config: "",
      pool: readablePoolInfo,
    };
  } catch (error) {
    logger.error(`Failed to fetch CPMM pool data: ${(error as Error).message}`);
    throw new Error(`Failed to fetch CPMM pool data: ${(error as Error).message}`);
  }
}

/**
 * Extract necessary CPMM pool data for WebSocket operations.
 * @param poolData ReadableCpmmPoolInfo object.
 * @returns An object containing essential CPMM pool details as strings and numbers.
 */
async function cpmmPoolDataForWS(poolData: ReadableCpmmPoolInfo): Promise<{
  baseVault: string;
  baseMint: string;
  baseDecimal: number;
  quoteVault: string;
  quoteMint: string;
  quoteDecimal: number;
}> {
  logger.debug('Preparing CPMM Pool Data for WebSocket:', poolData);
  
  const data = {
    baseVault: poolData.vaultA,
    baseMint: poolData.mintA,
    baseDecimal: poolData.mintDecimalA,
    quoteVault: poolData.vaultB,
    quoteMint: poolData.mintB,
    quoteDecimal: poolData.mintDecimalB,
  };

  return data;
}

// -------------------------
// Exported for Testing or Importing
// -------------------------

export {
  fetchCpmmPoolData,
  CpmmConfigInfoLayout,
  CpmmPoolInfoLayout,
  cpmmPoolDataForWS
};
