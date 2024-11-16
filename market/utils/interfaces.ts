//* AMM pools interfaces

import { AccountLayout } from '@solana/spl-token';
import { Connection, PublicKey, AccountInfo, Commitment } from '@solana/web3.js';

// Interfaces
export interface SubscriptionMessage {
    poolId: string;
  }
  
  export interface UnsubscriptionMessage {
    poolId: string;
  }
  
  export interface PoolInfo {
    poolID: string;
    quoteMint: string;
    quoteVault: string;
    quoteVaultBalance: number;
    baseMint: string;
    baseVault: string;
    baseVaultBalance: number;
    price: number;
  }
  
  export interface TrackedPool {
    poolId: string;
    connection: Connection;
    baseVaultPubKey: PublicKey;
    quoteVaultPubKey: PublicKey;
    baseVaultSubscriptionId: number;
    quoteVaultSubscriptionId: number;
    quoteVaultBalance: number; // Initialized to 0
    baseVaultBalance: number; // Initialized to 0
    quoteMint: PublicKey;
    baseMint: PublicKey;
    quoteDecimal: number;
    baseDecimal: number;
  }

export {
    AccountLayout,
    AccountInfo,
}


//* Raydium Pool Data Interfaces


//* WS Pump Interfaces 

// Interface to define the structure of subscription messages
export interface BondingCurveSubscribe {
    tokenMint: string;
    trade_id: string;
  }

// Interface to define the structure of unsubscription messages
export interface BondingCurveUnsubscribe {
    tokenMint: string;
  }

// Interface to define the structure of accounts to trace
export interface TracedAccount {
    trade_id: string;
    tokenMint: string;
    bondingCurve: string;
    associatedBondingCurve: string;
  }

  // In-memory storage for accounts to trace and their subscription IDs
  export interface TracedAccountExtended extends TracedAccount {
    subscriptionIds: number[]; // To handle multiple subscriptions per account if needed
    // solBalance:number;
    // tokenBalance:number;
  }

  export interface VaultData {
    trade_id: string;
    mint: string;
    tokenPrice: number;       // SOL per token
    solVaultBalance: number; // in SOL
    tokenVaultBalance: number; // in tokens
  }


export interface PumpVaultData{
  // Interface to store fetched data
  solBalance: number;           // in SOL
  tokenSupply: number;          // total token supply
  bonding_curveTokens: number;   // tokens in bonding curve
  pricePerToken: number;        // SOL per token
  decimals: number;             // Token decimals
//   symbol: string;               // Token symbol
}


//* CLMM Pool info interfaces : 
import BN from 'bn.js';


// Original RewardInfo interface with complex types
export interface RewardInfo {
  rewardVault: PublicKey;
  rewardMint: PublicKey;
  emissionsPerSecondX64: BN;
  growthGlobalX64: BN;
  accumulator: BN;
  lastUpdatedTimestamp: BN;
  startTimestamp: BN;
  endTimestamp: BN;
}

// Serializable RewardInfo interface
export interface RewardInfoSerializable {
  rewardVault: string;
  rewardMint: string;
  emissionsPerSecondX64: string;
  growthGlobalX64: string;
  accumulator: string;
  lastUpdatedTimestamp: string;
  startTimestamp: string;
  endTimestamp: string;
}

// CLMM Config Info Type
export interface ClmmConfigInfo {
  bump: number;
  index: number;
  owner: PublicKey;
  protocolFeeRate: number;
  tradeFeeRate: number;
  tickSpacing: number;
}

// Serializable version of ClmmConfigInfo
export interface ClmmConfigInfoSerializable {
  bump: number;
  index: number;
  owner: string;
  protocolFeeRate: number;
  tradeFeeRate: number;
  tickSpacing: number;
}
// Original ClmmPoolInfo interface with complex types
export interface ClmmPoolInfo {
  bump: number;
  ammConfig: PublicKey;
  creator: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  observationId: PublicKey;
  mintDecimalsA: number;
  mintDecimalsB: number;
  tickSpacing: number;
  liquidity: BN;
  sqrtPriceX64: BN;
  tickCurrent: number;
  feeProtocol: number;
  feeGrowthGlobalX64A: BN;
  feeGrowthGlobalX64B: BN;
  protocolFeesTokenA: BN;
  protocolFeesTokenB: BN;
  swapInAmountTokenA: BN;
  swapOutAmountTokenB: BN;
  swapInAmountTokenB: BN;
  swapOutAmountTokenA: BN;
  status: number;
  rewardInfos: RewardInfo[];
  tickArrayBitmap: BN[];
  totalFeesTokenA: BN;
  totalFeesClaimedTokenA: BN;
  totalFeesTokenB: BN;
  totalFeesClaimedTokenB: BN;
  fundFeesTokenA: BN;
  fundFeesTokenB: BN;
  startTime: BN;
}

// Serializable version of ClmmPoolInfo with strings and numbers
export interface ClmmPoolInfoSerializable {
  bump: number;
  ammConfig: string;
  creator: string;
  mintA: string;
  mintB: string;
  vaultA: string;
  vaultB: string;
  observationId: string;
  mintDecimalsA: number;
  mintDecimalsB: number;
  tickSpacing: number;
  liquidity: string;
  sqrtPriceX64: string;
  tickCurrent: number;
  feeProtocol: number;
  feeGrowthGlobalX64A: string;
  feeGrowthGlobalX64B: string;
  protocolFeesTokenA: string;
  protocolFeesTokenB: string;
  swapInAmountTokenA: string;
  swapOutAmountTokenB: string;
  swapInAmountTokenB: string;
  swapOutAmountTokenA: string;
  status: number;
  rewardInfos: RewardInfoSerializable[];
  tickArrayBitmap: string[];
  totalFeesTokenA: string;
  totalFeesClaimedTokenA: string;
  totalFeesTokenB: string;
  totalFeesClaimedTokenB: string;
  fundFeesTokenA: string;
  fundFeesTokenB: string;
  startTime: string;
}

// Readable CPMM Config Info with strings and numbers
export interface ReadableCpmmConfigInfo {
  bump: number;
  disableCreatePool: boolean;
  index: number;
  tradeFeeRate: string;
  protocolFeeRate: string;
  fundFeeRate: string;
  createPoolFee: string;
  protocolOwner: string; // base58 string
  fundOwner: string; // base58 string
  additionalFees: string[]; // Array of 16 string representations
}

// Readable CPMM Pool Info with strings and numbers
export interface ReadableCpmmPoolInfo {
  configId: string; // base58 string
  poolCreator: string; // base58 string
  vaultA: string; // base58 string
  vaultB: string; // base58 string
  mintLp: string; // base58 string
  mintA: string; // base58 string
  mintB: string; // base58 string
  mintProgramA: string; // base58 string
  mintProgramB: string; // base58 string
  observationId: string; // base58 string
  bump: number;
  status: number;
  lpDecimals: number;
  mintDecimalA: number;
  mintDecimalB: number;
  lpAmount: string;
  protocolFeesMintA: string;
  protocolFeesMintB: string;
  fundFeesMintA: string;
  fundFeesMintB: string;
  openTime: string;
  additionalData: string[]; // Array of 32 string representations
}

// -------------------------
// Discriminated Union Type Definitions
// -------------------------
import { RAYDIUM_CLMM_PROGRAM_ID, RAYDIUM_CPMM_PROGRAM_ID, RAYDIUM_PROGRAM } from './utils';
// Base interface for PoolData
export interface PoolDataBase {
  owner: string;
}

// Raydium Program Pool Data
export interface RaydiumProgramPoolData extends PoolDataBase {
  owner: typeof RAYDIUM_PROGRAM;
  pool: market_RaydiumPoolData;
}

// CPMM Program Pool Data
export interface CpmmProgramPoolData extends PoolDataBase {
  owner: typeof RAYDIUM_CPMM_PROGRAM_ID;
  pool: ReadableCpmmPoolInfo;
}

// CLMM Program Pool Data
export interface ClmmProgramPoolData extends PoolDataBase {
  owner: typeof RAYDIUM_CLMM_PROGRAM_ID;
  pool: ClmmPoolInfoSerializable;
}

// Union Type for PoolData
export type PoolData = RaydiumProgramPoolData | CpmmProgramPoolData | ClmmProgramPoolData;


export interface market_RaydiumPoolData {
  status: string;
  nonce: string;
  maxOrder: string;
  depth: string;
  baseDecimal: number;
  quoteDecimal: number;
  state: string;
  minSize: string;
  volMaxCutRatio: string;
  amountWaveRatio: string;
  baseLotSize: string;
  quoteLotSize: string;
  minPriceMultiplier: string;
  maxPriceMultiplier: string;
  systemDecimalValue: string;
  minSeparateNumerator: string;
  minSeparateDenominator: string;
  tradeFeeNumerator: string;
  tradeFeeDenominator: string;
  pnlNumerator: string;
  pnlDenominator: string;
  swapFeeNumerator: string;
  swapFeeDenominator: string;
  baseNeedTakePnl: string;
  quoteNeedTakePnl: string;
  quoteTotalPnl: string;
  baseTotalPnl: string;
  poolOpenTime: string;
  punishPcAmount: string;
  punishCoinAmount: string;
  orderbookToInitTime: string;
  swapBaseInAmount: string;
  swapQuoteOutAmount: string;
  swapBase2QuoteFee: string;
  swapQuoteInAmount: string;
  swapBaseOutAmount: string;
  swapQuote2BaseFee: string;
  baseVault: string;
  quoteVault: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  openOrders: string;
  marketId: string;
  marketProgramId: string;
  targetOrders: string;
  withdrawQueue: string;
  lpVault: string;
  lpReserve: string;
}
export interface market_RaydiumPriceUpdate {
  timestamp: string;
  poolid: string;
  quoteMint: string;
  quoteVault: string;
  quoteVaultBalance: number;
  baseMint: string;
  baseVault: string;
  baseVaultBalance: number;
  price:number;
}


export interface market_PumpPriceUpdates {
  timestamp: string;
  trade_id:string ;
  mint: string;
  price: number;
  solBalance: number;
  tokenBalance: number;
}


export interface market_PumpMigrationEvent {
  timestamp: string;
  token: string;
  status: string;
  poolId?: string;
}

export interface market_PumpPriceFetch {
  tokenPrice: number;
  solVaultBalance: number;
  tokenVaultBalance: number;
  symbol: string;
}

export interface market_TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  image: string;
  supply: number;
  decimals: number;
  sellerFeeBasisPoints: number;
  mintAuthority: boolean; // Updated to boolean
  isInitialized: boolean;
  freezeAuthority: boolean; // Updated to boolean
  primarySaleHappened: boolean;
  updateAuthority: string;
  isMutable: boolean;
  rugCheck: boolean; // New field
}