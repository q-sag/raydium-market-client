import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import { Client } from 'pg';
import {
    Connection,
    Commitment,
    PublicKey
  } from '@solana/web3.js';

import Decimal from 'decimal.js';

// Load environment variables from .env file
dotenv.config();

// Retrieve environment variables
const RPC_WSS = process.env.RPC_WSS || 'wss://api.mainnet-beta.solana.com';
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;


// PostgreSQL Client Setup
const pgClient = new Client({
    connectionString: DATABASE_URL,
  });
  
// Redis Client Setup
const redisSubscriber = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  });
  
const redisPublisher = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  });
  
// Initialize Solana Connection with WebSocket
const connection = new Connection(RPC_URL, {
    commitment: 'confirmed' as Commitment,
    wsEndpoint: RPC_WSS,
  });

// SPL Token Program ID
const SPLTOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const RAYDIUM_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'; // Raydium Liquidity Program ID
const RAYDIUM_AUTHORITY = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const RAYDIUM_CPMM_PROGRAM_ID = 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C';
const RAYDIUM_CLMM_PROGRAM_ID = 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'
const PUMP_MIGRATION_ACCOUNT = '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg';
const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const RAYDIUM_STABLE_AMM = '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

const pump_SUBSCRIPTIONS_CHANNEL = 'pumpSubscriptions';
const pump_UNSUBSCRIPTIONS_CHANNEL = 'pumpUnsubscriptions';

const pump_MIGRATION_SUBSCRIBE = 'migrationListen';
const pump_MIGRATION_UNSUBSCRIBE = 'migrationStop' ;
const pump_MIGRATION_ALL = 'migrationAllUpdates';

const RAYDIUM_SUBSCRIPTIONS_CHANNEL = 'RaydiumPoolSubscriptions';
const RAYDIUM_UNSUBSCRIBE_CHANNEL = 'RydiumPoolUnsubscribe'


function sqrtPriceX64ToPrice(
  sqrtPriceX64Str: string,
  decimalsA: number,
  decimalsB: number
): Decimal {
  // Convert sqrtPriceX64 from string to Decimal
  const sqrtPriceX64 = new Decimal(sqrtPriceX64Str);

  // Compute Q64 (2^64)
  const Q64 = new Decimal(2).pow(64);

  // Convert sqrtPriceX64 from Q64.64 fixed-point to Decimal
  const sqrtPriceDecimal = sqrtPriceX64.div(Q64);

  // Square the result to get the price of Token B in terms of Token A
  const priceBA = sqrtPriceDecimal.pow(2);

  // Adjust for token decimals
  const decimalAdjustment = new Decimal(10).pow(decimalsA - decimalsB);

  // Adjusted price of Token B in terms of Token A
  const adjustedPriceBA = priceBA.mul(decimalAdjustment);

  // Invert to get the price of Token A in terms of Token B
  const priceAB = new Decimal(1).div(adjustedPriceBA);

  return priceAB;
}

  export {
    RPC_URL,
    RPC_WSS,
    DATABASE_URL,
    REDIS_HOST,
    REDIS_PASSWORD,
    REDIS_PORT,

    pgClient,
    redisPublisher,
    redisSubscriber,
    connection,

    SPLTOKEN_PROGRAM,
    SOL_MINT,
    USDC_MINT,
    USDT_MINT,
    RAYDIUM_PROGRAM,
    RAYDIUM_AUTHORITY,
    RAYDIUM_CPMM_PROGRAM_ID,
    RAYDIUM_CLMM_PROGRAM_ID,
    RAYDIUM_STABLE_AMM,
    
    PUMP_MIGRATION_ACCOUNT,
    PUMP_PROGRAM,
    
    pump_SUBSCRIPTIONS_CHANNEL,
    pump_UNSUBSCRIPTIONS_CHANNEL,
    
    pump_MIGRATION_SUBSCRIBE, 
    pump_MIGRATION_UNSUBSCRIBE,
    pump_MIGRATION_ALL,
    
    RAYDIUM_SUBSCRIPTIONS_CHANNEL,
    RAYDIUM_UNSUBSCRIBE_CHANNEL,
    sqrtPriceX64ToPrice
}