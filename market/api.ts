// api.ts

import express from 'express';
import expressWs from 'express-ws';
import bodyParser from 'body-parser';
import cors from 'cors';
import { fetchRaydiumPoolData } from './fetch/raydium_fetchPoolData';
import { getPricingData } from './fetch/pump_fetchPrice';
import { getTokenMetadata } from './fetch/tokenMetadata';
import Logger from './utils/logger';
import {
  RAYDIUM_SUBSCRIPTIONS_CHANNEL,
  RAYDIUM_UNSUBSCRIBE_CHANNEL,
  pump_SUBSCRIPTIONS_CHANNEL,
  pump_UNSUBSCRIPTIONS_CHANNEL,
  pump_MIGRATION_SUBSCRIBE,
  pump_MIGRATION_ALL,
  redisPublisher,
  redisSubscriber,
} from './utils/utils';
import WebSocket from 'ws'; // Use default import for WebSocket
import dotenv from 'dotenv';
import { Connection } from '@solana/web3.js';
import { fetchMintByPool } from './fetch/pump_fetchMintByPool';
dotenv.config();

// Initialize Express and Express WebSocket
const appBase = express();
const wsInstance = expressWs(appBase);
const app = wsInstance.app;

const logger = new Logger('ApiMarket');

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Data structures to manage connected clients
interface Client {
  ws: WebSocket; // Use the correct WebSocket type
  identifier?: string;
  isActive?: boolean; // Added isActive property for migration clients
}

const raydiumClients: Client[] = [];
const pumpPriceClients: Client[] = [];
const pumpMigrationClients: Set<Client> = new Set();

// Subscribe to Redis channels once at startup
redisSubscriber.subscribe('RaydiumPriceUpdates', (err, count) => {
  if (err) {
    logger.error(`Failed to subscribe to RaydiumPriceUpdates: ${err}`);
    return;
  }
  logger.info(`Subscribed to RaydiumPriceUpdates channel`);
});

redisSubscriber.subscribe('PumpPriceUpdates', (err, count) => {
  if (err) {
    logger.error(`Failed to subscribe to PumpPriceUpdates: ${err}`);
    return;
  }
  logger.info(`Subscribed to PumpPriceUpdates channel`);
});

redisSubscriber.subscribe(pump_MIGRATION_ALL, (err, count) => {
  if (err) {
    logger.error(`Failed to subscribe to ${pump_MIGRATION_ALL}: ${err}`);
    return;
  }
  logger.info(`Subscribed to ${pump_MIGRATION_ALL} channel`);
});

// Handle incoming messages from Redis and distribute to relevant clients
redisSubscriber.on('message', (channel, message) => {
  if (channel === 'RaydiumPriceUpdates') {
    const data = JSON.parse(message);
    const poolId = data.poolID;
    raydiumClients.forEach(client => {
      if (client.identifier === poolId) {
        client.ws.send(JSON.stringify(data));
      }
    });
  } else if (channel === 'PumpPriceUpdates') {
    const data = JSON.parse(message);
    const trade_id = data.trade_id;
    pumpPriceClients.forEach(client => {
      if (client.identifier === trade_id) {
        client.ws.send(JSON.stringify(data));
      }
    });
  } else if (channel === pump_MIGRATION_SUBSCRIBE) {
    // Send to all clients who have isActive set to true
    pumpMigrationClients.forEach(client => {
      if (client.isActive) {
        client.ws.send(message); // Message is already a JSON string
      }
    });
  } else if (channel === pump_MIGRATION_ALL) {
    // Send to all clients who have isActive set to true
    pumpMigrationClients.forEach(client => {
      if (client.isActive) {
        client.ws.send(message); // Message is already a JSON string
      }
    });
  }
});

// Endpoint: /data/raydium
app.get('/data/raydium', async (req, res) => {
  const poolId = req.query.poolId as string;

  if (!poolId) {
    res.status(400).json({ error: 'Missing poolId parameter.' });
    return;
  }

  try {
    const poolData = await fetchRaydiumPoolData(poolId);
    res.json(poolData);
  } catch (error) {
    logger.error(`Error fetching Raydium pool data: ${error}`);
    res.status(500).json({ error: 'Failed to fetch Raydium pool data.' });
  }
});

// Endpoint: /data/pump-price
app.get('/data/pump-price', async (req, res) => {
  const mint = req.query.mint as string;

  if (!mint) {
    res.status(400).json({ error: 'Missing mint parameter.' });
    return;
  }

  try {
    const priceData = await getPricingData(mint);
    res.json(priceData);
  } catch (error) {
    logger.error(`Error fetching Raydium pool data: ${error}`);
    res.status(500).json({ error: 'Failed to fetch Raydium pool data.' });
  }
});


// Endpoint: /data/metadata
app.get('/data/metadata', async (req, res) => {
  const mint = req.query.mint as string;

  if (!mint) {
    res.status(400).json({ error: 'Missing mint parameter.' });
    return;
  }

  try {
    const metadata = await getTokenMetadata(mint);
    res.json(metadata);
  } catch (error) {
    logger.error(`Error fetching Raydium pool data: ${error}`);
    res.status(500).json({ error: 'Failed to fetch Raydium pool data.' });
  }
});

// WebSocket endpoint: /price/raydium
app.ws('/price/raydium', (ws: WebSocket, req) => {
  const poolId = req.query.poolId as string;

  if (!poolId) {
    ws.send(JSON.stringify({ error: 'Missing poolId parameter.' }));
    ws.close();
    return;
  }

  logger.info(`WebSocket connection established for /price/raydium with poolId: ${poolId}`);

  // Publish subscription message
  const subscriptionMessage = JSON.stringify({ poolId });
  redisPublisher.publish(RAYDIUM_SUBSCRIPTIONS_CHANNEL, subscriptionMessage);

  // Add client to raydiumClients
  const client: Client = { ws, identifier: poolId };
  raydiumClients.push(client);

  ws.on('close', () => {
    logger.info(`WebSocket connection closed for /price/raydium with poolId: ${poolId}`);

    // Publish unsubscription message
    const unsubscriptionMessage = JSON.stringify({ poolId });
    redisPublisher.publish(RAYDIUM_UNSUBSCRIBE_CHANNEL, unsubscriptionMessage);

    // Remove client from raydiumClients
    raydiumClients.splice(raydiumClients.indexOf(client), 1);
  });

  ws.on('error', (error) => {
    logger.error(`WebSocket error: ${error}`);
  });
});

// WebSocket endpoint: /price/pump
app.ws('/price/pump', (ws: WebSocket, req) => {
  const tokenMint = req.query.tokenMint as string;
  const trade_id = req.query.trade_id as string;

  if (!tokenMint || !trade_id) {
    ws.send(JSON.stringify({ error: 'Missing tokenMint or trade_id parameter.' }));
    ws.close();
    return;
  }

  logger.info(`WebSocket connection established for /price/pump with trade_id: ${trade_id}`);

  // Publish subscription message
  const subscriptionMessage = JSON.stringify({ tokenMint, trade_id });
  redisPublisher.publish(pump_SUBSCRIPTIONS_CHANNEL, subscriptionMessage);

  // Add client to pumpPriceClients
  const client: Client = { ws, identifier: trade_id };
  pumpPriceClients.push(client);

  ws.on('close', () => {
    logger.info(`WebSocket connection closed for /price/pump with trade_id: ${trade_id}`);

    // Publish unsubscription message
    const unsubscriptionMessage = JSON.stringify({ tokenMint, trade_id });
    redisPublisher.publish(pump_UNSUBSCRIPTIONS_CHANNEL, unsubscriptionMessage);

    // Remove client from pumpPriceClients
    pumpPriceClients.splice(pumpPriceClients.indexOf(client), 1);
  });

  ws.on('error', (error) => {
    logger.error(`WebSocket error: ${error}`);
  });
});

// WebSocket endpoint: /data/pump/migration
app.ws('/data/pump/migration', (ws: WebSocket, req) => {
  logger.info(`WebSocket connection established for /data/pump/migration`);

  const client: Client = { ws, isActive: false };
  pumpMigrationClients.add(client);

  ws.on('message', (msg: string) => {
    const message = msg.trim().toLowerCase();
    if (message === 'start') {
      client.isActive = true;
      logger.info(`Client activated data stream for /data/pump/migration`);
    } else if (message === 'stop') {
      client.isActive = false;
      logger.info(`Client deactivated data stream for /data/pump/migration`);
    } else {
      logger.warn(`Received unknown message from client: ${message}`);
      ws.send(JSON.stringify({ error: 'Unknown command. Use "start" or "stop".' }));
    }
  });

  ws.on('close', () => {
    logger.info(`WebSocket connection closed for /data/pump/migration`);
    pumpMigrationClients.delete(client);
  });

  ws.on('error', (error) => {
    logger.error(`WebSocket error: ${error}`);
  });
});

// Endpoint: /get/MintByOwner
app.get('/get/MintByOwner', async (req, res) => {
  const owner = req.query.owner as string;

  if (!owner) {
    logger.error('Missing owner parameter');
    res.status(400).json({ error: 'Missing owner parameter.' });
    return;
  }

  try {
    const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
        
    const connection = new Connection(RPC_URL, 'confirmed');
    logger.info(`Attempting to fetch token accounts for owner: ${owner}`);

    const tokenAccounts = await fetchMintByPool(connection, owner);
    
    // Safely stringify the response
    const safeResponse = {
      success: tokenAccounts.success,
      tokenAccounts: tokenAccounts.tokenAccounts,
      error: tokenAccounts.error
    };
    
    logger.info(`Fetch result: ${JSON.stringify(safeResponse, null, 2)}`);

    if (tokenAccounts.success) {
      res.json(safeResponse);
    } else {
      logger.error(`Failed to fetch token accounts: ${tokenAccounts.error}`);
      res.status(500).json({
        success: false,
        error: tokenAccounts.error || 'Failed to fetch token accounts'
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Error in /get/MintByOwner endpoint:`, error);
    logger.error(`Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage
    });
  }
});

// Start the server
const PORT = Number(process.env.MARKET_API_PORT) || 3001;
app.listen(PORT, () => {
  logger.info(`API server is listening on port ${PORT}`);
});
