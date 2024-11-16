// src/tests/price_ws.AmmPool.test.ts

import { redisSubscriber,redisPublisher } from '../../utils/utils';
import { market_RaydiumPriceUpdate } from '../../../utils/interfaces';

// Function to publish a subscription message
async function subscribeToPool(poolId: string): Promise<void> {
  const subscriptionMessage = JSON.stringify({ poolId });
  try {
    await redisPublisher.publish('RaydiumPoolSubscriptions', subscriptionMessage);
    console.log(`Subscribed to Pool ID: ${poolId}`);
  } catch (error) {
    console.error(`Failed to subscribe to Pool ID: ${poolId}. Error: ${error}`);
  }
}

// Function to listen to pool updates
function listenToRaydiumPoolUpdates(): void {
  redisSubscriber.subscribe('RaydiumPoolUpdates', (err, count) => {
    if (err) {
      console.error('Failed to subscribe to RaydiumPoolUpdates channel:', err);
      process.exit(1);
    }
    console.log(`Listening for pool updates on 'RaydiumPoolUpdates' channel...`);
  });

  redisSubscriber.on('message', (channel, message) => {
    if (channel === 'RaydiumPoolUpdates') {
      try {
        // const update = JSON.parse(message);
        // console.log('Received Pool Update:', update);
        const update: market_RaydiumPriceUpdate = JSON.parse(message);
        console.log(update); 
      } catch (error) {
        console.error('Failed to parse pool update message:', message);
      }
    }
  });
}

// Main function to execute the test script
async function main() {

  // const poolId = args[0];
  const poolId = 'F9pQ3Lx33yd29CnEjSTkjwukrHtTUNe2qZD1ZkD86f4X' // SOL / USDC pool for example
  // const poolId2 = '9Tb2ohu5P16BpBarqd3N27WnkF51Ukfs8Z1GzzLDxVZW'
  // Start listening to pool updates
  listenToRaydiumPoolUpdates();

  // Subscribe to the specified pool
  await subscribeToPool(poolId);
    // Subscribe to the specified pool
  // await subscribeToPool(poolId2);
}

// Execute the main function
main().catch((error) => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});
