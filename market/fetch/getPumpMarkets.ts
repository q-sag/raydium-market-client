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
import { chunk } from 'lodash';  // for batch processing
import { sleep } from '../utils/sleep';  // You'll need to create this utility

dotenv.config();

if (!process.env.RPC_URL) {
    throw new Error('RPC_URL is not defined in .env file');
}

// The program ID we want to fetch accounts for (Pump)
const PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

// Define the account data structure
class PumpAccountData {
    virtualTokenReserves: typeof BN;
    virtualSolReserves: typeof BN;
    realTokenReserves: typeof BN;
    realSolReserves: typeof BN;
    tokenTotalSupply: typeof BN;
    complete: boolean;

    constructor(decoded: any) {
        this.virtualTokenReserves = decoded.virtualTokenReserves;
        this.virtualSolReserves = decoded.virtualSolReserves;
        this.realTokenReserves = decoded.realTokenReserves;
        this.realSolReserves = decoded.realSolReserves;
        this.tokenTotalSupply = decoded.tokenTotalSupply;
        this.complete = decoded.complete;
    }

    static schema = new Map([
        [
            PumpAccountData,
            {
                kind: 'struct',
                fields: [
                    ['virtualTokenReserves', 'u64'],
                    ['virtualSolReserves', 'u64'],
                    ['realTokenReserves', 'u64'],
                    ['realSolReserves', 'u64'],
                    ['tokenTotalSupply', 'u64'],
                    ['complete', 'bool'],
                ],
            },
        ],
    ]);
}

// Initialize logger
const logger = new Logger('getAccountsOwnedPump');

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
    rent_epoch: number;
    space: number;
    executable: boolean;
    timestamp: Date;
}

// Move the pool creation outside the functions to make it global
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Add the create table query function
async function createPumpMarketsTable() {
    const createTableQuery = `
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
            rent_epoch INTEGER,
            space INTEGER,
            executable BOOLEAN,
            timestamp TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    try {
        await pool.query(createTableQuery);
        logger.info('Pump markets table created or already exists');
    } catch (error) {
        logger.error('Error creating pump markets table:', error);
        throw error;
    }
}

// Add the batch insert function
async function insertPumpAccounts(accounts: PumpAccountRecord[]) {
    logger.info(`Attempting to insert ${accounts.length} accounts...`);
    
    const filteredAccounts = accounts.filter(account => account.balance_sol >= 10);
    logger.info(`After filtering, inserting ${filteredAccounts.length} accounts with balance >= 10 SOL`);
    
    if (filteredAccounts.length === 0) {
        logger.info('No accounts to insert after filtering');
        return;
    }

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
        this.logger = new Logger('timing-pump');
    }

    logIteration(iterationTime: number) {
        this.iterations++;
        this.totalTime += iterationTime;
        const avgTime = this.totalTime / this.iterations;
        
        this.logger.info(`Iteration ${this.iterations}:`);
        this.logger.info(`- Time taken: ${iterationTime.toFixed(2)}ms`);
        this.logger.info(`- Average time: ${avgTime.toFixed(2)}ms`);
        this.logger.info(`- Total running time: ${(performance.now() - this.startTime).toFixed(2)}ms`);
    }

    reset() {
        this.startTime = performance.now();
        this.iterations = 0;
        this.totalTime = 0;
    }
}

// Modify the main function to run in a loop
async function runPumpAccountsFetcher() {
    const timingLogger = new TimingLogger();
    const mainLogger = new Logger('getAccountsOwnedPump');
    
    try {
        while (true) {
            try {
                const iterationStart = performance.now();
                
                mainLogger.info('Starting new fetch iteration...');
                await fetchPumpAccounts();
                
                const iterationTime = performance.now() - iterationStart;
                timingLogger.logIteration(iterationTime);

                mainLogger.info('Waiting 5 minutes before next fetch...');
                await sleep(5 * 60 * 1000);
                
            } catch (error) {
                mainLogger.error('Error in fetch iteration:', error);
                // Wait 1 minute before retrying on error
                await sleep(60 * 1000);
            }
        }
    } finally {
        // Close the pool only when the entire process is shutting down
        await pool.end();
    }
}

// Modify the fetchPumpAccounts function to handle connection management
async function fetchPumpAccounts() {
    try {
        await createPumpMarketsTable();
        
        const startTime = performance.now();
        const rpcUrl = process.env.RPC_URL;
        if (!rpcUrl) {
            throw new Error('RPC_URL is not defined in .env file');
        }

        try {
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

            logger.debug('response.body : ', response.body);
            // Set up the streaming pipeline to specifically pick the 'result' field
            const pipeline = chain([
                response.body,
                parser(),
                pick({ filter: 'result' }),
                streamArray()
            ]);

            let accountCount = 0;
            
            let accountBatch: PumpAccountRecord[] = [];
            
            // Modify the data handler section
            pipeline.on('data', async ({ value }) => {
                try {
                    accountCount++;
                    const accountStart = performance.now();
                    
                    // Convert lamports to SOL
                    const balanceInSol = value.account.lamports / 1e9;
                    
                    const data = Buffer.from(value.account.data[0], 'base64');
                    const rawAccountData = data.slice(8);  // Skip discriminator
                    
                    const layout = struct([
                        u64('virtualTokenReserves'),
                        u64('virtualSolReserves'),
                        u64('realTokenReserves'),
                        u64('realSolReserves'),
                        u64('tokenTotalSupply'),
                        bool('complete'),
                    ]);

                    const accountData = layout.decode(rawAccountData);
                    
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
                        rent_epoch: value.account.rentEpoch,
                        space: value.account.space,
                        executable: value.account.executable,
                        timestamp: new Date(),
                    };

                    if (pumpAccount.balance_sol >= 10) {
                        accountBatch.push(pumpAccount);
                        logger.debug(`Added account to batch. Current batch size: ${accountBatch.length}`);
                        
                        if (accountBatch.length >= 50) {
                            logger.info(`Batch size reached ${accountBatch.length}, triggering insert...`);
                            try {
                                await insertPumpAccounts(accountBatch);
                                logger.info(`Successfully processed batch of ${accountBatch.length} accounts`);
                                accountBatch = [];
                            } catch (error) {
                                logger.error('Failed to process batch:', error);
                            }
                        }
                    } else {
                        logger.debug(`Skipping account due to low balance: ${pumpAccount.balance_sol} SOL`);
                    }

                    logger.debug(`Account processing time: ${(performance.now() - accountStart).toFixed(2)}ms`);
                    
                } catch (e) {
                    logger.error(`Error processing account ${value?.pubkey || 'unknown'}:`, e);
                }
            });

            // Handle pipeline completion
            await new Promise((resolve, reject) => {
                pipeline.on('end', async () => {
                    try {
                        // Process any remaining accounts
                        if (accountBatch.length > 0) {
                            await insertPumpAccounts(accountBatch);
                            logger.info(`Processed final batch of ${accountBatch.length} accounts`);
                        }
                        
                        logger.info(`Total accounts processed: ${accountCount}`);
                        logger.info(`Total execution time: ${(performance.now() - startTime).toFixed(2)}ms`);
                        resolve(null);
                    } catch (error) {
                        reject(error);
                    }
                });
                pipeline.on('error', reject);
            });

        } catch (error) {
            logger.error('Error fetching accounts:', error);
            throw error; // Propagate the error to be handled by the caller
        }

    } catch (error) {
        logger.error('Error fetching accounts:', error);
        throw error; // Propagate the error to be handled by the caller
    }
}

// Update the script execution to handle process termination
process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal. Closing database pool...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal. Closing database pool...');
    await pool.end();
    process.exit(0);
});

// Update the script execution
runPumpAccountsFetcher()
    .catch(err => {
        const logger = new Logger('getAccountsOwnedPump');
        logger.error('Fatal error in main loop:', err);
        process.exit(1);
    });
