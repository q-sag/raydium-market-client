// MarketClient.ts

import axios from 'axios';
import WebSocket from 'ws';
import EventEmitter from 'events';
import Logger from './utils/logger';
import {market_PumpMigrationEvent, market_PumpPriceUpdates, market_PumpPriceFetch, market_RaydiumPoolData,market_RaydiumPriceUpdate, market_TokenAccountInfo} from './utils/interfaces'

import dotenv from 'dotenv';
import { market_TokenMetadata } from './utils/interfaces';

dotenv.config();

// Initialize Logger
const logger = new Logger('MarketClient');

const MARKET_API_PORT = process.env.MARKET_API_PORT || '3001';
const DEFAULT_API_BASE_URL = `http://localhost:${MARKET_API_PORT}`;


export class MarketClient {
  private apiBaseUrl: string;
  private logger: Logger;

  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || process.env.API_BASE_URL || DEFAULT_API_BASE_URL;
    this.logger = new Logger('MarketClient');
  }

  // Method to get Raydium pool data
  public async getRaydiumPoolData(poolId: string): Promise<market_RaydiumPoolData> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/data/raydium`, {
        params: { poolId },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching Raydium pool data: ${error}`);
      throw error;
    }
  }

  // Method to get Pump token price 
  public async getPumpTokenPrice(mint: string): Promise<market_PumpPriceFetch> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/data/pump-price`, {
        params: { mint },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching Pump token price: ${error}`);
      throw error;
    }
  }
  
  // Method to get Token Metadata
  public async getTokenMetadata(mint: string): Promise<market_TokenMetadata> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/data/metadata`, {
        params: { mint },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching Token Metadata: ${error}`);
      throw error;
    }
  }  

  // Method to get Raydium price updates
  public getRaydiumPriceUpdates(poolId: string): EventEmitter {
    const eventEmitter = new EventEmitter();

    const wsUrl = `${this.apiBaseUrl.replace(/^http/, 'ws')}/price/raydium?poolId=${poolId}`;
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      this.logger.info(`WebSocket connection opened for Raydium price updates on poolId: ${poolId}`);
    });

    ws.on('message', (data: string) => {
      try {
        const update: market_RaydiumPriceUpdate = JSON.parse(data);
        eventEmitter.emit('data', update);
      } catch (error) {
        this.logger.error(`Error parsing message: ${error}`);
        eventEmitter.emit('error', error);
      }
    });

    ws.on('close', () => {
      this.logger.info(`WebSocket connection closed for Raydium price updates on poolId: ${poolId}`);
      eventEmitter.emit('close');
    });

    ws.on('error', (error) => {
      this.logger.error(`WebSocket error: ${error}`);
      eventEmitter.emit('error', error);
    });

    // Provide a method to close the connection
    eventEmitter.on('closeConnection', () => {
      ws.close();
    });

    return eventEmitter;
  }

  // Method to get Pump price updates
  public getPumpPriceUpdates(tokenMint: string, trade_id: string): EventEmitter {
    const eventEmitter = new EventEmitter();

    const wsUrl = `${this.apiBaseUrl.replace(/^http/, 'ws')}/price/pump?tokenMint=${tokenMint}&trade_id=${trade_id}`;
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      this.logger.info(`WebSocket connection opened for Pump price updates on trade_id: ${trade_id}`);
    });

    ws.on('message', (data: string) => {
      try {
        const update: market_PumpPriceUpdates = JSON.parse(data);
        eventEmitter.emit('data', update);
      } catch (error) {
        this.logger.error(`Error parsing message: ${error}`);
        eventEmitter.emit('error', error);
      }
    });

    ws.on('close', () => {
      this.logger.info(`WebSocket connection closed for Pump price updates on trade_id: ${trade_id}`);
      eventEmitter.emit('close');
    });

    ws.on('error', (error) => {
      this.logger.error(`WebSocket error: ${error}`);
      eventEmitter.emit('error', error);
    });

    // Provide a method to close the connection
    eventEmitter.on('closeConnection', () => {
      ws.close();
    });

    return eventEmitter;
  }

  // Method to get Pump migration events
  public getPumpMigrationEvents(): EventEmitter {
    const eventEmitter = new EventEmitter();

    const wsUrl = `${this.apiBaseUrl.replace(/^http/, 'ws')}/data/pump/migration`;
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      this.logger.info(`WebSocket connection opened for Pump migration events`);
      // Send 'start' message to activate data stream
      ws.send('start');
    });

    ws.on('message', (data: string) => {
      try {
        logger.info(`MIGRATION UPDATE`)
        const event: market_PumpMigrationEvent = JSON.parse(data);
        eventEmitter.emit('data', event);
      } catch (error) {
        this.logger.error(`Error parsing message: ${error}`);
        eventEmitter.emit('error', error);
      }
    });

    ws.on('close', () => {
      this.logger.info(`WebSocket connection closed for Pump migration events`);
      eventEmitter.emit('close');
    });

    ws.on('error', (error) => {
      this.logger.error(`WebSocket error: ${error}`);
      eventEmitter.emit('error', error);
    });

    // Provide methods to start and stop the data stream
    eventEmitter.on('start', () => {
      ws.send('start');
    });

    eventEmitter.on('stop', () => {
      ws.send('stop');
    });

    // Provide a method to close the connection
    eventEmitter.on('closeConnection', () => {
      ws.close();
    });

    return eventEmitter;
  }

  // Method to fetch token accounts by owner
  public async getMintsByOwner(owner: string): Promise<{
    success: boolean;
    tokenAccounts?: market_TokenAccountInfo[];
    error?: string;
  }> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/get/MintByOwner`, {
        params: { owner },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching token accounts for owner ${owner}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
