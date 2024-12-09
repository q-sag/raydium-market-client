import { Connection, PublicKey } from "@solana/web3.js";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import Logger from '../../utils/logger';

dotenv.config();

interface TransactionRecord {
    signature: string;
    timestamp: number;
    provider: string;
    isError: boolean;
}

interface ProviderStats {
    successCount: number;
    errorCount: number;
    startTime: Date;
    transactions: Set<string>;
}

class WebSocketMonitor {
    private providers: Map<string, ProviderStats> = new Map();
    private allTransactions: Map<string, TransactionRecord> = new Map();
    private unmatchedEvents: Map<string, { withdraw?: string, add?: string }> = new Map();
    private readonly TIMEOUT_MINUTES = 30;
    private readonly logDir: string;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('WebSocketMonitor');
        this.logDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir);
        }
    }

    private initializeProvider(provider: string) {
        this.providers.set(provider, {
            successCount: 0,
            errorCount: 0,
            startTime: new Date(),
            transactions: new Set()
        });
    }

    async startMonitoring() {
        const publicKey = new PublicKey("39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg");

        // Initialize connections for different providers
        const connections = {
            'Quicknode': new Connection(
                process.env.RPC_URL || "",
                {
                    wsEndpoint: process.env.RPC_WSS || "",
                    commitment: "processed"
                }
            ),
            'Helius': new Connection(
                process.env.RPC_URL || "",
                {
                    wsEndpoint: "wss://mainnet.helius-rpc.com/?api-key=8a63856f-9567-44a9-b740-3bf4b072c9de",
                    commitment: "processed"
                }
            )
        };

        // Initialize provider stats
        Object.keys(connections).forEach(provider => this.initializeProvider(provider));

        // Start monitoring for each provider
        for (const [provider, connection] of Object.entries(connections)) {
            this.subscribeToLogs(connection, publicKey, provider);
        }

        // Start periodic checks
        this.startPeriodicChecks();
        this.handleGracefulShutdown();
    }

    private subscribeToLogs(connection: Connection, publicKey: PublicKey, provider: string) {
        const subscriptionId = connection.onLogs(
            publicKey,
            (logs, ctx) => {
                this.handleLog(logs, provider);
                this.checkForMigrationEvents(logs, provider);
            },
            "confirmed"
        );

        this.logger.info(`${provider} subscription started with ID: ${subscriptionId}`);
    }

    private handleLog(logs: any, provider: string) {
        const stats = this.providers.get(provider)!;
        const signature = logs.signature;

        if (logs.err) {
            stats.errorCount++;
            this.logger.error(`Error in transaction for ${provider}:`, logs.err);
        } else {
            stats.successCount++;
            this.logger.debug(`Successful transaction for ${provider}: ${signature}`);
        }

        stats.transactions.add(signature);

        // Record transaction for cross-provider comparison
        this.allTransactions.set(signature, {
            signature,
            timestamp: Date.now(),
            provider,
            isError: !!logs.err
        });

        this.logStats(provider);
    }

    private checkForMigrationEvents(logs: any, provider: string) {
        const signature = logs.signature;
        const logStrings = logs.logs;

        const hasWithdraw = logStrings.some((log: string) => log.includes("Withdraw"));
        const hasAdd = logStrings.some((log: string) => log.includes("MintTo"));

        if (hasWithdraw || hasAdd) {
            let event = this.unmatchedEvents.get(signature) || {};
            
            if (hasWithdraw) {
                event.withdraw = provider;
                this.logger.debug(`Withdraw event detected from ${provider}: ${signature}`);
            }
            if (hasAdd) {
                event.add = provider;
                this.logger.debug(`Add event detected from ${provider}: ${signature}`);
            }

            this.unmatchedEvents.set(signature, event);
        }
    }

    private startPeriodicChecks() {
        // Check for missed transactions and unmatched events every 5 minutes
        setInterval(() => {
            this.checkMissedTransactions();
            this.checkUnmatchedEvents();
        }, 5 * 60 * 1000);
    }

    private checkMissedTransactions() {
        const providers = Array.from(this.providers.keys());
        const missedTransactions = new Map<string, string[]>();

        // Compare transactions across providers
        for (const [signature, record] of this.allTransactions) {
            const missingIn = providers.filter(provider => 
                !this.providers.get(provider)!.transactions.has(signature)
            );

            if (missingIn.length > 0) {
                missedTransactions.set(signature, missingIn);
            }
        }

        // Log missed transactions
        if (missedTransactions.size > 0) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                missedTransactions: Array.from(missedTransactions.entries()).map(([sig, providers]) => ({
                    signature: sig,
                    missingInProviders: providers
                }))
            };

            this.logger.warn('Missed transactions detected:', logEntry);
            fs.appendFileSync(
                path.join(this.logDir, 'missed_transactions.log'),
                JSON.stringify(logEntry) + '\n'
            );
        }
    }

    private checkUnmatchedEvents() {
        const now = Date.now();
        const timeoutMs = this.TIMEOUT_MINUTES * 60 * 1000;

        for (const [signature, events] of this.unmatchedEvents.entries()) {
            const record = this.allTransactions.get(signature);
            if (!record) continue;

            if (now - record.timestamp > timeoutMs) {
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    signature,
                    events,
                    provider: record.provider
                };

                this.logger.warn('Unmatched migration event detected:', logEntry);
                fs.appendFileSync(
                    path.join(this.logDir, 'unmatched_migrations.log'),
                    JSON.stringify(logEntry) + '\n'
                );

                this.unmatchedEvents.delete(signature);
            }
        }
    }

    private logStats(provider: string) {
        const stats = this.providers.get(provider)!;
        const runningTime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
        
        const statsMessage = {
            provider,
            runningTime: `${runningTime} seconds`,
            successCount: stats.successCount,
            successRate: `${(stats.successCount/runningTime).toFixed(2)}/sec`,
            errorCount: stats.errorCount,
            errorRate: `${(stats.errorCount/runningTime).toFixed(2)}/sec`,
            totalTransactions: stats.successCount + stats.errorCount,
            totalRate: `${((stats.successCount + stats.errorCount)/runningTime).toFixed(2)}/sec`
        };

        this.logger.info('Provider Stats:', statsMessage);
    }

    private handleGracefulShutdown() {
        process.on('SIGINT', () => {
            this.logger.info('Shutting down...');
            
            // Log final stats for each provider
            for (const [provider, stats] of this.providers.entries()) {
                const runningTime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
                const finalStats = {
                    provider,
                    totalRunningTime: `${runningTime} seconds`,
                    successfulTransactions: stats.successCount,
                    errorTransactions: stats.errorCount,
                    totalTransactions: stats.successCount + stats.errorCount
                };
                
                this.logger.info('Final Stats:', finalStats);
            }

            // Log any remaining unmatched events
            this.checkUnmatchedEvents();
            
            process.exit(0);
        });
    }
}

// Run the monitor
const monitor = new WebSocketMonitor();
monitor.startMonitoring().catch(err => {
    const logger = new Logger('WebSocketMonitor');
    logger.error('Error in WebSocket monitor:', err);
    process.exit(1);
}); 