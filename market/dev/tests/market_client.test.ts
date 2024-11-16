// exampleUsage.ts

import { MarketClient } from '../../apiClient';
import { market_RaydiumPoolData, market_RaydiumPriceUpdate, market_PumpPriceUpdates, market_PumpMigrationEvent } from '../../../utils/interfaces';
import Logger from '../../../utils/logger';

const logger = new Logger(`market_client.test`)
// Create an instance of the ApiClient
const apiClient = new MarketClient();

// Replace these with actual values
const poolId = '7Qdm4NvoQ4LAjqmkXLZaBF5ceqs3iY4eYZzAjxYhwiQB';       // Replace with actual pool ID
const tokenMint = '2F34wPSGv9xcwZuBUANBHvDzDjFqRbuAYYXGH413pump'; // Replace with actual token mint
const trade_id = 'Market-Test';    // Replace with actual trade ID

// // Fetch Raydium Pool Data
// apiClient.getRaydiumPoolData(poolId)
//   .then((data: market_RaydiumPoolData) => {
//     logger.info('Pool Data:', data);
//   })
//   .catch((error) => {
//     logger.error('Error fetching pool data:', error);
//   });

// Subscribe to Raydium Price Updates
const raydiumPriceEmitter = apiClient.getRaydiumPriceUpdates(poolId);
raydiumPriceEmitter.on('data', (update: market_RaydiumPriceUpdate) => {
  logger.info('Raydium Price Update:', update);
});
raydiumPriceEmitter.on('error', (error) => {
  logger.error('Error:', error);
});

// Close the connection after 3 minutes (180,000 milliseconds)
setTimeout(() => {
  logger.info('Closing Raydium Price Updates WebSocket after 3 minutes.');
  raydiumPriceEmitter.emit('closeConnection');
}, 180000); // 3 minutes in milliseconds

// // Subscribe to Pump Price Updates
// const pumpPriceEmitter = apiClient.getPumpPriceUpdates(tokenMint, trade_id);
// pumpPriceEmitter.on('data', (update: market_PumpPriceUpdates) => {
//   logger.info('Pump Price Update:', update);
// });
// pumpPriceEmitter.on('error', (error) => {
//   logger.error('Error:', error);
// });

// // Close the connection after 3 minutes
// setTimeout(() => {
//   logger.info('Closing Pump Price Updates WebSocket after 3 minutes.');
//   pumpPriceEmitter.emit('closeConnection');
// }, 180000); // 3 minutes in milliseconds

// // Subscribe to Pump Migration Events
// const migrationEmitter = apiClient.getPumpMigrationEvents();
// migrationEmitter.on('data', (event: market_PumpMigrationEvent) => {
//   logger.info('Migration Event:', event);
// });
// migrationEmitter.on('error', (error) => {
//   logger.error('Error:', error);
// });

// // Close the connection after 3 minutes
// setTimeout(() => {
//   logger.info('Closing Pump Migration Events WebSocket after 3 minutes.');
//   migrationEmitter.emit('closeConnection');
// }, 180000); // 3 minutes in milliseconds

// // Optional: Stop the data stream before closing
// setTimeout(() => {
//   logger.info('Stopping data stream for Pump Migration Events.');
//   migrationEmitter.emit('stop');
// }, 3*170000); // Stop data stream after 2 minutes and 50 seconds

// Optional: Exit the process after all connections are closed
setTimeout(() => {
  logger.info('All WebSocket connections closed. Exiting process.');
  process.exit(0);
}, 3*185000); // Slightly after 3 minutes to ensure all connections are closed