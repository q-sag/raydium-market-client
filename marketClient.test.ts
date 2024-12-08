// marketClient.test.ts


//* IMPORTANT: Make sure to set the correct environment variables in the .env file before running the tests.
//* Current code is set up for WIF/SOL pool on Raydium and any active token from pump.fun.
//* Make sure to update the testPoolId, testMint, and testTokenMint variables with desired values.
//* First run the server through ts-node app.ts, then run the tests in separate terminals.
//*  Make sure to replace public RPC URL in utils.ts with private ones for best performance.
//* NOTE : Pump Price update can take time as it depends on transactions from pump.fun. Low liquidity pools might not update at all.

import { MarketClient } from './market/apiClient'; // Adjust the path as necessary
import Logger from './market/utils/logger'; // Adjust the path as necessary

// Initialize Logger
const logger = new Logger('MarketClientTest');

// Hardcoded account addresses for testing
const testPoolId = 'EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx';  // RAYDIUM POOL ID || WIF/SOL pool in this case
const testMint = '4gaFmTcPiDzH6iGF57BbRi2ZXG7yLqUXh1hFHuZXpump';  // PUMP TOKEN MINT || Put any active token from pump.fun in this case
const testTradeId = 'InternalTradeId123'; 

// Initialize MarketClient
const marketClient = new MarketClient();

// Function to test getRaydiumPoolData
async function testGetRaydiumPoolData() {
    logger.info('Testing Raydium Pool Data...');
  try {
    const poolData = await marketClient.getRaydiumPoolData(testPoolId);
    logger.info('Raydium Pool Data:', poolData);
  } catch (error) {
    logger.error('Error fetching Raydium Pool Data:', error);
  }
}

// Function to test getPumpTokenPrice
async function testGetPumpTokenPrice() {
  try {
    const priceData = await marketClient.getPumpTokenPrice(testMint);
    logger.info('Pump Token Price:', priceData);
  } catch (error) {
    logger.error('Error fetching Pump Token Price:', error);
  }
}

// Function to test getTokenMetadata
async function testGetTokenMetadata() {
    logger.info('Testing Token Metadata...');
  try {
    const metadata = await marketClient.getTokenMetadata(testMint);
    logger.info('Token Metadata:', metadata);
  } catch (error) {
    logger.error('Error fetching Token Metadata:', error);
  }
}

// Function to test WebSocket connections
function testWebSocketConnections() {
  // Test Raydium WebSocket
  const raydiumPriceUpdates = marketClient.getRaydiumPriceUpdates(testPoolId);
  let raydiumUpdateCount = 0;
  
  raydiumPriceUpdates.on('data', (data) => {
    logger.info('Raydium Price Update:', data);
    raydiumUpdateCount++;
    if (raydiumUpdateCount >= 3) {
      logger.info('Closing Raydium WebSocket after 3 updates');
      raydiumPriceUpdates.emit('closeConnection');
    }
  });

  // Test Pump WebSocket
  const pumpPriceUpdates = marketClient.getPumpPriceUpdates(testMint, testTradeId);
  let pumpUpdateCount = 0;
  
  pumpPriceUpdates.on('data', (data) => {
    logger.info('Pump Price Update:', data);
    pumpUpdateCount++;
    if (pumpUpdateCount >= 3) {
      logger.info('Closing Pump WebSocket after 3 updates');
      pumpPriceUpdates.emit('closeConnection');
    }
  });

  // Test Pump Migration Events WebSocket
  const pumpMigrationEvents = marketClient.getPumpMigrationEvents();
  let migrationUpdateCount = 0;

  pumpMigrationEvents.on('open', () => {
    logger.info('Migration WebSocket connected, starting data stream...');
    pumpMigrationEvents.emit('start');
  });

  pumpMigrationEvents.on('data', (data) => {
    logger.info('Pump Migration Event:', data);
    migrationUpdateCount++;
    if (migrationUpdateCount >= 3) {
      logger.info('Closing Pump Migration WebSocket after 3 updates');
      pumpMigrationEvents.emit('closeConnection');
    }
  });

  pumpMigrationEvents.on('error', (error) => {
    logger.error('Pump Migration Event Error:', error);
  });
}

// Main function to run all tests
async function main() {
  try {
    logger.info('Starting MarketClient tests...');
    
    logger.info('Testing Raydium Pool Data...');
    await testGetRaydiumPoolData();
    
    logger.info('Testing Pump Token Price...');
    await testGetPumpTokenPrice();
    
    logger.info('Testing Token Metadata...');
    await testGetTokenMetadata();
    
    logger.info('Testing WebSocket Connections...');
    testWebSocketConnections();
    
    logger.info('MarketClient tests completed.');
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Unhandled error in MarketClient tests:', {
      message: err.message,
      stack: err.stack,
      error: err
    });
    process.exit(1);
  }
}

// Execute the main function
main().catch((error: unknown) => {
  const err = error as Error;
  logger.error('Fatal error in test execution:', {
    message: err.message,
    stack: err.stack,
    error: err
  });
  process.exit(1);
});