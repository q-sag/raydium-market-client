# API and API Client Documentation

## Introduction

This documentation provides an overview of the API and the accompanying API client designed to interact with Solana blockchain data, specifically focusing on Raydium pool data, price updates, and pump migration events. The API exposes RESTful and WebSocket endpoints, while the API client offers convenient methods to interact with these endpoints programmatically.

---

## API Documentation

to run use :

ts-node src/market/app.ts

To use api methods copy apiClient.ts to your project and import MarketClient class
### Overview

The API provides the following endpoints:

- **REST Endpoint:**
  - `/data/raydium` - Fetches Raydium pool data.
- **WebSocket Endpoints:**
  - `/price/raydium` - Subscribes to Raydium price updates.
  - `/price/pump` - Subscribes to Pump price updates.
  - `/data/pump/migration` - Subscribes to Pump migration events.

### Base URL

The base URL for the API is:

```
http://localhost:3000
```

---

### REST Endpoint: `/data/raydium`

#### Description

Fetches data for a specific Raydium pool.

#### HTTP Method

`GET`

#### Endpoint

```
/data/raydium
```

#### Query Parameters

- `poolId` (string, required): The identifier of the Raydium pool.

#### Response Format

- **Success (200):** Returns a JSON object containing the pool data.
- **Error (400):** Missing `poolId` parameter.
- **Error (500):** Failed to fetch Raydium pool data.

#### Example Request

```http
GET /data/raydium?poolId=YourPoolIdHere HTTP/1.1
Host: localhost:3000
```

#### Example Response

```json
{
  "poolId": "YourPoolIdHere",
  "liquidity": 123456.78,
  "volume": 987654.32,
  "otherData": "..."
}
```

---

### WebSocket Endpoint: `/price/raydium`

#### Description

Subscribes to real-time price updates for a specific Raydium pool.

#### Endpoint

```
/price/raydium
```

#### Query Parameters

- `poolId` (string, required): The identifier of the Raydium pool.

#### Connection Procedure

1. Establish a WebSocket connection to `/price/raydium` with the `poolId` query parameter.
2. The server will start sending price updates for the specified pool.

#### Example Connection URL

```
ws://localhost:3000/price/raydium?poolId=YourPoolIdHere
```

#### Message Format

- **Price Updates:** JSON-formatted messages containing the latest price data.

#### Example Message

```json
{
  "poolId": "YourPoolIdHere",
  "price": 1.2345,
  "timestamp": "2023-10-19T12:34:56Z",
  "otherData": "..."
}
```

---

### WebSocket Endpoint: `/price/pump`

#### Description

Subscribes to real-time price updates for a specific token in the Pump program.

#### Endpoint

```
/price/pump
```

#### Query Parameters

- `tokenMint` (string, required): The token mint address.
- `trade_id` (string, required): The trade identifier.

#### Connection Procedure

1. Establish a WebSocket connection to `/price/pump` with the `tokenMint` and `trade_id` query parameters.
2. The server will start sending price updates for the specified token and trade ID.

#### Example Connection URL

```
ws://localhost:3000/price/pump?tokenMint=YourTokenMintHere&trade_id=YourTradeIdHere
```

#### Message Format

- **Price Updates:** JSON-formatted messages containing the latest price data.

#### Example Message

```json
{
  "trade_id": "YourTradeIdHere",
  "tokenMint": "YourTokenMintHere",
  "price": 0.9876,
  "timestamp": "2023-10-19T12:34:56Z",
  "otherData": "..."
}
```

---

### WebSocket Endpoint: `/data/pump/migration`

#### Description

Subscribes to real-time pump migration events. This endpoint streams updates related to migration events occurring within the pump program.

#### Endpoint

```
/data/pump/migration
```

#### Connection Procedure

1. Establish a WebSocket connection to `/data/pump/migration`.
2. Send a `'start'` message to activate the data stream.
3. The server will start sending migration events.
4. Send a `'stop'` message to deactivate the data stream without closing the connection.
5. Close the WebSocket connection when done.

#### Example Connection URL

```
ws://localhost:3000/data/pump/migration
```

#### Activation Messages

- **Start Data Stream:** Send `'start'`.
- **Stop Data Stream:** Send `'stop'`.

#### Message Format

- **Migration Events:** JSON-formatted messages containing migration event data.

#### Example Message

```json
{
  "timestamp": "2023-10-19T12:34:56Z",
  "token": "TokenMintAddress",
  "status": "add", // or "withdraw"
  "poolId": "PoolIdIfAvailable"
}
```

---

## API Client Documentation

### Overview

The API client is a TypeScript class that provides methods to interact with the API endpoints. It simplifies the process of fetching data and subscribing to real-time updates.

### Importing the API Client

```typescript
import { ApiClient } from './apiClient';
```

### Creating an Instance

```typescript
const apiClient = new MarketClient(); // Uses default API base URL
```

You can also specify a custom base URL:

```typescript
const apiClient = new MarketClient('http://your-api-base-url');
```

### Methods

#### 1. `getRaydiumPoolData(poolId: string): Promise<market_RaydiumPoolData>`

Fetches data for a specific Raydium pool.

- **Parameters:**
  - `poolId` (string): The identifier of the Raydium pool.
- **Returns:** A promise that resolves to a `market_RaydiumPoolData` object.

**Example Usage:**

```typescript
apiClient.getRaydiumPoolData('YourPoolIdHere')
  .then((data) => {
    console.log('Pool Data:', data);
  })
  .catch((error) => {
    console.error('Error fetching pool data:', error);
  });
```

---

#### 2. `getRaydiumPriceUpdates(poolId: string): EventEmitter`

Subscribes to real-time price updates for a specific Raydium pool.

- **Parameters:**
  - `poolId` (string): The identifier of the Raydium pool.
- **Returns:** An `EventEmitter` that emits `'data'`, `'error'`, and `'close'` events.

**Example Usage:**

```typescript
const raydiumPriceEmitter = apiClient.getRaydiumPriceUpdates('YourPoolIdHere');

raydiumPriceEmitter.on('data', (update) => {
  console.log('Raydium Price Update:', update);
});

raydiumPriceEmitter.on('error', (error) => {
  console.error('Error:', error);
});

// Close the connection after 3 minutes
setTimeout(() => {
  raydiumPriceEmitter.emit('closeConnection');
}, 180000);
```

**Events:**

- `'data'`: Emitted when a new price update is received.
- `'error'`: Emitted when an error occurs.
- `'close'`: Emitted when the WebSocket connection is closed.

---

#### 3. `getPumpPriceUpdates(tokenMint: string, trade_id: string): EventEmitter`

Subscribes to real-time price updates for a specific token in the Pump program.

- **Parameters:**
  - `tokenMint` (string): The token mint address.
  - `trade_id` (string): The trade identifier.
- **Returns:** An `EventEmitter` that emits `'data'`, `'error'`, and `'close'` events.

**Example Usage:**

```typescript
const pumpPriceEmitter = apiClient.getPumpPriceUpdates('YourTokenMintHere', 'YourTradeIdHere');

pumpPriceEmitter.on('data', (update) => {
  console.log('Pump Price Update:', update);
});

pumpPriceEmitter.on('error', (error) => {
  console.error('Error:', error);
});

// Close the connection after 3 minutes
setTimeout(() => {
  pumpPriceEmitter.emit('closeConnection');
}, 180000);
```

**Events:**

- `'data'`: Emitted when a new price update is received.
- `'error'`: Emitted when an error occurs.
- `'close'`: Emitted when the WebSocket connection is closed.

---

#### 4. `getPumpMigrationEvents(): EventEmitter`

Subscribes to real-time pump migration events.

- **Parameters:** None.
- **Returns:** An `EventEmitter` that emits `'data'`, `'error'`, and `'close'` events.

**Example Usage:**

```typescript
const migrationEmitter = apiClient.getPumpMigrationEvents();

migrationEmitter.on('data', (event) => {
  console.log('Migration Event:', event);
});

migrationEmitter.on('error', (error) => {
  console.error('Error:', error);
});

// Optional: Stop the data stream before closing
setTimeout(() => {
  migrationEmitter.emit('stop');
}, 170000);

// Close the connection after 3 minutes
setTimeout(() => {
  migrationEmitter.emit('closeConnection');
}, 180000);
```

**Events:**

- `'data'`: Emitted when a new migration event is received.
- `'error'`: Emitted when an error occurs.
- `'close'`: Emitted when the WebSocket connection is closed.

**Control Messages:**

- To start the data stream (sent automatically upon connection):
  ```typescript
  migrationEmitter.emit('start');
  ```
- To stop the data stream:
  ```typescript
  migrationEmitter.emit('stop');
  ```
- To close the connection:
  ```typescript
  migrationEmitter.emit('closeConnection');
  ```

---

### Type Definitions

Define TypeScript interfaces to represent the data structures returned by the API.

#### `market_RaydiumPoolData`

```typescript
export interface market_RaydiumPoolData {
  poolId: string;
  liquidity: number;
  volume: number;
  // Add other relevant fields
}
```

#### `market_RaydiumPriceUpdate`

```typescript
export interface market_RaydiumPriceUpdate {
  poolId: string;
  price: number;
  timestamp: string;
  // Add other relevant fields
}
```

#### `market_PumpPriceUpdates`

```typescript
export interface market_PumpPriceUpdates {
  trade_id: string;
  tokenMint: string;
  price: number;
  timestamp: string;
  // Add other relevant fields
}
```

#### `PumpMigrationEvent`

```typescript
export interface PumpMigrationEvent {
  timestamp: string;
  token: string;
  status: string; // 'add' or 'withdraw'
  poolId?: string;
}
```

---

## Conclusion

This documentation provides an overview of the API endpoints and the API client methods available for interacting with Solana blockchain data related to Raydium pools, price updates, and pump migration events. By following the examples and utilizing the provided methods, developers can integrate these data streams into their applications efficiently.

---

## Additional Notes

- **Error Handling:** Always include error handling when using the API client methods to gracefully handle any network or parsing errors.
- **WebSocket Management:** Remember to close WebSocket connections when they are no longer needed to free up resources.
- **Data Validation:** Ensure that the data received from the API conforms to the expected formats before processing it in your application.
- **Logging:** Utilize logging to monitor the data flow and catch any unexpected behavior during development and production.
- **Environment Variables:** Configure environment variables like `API_BASE_URL` as needed for different deployment environments.

---

## Contact Information

For any questions or issues related to the API or the API client, please contact the development team or refer to the project's repository for more information.

---