import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import { struct, u64, bool } from '@project-serum/borsh';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { chain } from 'stream-chain';
import { pick } from 'stream-json/filters/Pick';
import Logger from '../utils/logger';
import { Pool } from 'pg';
import { chunk } from 'lodash';

dotenv.config();

// ============================================================================
// Global Configuration Parameters
// ============================================================================

// Program Constants
const PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

// RPC Configuration
if (!process.env.RPC_URL) {
    throw new Error('RPC_URL is not defined in .env file');
}
const RPC_URL = process.env.RPC_URL;

// Database Configuration
const DB_CONFIG = {
    connectionString: process.env.DATABASE_URL,
};

// Filtering Parameters
const ACCOUNT_FILTERS = {
    MIN_BALANCE_SOL: 10,           // Minimum balance in SOL to track an account
};

// Batch Processing Configuration
const BATCH_CONFIG = {
    MAX_BATCH_SIZE: 50,            // Maximum number of accounts to process in a single batch
    FETCH_INTERVAL: 0.5 * 60 * 1000, // Time between fetch iterations (30 seconds)
    ERROR_RETRY_INTERVAL: 60 * 1000 // Time to wait after error before retry (1 minute)
};

// Account Data Structure Parameters
const ACCOUNT_DATA_LAYOUT = struct([
    u64('virtualTokenReserves'),
    u64('virtualSolReserves'),
    u64('realTokenReserves'),
    u64('realSolReserves'),
    u64('tokenTotalSupply'),
    bool('complete'),
]);

// Database Table Configuration
const TABLE_CONFIG = {
    name: 'pump_markets',
    schema: `
        CREATE TABLE IF NOT EXISTS pump_markets (
            pubkey TEXT PRIMARY KEY,
            balance_sol DECIMAL,
            virtual_token_reserves NUMERIC,
            virtual_sol_reserves NUMERIC,
            real_token_reserves NUMERIC,
            real_sol_reserves NUMERIC,
            token_total_supply NUMERIC,
            is_complete BOOLEAN,
            owner TEXT,
            rent_epoch NUMERIC,
            space INTEGER,
            executable BOOLEAN,
            timestamp TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `
};

// Logging Configuration
const LOGGING_CONFIG = {
    mainLogger: 'getAccountsOwnedPump',
    timingLogger: 'timing-pump',
    stats: {
        avgAccountProcessingTime: 0,
        totalAccounts: 0,
        processedAccounts: 0
    }
};

// Initialize logger
const logger = new Logger(LOGGING_CONFIG.mainLogger);

// Add this interface at the top of the file
interface PumpAccountRecord {
    pubkey: string;
    balance_sol: number;
    virtual_token_reserves: string;
    virtual_sol_reserves: string;
    real_token_reserves: string;
    real_sol_reserves: string;
    token_total_supply: string;
    is_complete: boolean;
    owner: string;
    rent_epoch: string;
    space: number;
    executable: boolean;
    timestamp: Date;
}

// Move the pool creation outside the functions to make it global
const pool = new Pool(DB_CONFIG);


export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
} 

// Add the create table query function
async function createPumpMarketsTable() {
    try {
        // Temporarily add this line to recreate the table with the new schema
        await pool.query('DROP TABLE IF EXISTS pump_markets;');
        
        const createTableQuery = TABLE_CONFIG.schema;
        await pool.query(createTableQuery);
        logger.info('Pump markets table created or already exists');
    } catch (error) {
        logger.error('Error creating pump markets table:', error);
        throw error;
    }
}

// Add the batch insert function
async function insertPumpAccounts(accounts: PumpAccountRecord[]) {
    const filteredAccounts = accounts.filter(account => account.balance_sol >= ACCOUNT_FILTERS.MIN_BALANCE_SOL);
    
    if (filteredAccounts.length === 0) return;

    const query = `
        INSERT INTO pump_markets (
            pubkey, balance_sol, virtual_token_reserves, virtual_sol_reserves,
            real_token_reserves, real_sol_reserves, token_total_supply,
            is_complete, owner, rent_epoch, space, executable, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (pubkey) DO UPDATE SET
            balance_sol = EXCLUDED.balance_sol,
            virtual_token_reserves = EXCLUDED.virtual_token_reserves,
            virtual_sol_reserves = EXCLUDED.virtual_sol_reserves,
            real_token_reserves = EXCLUDED.real_token_reserves,
            real_sol_reserves = EXCLUDED.real_sol_reserves,
            token_total_supply = EXCLUDED.token_total_supply,
            is_complete = EXCLUDED.is_complete,
            owner = EXCLUDED.owner,
            rent_epoch = EXCLUDED.rent_epoch,
            space = EXCLUDED.space,
            executable = EXCLUDED.executable,
            timestamp = EXCLUDED.timestamp,
            updated_at = CURRENT_TIMESTAMP;
    `;

    try {
        await Promise.all(
            filteredAccounts.map(account =>
                pool.query(query, [
                    account.pubkey,
                    account.balance_sol,
                    account.virtual_token_reserves,
                    account.virtual_sol_reserves,
                    account.real_token_reserves,
                    account.real_sol_reserves,
                    account.token_total_supply,
                    account.is_complete,
                    account.owner,
                    account.rent_epoch,
                    account.space,
                    account.executable,
                    account.timestamp
                ])
            )
        );

        // Add notification after successful insert
        await pool.query(`NOTIFY pump_markets_update, '${JSON.stringify({
            count: filteredAccounts.length,
            timestamp: new Date().toISOString()
        })}'`);
        
    } catch (error) {
        logger.error('Error inserting pump accounts:', error);
        throw error;
    }
}

// Add new TimingLogger class
class TimingLogger {
    private startTime: number;
    private iterations: number = 0;
    private totalTime: number = 0;
    private logger: Logger;

    constructor() {
        this.startTime = performance.now();
        this.logger = new Logger(LOGGING_CONFIG.timingLogger);
    }

    logIteration(iterationTime: number, totalAccounts: number, processedAccounts: number) {
        this.iterations++;
        this.totalTime += iterationTime;
        
        // Calculate progress and timing metrics
        const progressPercentage = (processedAccounts / totalAccounts) * 100;
        const avgAccountTime = processedAccounts > 0 ? iterationTime / processedAccounts : 0;
        const remainingAccounts = totalAccounts - processedAccounts;
        const estimatedTimeRemaining = remainingAccounts * avgAccountTime / 1000;
        
        // Log progress if it's a milestone or completion
        if (progressPercentage % 10 < 1 || processedAccounts === totalAccounts) {
            this.logger.info(
                `Progress: ${progressPercentage.toFixed(1)}% (${processedAccounts}/${totalAccounts}) - ` +
                `ETA: ${estimatedTimeRemaining.toFixed(1)}s - ` +
                `Avg time per account: ${avgAccountTime.toFixed(3)}ms`
            );
        }
        
        // Update global stats
        LOGGING_CONFIG.stats.avgAccountProcessingTime = avgAccountTime;
        LOGGING_CONFIG.stats.totalAccounts = totalAccounts;
        LOGGING_CONFIG.stats.processedAccounts = processedAccounts;
    }

    reset() {
        this.startTime = performance.now();
        this.iterations = 0;
        this.totalTime = 0;
    }
}

// Modify the fetchPumpAccounts function
async function fetchPumpAccounts() {
    while (true) {  // Add continuous loop
        try {
            const startTime = performance.now();
            logger.info('Starting new account processing cycle...');

            const rpcUrl = RPC_URL;
            if (!rpcUrl) {
                throw new Error('RPC_URL is not defined in .env file');
            }

            // Prepare RPC request payload
            const requestPayload = {
                jsonrpc: '2.0',
                id: 1,
                method: 'getProgramAccounts',
                params: [
                    PROGRAM_ID.toString(),
                    {
                        encoding: 'base64',
                    }
                ]
            };

            // Make the fetch request
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload)
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            // Set up the streaming pipeline
            const pipeline = chain([
                response.body,
                parser(),
                pick({ filter: 'result' }),
                streamArray()
            ]);

            let accountCount = 0;
            let processedCount = 0;
            let accountBatch: PumpAccountRecord[] = [];

            // Process the stream using Promise
            await new Promise((resolve, reject) => {
                pipeline.on('data', async ({ value }: { value: any }) => {
                    try {
                        accountCount++;  // Update total count first
                        LOGGING_CONFIG.stats.totalAccounts = accountCount;  // Update stats immediately
                        
                        const accountStart = performance.now();
                        
                        const balanceInSol = value.account.lamports / 1e9;
                        
                        try {
                            const data = Buffer.from(value.account.data[0], 'base64');
                            const rawAccountData = data.slice(8);
                            
                            if (rawAccountData.length < ACCOUNT_DATA_LAYOUT.span) {
                                // Only log invalid accounts with significant balance
                                if (balanceInSol >= ACCOUNT_FILTERS.MIN_BALANCE_SOL) {
                                    logger.warn(`Invalid account data length for ${value.pubkey} with ${balanceInSol} SOL`);
                                }
                                return;
                            }

                            const accountData = ACCOUNT_DATA_LAYOUT.decode(rawAccountData);
                            
                            // Format data for PostgreSQL
                            const pumpAccount: PumpAccountRecord = {
                                pubkey: value.pubkey,
                                balance_sol: balanceInSol,
                                virtual_token_reserves: accountData.virtualTokenReserves.toString(),
                                virtual_sol_reserves: accountData.virtualSolReserves.toString(),
                                real_token_reserves: accountData.realTokenReserves.toString(),
                                real_sol_reserves: accountData.realSolReserves.toString(),
                                token_total_supply: accountData.tokenTotalSupply.toString(),
                                is_complete: accountData.complete,
                                owner: value.account.owner,
                                rent_epoch: value.account.rentEpoch.toString(),
                                space: value.account.space,
                                executable: value.account.executable,
                                timestamp: new Date(),
                            };

                            if (pumpAccount.balance_sol >= ACCOUNT_FILTERS.MIN_BALANCE_SOL) {
                                accountBatch.push(pumpAccount);
                                processedCount++;
                                LOGGING_CONFIG.stats.processedAccounts = processedCount;  // Update processed count
                                
                                if (accountBatch.length >= BATCH_CONFIG.MAX_BATCH_SIZE) {
                                    await insertPumpAccounts(accountBatch);
                                    accountBatch = [];
                                }
                            }
                            
                        } catch (e: any) {
                            // Only log errors for accounts with significant balance
                            if (balanceInSol >= ACCOUNT_FILTERS.MIN_BALANCE_SOL) {
                                if (e.code === ERROR_TYPES.BUFFER_OUT_OF_BOUNDS) {
                                    logger.warn(`Buffer error for account ${value.pubkey} with ${balanceInSol} SOL`);
                                } else if (e instanceof RangeError || e instanceof TypeError) {
                                    logger.warn(`Data format error for ${value.pubkey} with ${balanceInSol} SOL`);
                                } else {
                                    logger.error(`Error processing account ${value.pubkey} with ${balanceInSol} SOL:`, e);
                                }
                            }
                        }
                        
                    } catch (e) {
                        logger.error(`Fatal error processing account ${value?.pubkey || 'unknown'}:`, e);
                    }
                });

                pipeline.on('end', resolve);
                pipeline.on('error', reject);
            });

            const cycleTime = (performance.now() - startTime) / 1000;
            logger.info(`Completed processing cycle:
                - Total accounts: ${accountCount}
                - Processed accounts: ${processedCount}
                - Cycle time: ${cycleTime.toFixed(1)} seconds`);

            // No sleep delay - immediately start next cycle
            
        } catch (error) {
            logger.error('Error in fetch cycle:', error);
            // Add small delay on error to prevent tight error loop
            await sleep(5000); // 5 second delay on error
        }
    }
}

// Update the main function to reflect the continuous nature
async function runPumpAccountsFetcher() {
    try {
        logger.info('Starting continuous pump accounts fetcher...');
        await fetchPumpAccounts(); // This will now run indefinitely
    } catch (error) {
        logger.error('Fatal error in pump accounts fetcher:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Add graceful shutdown handling
process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal. Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal. Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

// Execute the script
runPumpAccountsFetcher().catch(err => {
    logger.error('Fatal error:', err);
    process.exit(1);
});

// Add with other configuration constants
const ERROR_TYPES = {
    BUFFER_OUT_OF_BOUNDS: 'ERR_BUFFER_OUT_OF_BOUNDS',
    INVALID_ACCOUNT_DATA: 'INVALID_ACCOUNT_DATA'
} as const;
