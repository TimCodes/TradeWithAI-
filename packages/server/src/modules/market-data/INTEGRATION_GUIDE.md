# Market Data Module Integration Guide

This guide explains how to integrate and use the MarketDataModule in your NestJS application.

## Table of Contents

1. [Installation](#installation)
2. [Module Setup](#module-setup)
3. [Using MarketDataService](#using-marketdataservice)
4. [API Endpoints](#api-endpoints)
5. [Health Monitoring](#health-monitoring)
6. [Examples](#examples)
7. [Best Practices](#best-practices)

---

## Installation

The MarketDataModule is already integrated into the main application. No additional installation is required.

### Dependencies

The module requires:
- `@nestjs/typeorm` - Database integration
- `typeorm` - ORM
- `ws` - WebSocket client
- `axios` - HTTP client
- PostgreSQL database (TimescaleDB recommended for time-series optimization)

---

## Module Setup

### Basic Integration

The module is already registered in `app.module.ts`:

```typescript
import { MarketDataModule } from './modules/market-data/market-data.module';

@Module({
  imports: [
    // ... other modules
    MarketDataModule,
  ],
})
export class AppModule {}
```

### Environment Variables

No additional environment variables are required. The module uses the same database configuration as the rest of the application.

---

## Using MarketDataService

### Importing in Another Module

To use MarketDataService in another module, import the MarketDataModule:

```typescript
import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { MyService } from './my.service';

@Module({
  imports: [MarketDataModule],
  providers: [MyService],
})
export class MyModule {}
```

### Injecting the Service

Inject MarketDataService into your service or controller:

```typescript
import { Injectable } from '@nestjs/common';
import { MarketDataService } from '../market-data/services/market-data.service';

@Injectable()
export class TradingService {
  constructor(
    private readonly marketDataService: MarketDataService,
  ) {}

  async getCurrentPrice(symbol: string): Promise<number | null> {
    const ticker = this.marketDataService.getTicker(symbol);
    return ticker ? parseFloat(ticker.last) : null;
  }
}
```

---

## MarketDataService API

### Subscription Methods

#### subscribeTicker(symbol: string)
Subscribe to real-time ticker updates for a symbol.

```typescript
this.marketDataService.subscribeTicker('BTC/USD');
```

#### subscribeOrderBook(symbol: string, depth?: number)
Subscribe to order book updates for a symbol.

```typescript
this.marketDataService.subscribeOrderBook('BTC/USD', 10); // 10 levels
```

#### unsubscribeTicker(symbol: string)
Unsubscribe from ticker updates.

```typescript
this.marketDataService.unsubscribeTicker('BTC/USD');
```

#### unsubscribeOrderBook(symbol: string)
Unsubscribe from order book updates.

```typescript
this.marketDataService.unsubscribeOrderBook('BTC/USD');
```

### Data Access Methods

#### getTicker(symbol: string): TickerDataDto | null
Get the latest cached ticker data.

```typescript
const ticker = this.marketDataService.getTicker('BTC/USD');
if (ticker) {
  console.log(`Price: ${ticker.last}, Volume: ${ticker.volume}`);
}
```

#### getAllTickers(): TickerDataDto[]
Get all cached ticker data.

```typescript
const allTickers = this.marketDataService.getAllTickers();
allTickers.forEach(ticker => {
  console.log(`${ticker.symbol}: $${ticker.last}`);
});
```

#### getOrderBook(symbol: string): OrderBookDto | null
Get the latest cached order book.

```typescript
const orderBook = this.marketDataService.getOrderBook('BTC/USD');
if (orderBook) {
  console.log(`Best bid: ${orderBook.bids[0].price}`);
  console.log(`Best ask: ${orderBook.asks[0].price}`);
  console.log(`Spread: ${orderBook.spread}`);
}
```

#### getHistoricalData(symbol, timeframe, startDate?, endDate?, limit?)
Get historical OHLCV data from the database.

```typescript
const candles = await this.marketDataService.getHistoricalData(
  'BTC/USD',
  '1h',
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  1000
);
```

#### backfillHistoricalData(symbol, timeframe, startDate, endDate)
Fetch and store historical data from Kraken API.

```typescript
const result = await this.marketDataService.backfillHistoricalData(
  'BTC/USD',
  '1d',
  new Date('2024-01-01'),
  new Date('2025-01-01')
);
console.log(`Imported ${result.candlesImported} candles`);
```

### Monitoring Methods

#### getConnectionStatus()
Get WebSocket connection status.

```typescript
const status = this.marketDataService.getConnectionStatus();
console.log(`Connected: ${status.connected}`);
console.log(`Reconnect attempts: ${status.reconnectAttempts}`);
```

#### getCacheStats()
Get cache statistics.

```typescript
const stats = this.marketDataService.getCacheStats();
console.log(`Tickers cached: ${stats.tickerCacheSize}`);
console.log(`Order books cached: ${stats.orderBookCacheSize}`);
console.log(`OHLCV cache size: ${stats.ohlcvCacheSize}`);
```

---

## API Endpoints

### Market Data Endpoints

#### GET /market-data/health
Get module health status.

**Response:**
```json
{
  "status": "healthy",
  "connected": true,
  "reconnectAttempts": 0,
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

#### GET /market-data/ticker/:symbol
Get latest ticker for a symbol.

**Example:** `GET /market-data/ticker/BTC%2FUSD`

**Response:**
```json
{
  "symbol": "BTC/USD",
  "last": "65000.50",
  "ask": "65001.00",
  "bid": "64999.00",
  "volume": "1234.567",
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

#### GET /market-data/tickers
Get all cached tickers.

**Response:**
```json
[
  {
    "symbol": "BTC/USD",
    "last": "65000.50",
    ...
  },
  {
    "symbol": "ETH/USD",
    "last": "3500.25",
    ...
  }
]
```

#### GET /market-data/orderbook/:symbol
Get order book for a symbol.

**Example:** `GET /market-data/orderbook/BTC%2FUSD`

**Response:**
```json
{
  "symbol": "BTC/USD",
  "bids": [
    { "price": "64999.00", "size": "0.5" },
    { "price": "64998.00", "size": "1.2" }
  ],
  "asks": [
    { "price": "65001.00", "size": "0.8" },
    { "price": "65002.00", "size": "1.5" }
  ],
  "spread": "2.00",
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

#### POST /market-data/subscribe
Subscribe to market data updates.

**Request Body:**
```json
{
  "symbol": "BTC/USD",
  "type": "ticker"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscribed to ticker for BTC/USD"
}
```

#### DELETE /market-data/unsubscribe
Unsubscribe from market data updates.

**Request Body:**
```json
{
  "symbol": "BTC/USD",
  "type": "ticker"
}
```

#### GET /market-data/historical/:symbol
Get historical OHLCV data.

**Query Parameters:**
- `timeframe` - 1m, 5m, 15m, 1h, 4h, 1d (required)
- `startDate` - ISO date string (optional)
- `endDate` - ISO date string (optional)
- `limit` - Number of candles (default: 100)

**Example:** `GET /market-data/historical/BTC%2FUSD?timeframe=1h&limit=24`

**Response:**
```json
[
  {
    "timestamp": "2025-10-29T00:00:00.000Z",
    "open": "64800.00",
    "high": "65200.00",
    "low": "64500.00",
    "close": "65000.00",
    "volume": "123.456"
  },
  ...
]
```

#### POST /market-data/backfill
Backfill historical data from Kraken.

**Request Body:**
```json
{
  "symbol": "BTC/USD",
  "timeframe": "1d",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2025-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully imported 365 candles",
  "candlesImported": 365,
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2025-01-01T00:00:00.000Z"
}
```

#### GET /market-data/cache/stats
Get cache statistics.

**Response:**
```json
{
  "ohlcvCacheSize": 150,
  "tickerCacheSize": 2,
  "orderBookCacheSize": 2
}
```

---

## Health Monitoring

### Health Check Endpoints

#### GET /health/market-data
Comprehensive health check with detailed status.

**Response:**
```json
{
  "status": "healthy",
  "module": "MarketDataModule",
  "websocket": {
    "connected": true,
    "reconnectAttempts": 0
  },
  "cache": {
    "tickerCount": 2,
    "orderBookCount": 2,
    "ohlcvCacheSize": 150
  },
  "subscriptions": {
    "total": 2,
    "symbols": ["BTC/USD", "ETH/USD"]
  },
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

**Status Values:**
- `healthy` - WebSocket connected, module functioning normally
- `degraded` - Connection lost but attempting reconnection (< 3 attempts)
- `unhealthy` - Connection lost with many reconnection attempts

#### GET /health/market-data/ready
Readiness probe for container orchestration.

**Response (Ready):**
```json
{
  "ready": true,
  "message": "Market data module is ready",
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

**Response (Not Ready):**
```json
{
  "ready": false,
  "message": "Market data module is not ready - WebSocket not connected",
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

#### GET /health/market-data/live
Liveness probe for container orchestration.

**Response:**
```json
{
  "alive": true,
  "module": "MarketDataModule",
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

---

## Examples

### Example 1: Get Current Market Price in Trading Service

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/services/market-data.service';

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    private readonly marketDataService: MarketDataService,
  ) {}

  async executeMarketOrder(symbol: string, side: 'buy' | 'sell', size: number) {
    // Get current market price
    const ticker = this.marketDataService.getTicker(symbol);
    
    if (!ticker) {
      this.logger.warn(`No ticker data available for ${symbol}`);
      // Maybe subscribe if not already subscribed
      this.marketDataService.subscribeTicker(symbol);
      throw new Error(`No market data available for ${symbol}`);
    }

    const currentPrice = parseFloat(ticker.last);
    this.logger.log(`Executing ${side} order for ${size} ${symbol} at $${currentPrice}`);

    // Execute order logic here...
    return {
      symbol,
      side,
      size,
      price: currentPrice,
      timestamp: new Date(),
    };
  }
}
```

### Example 2: Enrich LLM Prompt with Market Data

```typescript
import { Injectable } from '@nestjs/common';
import { MarketDataService } from '../market-data/services/market-data.service';
import { LLMProvider } from './providers/llm.provider';

@Injectable()
export class LLMService {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly llmProvider: LLMProvider,
  ) {}

  async chat(userMessage: string): Promise<string> {
    // Get current market context
    const tickers = this.marketDataService.getAllTickers();
    const marketContext = tickers
      .map(t => `${t.symbol}: $${t.last} (${t.volume} 24h volume)`)
      .join(', ');

    // Enrich prompt with real-time market data
    const enrichedPrompt = `
Current Market Data: ${marketContext}

User Question: ${userMessage}

Please provide trading advice based on current market conditions.
`;

    return this.llmProvider.generate(enrichedPrompt);
  }
}
```

### Example 3: Monitor Price Movements

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketDataService } from '../market-data/services/market-data.service';

@Injectable()
export class PriceMonitorService {
  private readonly logger = new Logger(PriceMonitorService.name);
  private previousPrices = new Map<string, number>();

  constructor(
    private readonly marketDataService: MarketDataService,
  ) {
    // Subscribe to symbols we want to monitor
    this.marketDataService.subscribeTicker('BTC/USD');
    this.marketDataService.subscribeTicker('ETH/USD');
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  checkPriceMovements() {
    const tickers = this.marketDataService.getAllTickers();

    for (const ticker of tickers) {
      const currentPrice = parseFloat(ticker.last);
      const previousPrice = this.previousPrices.get(ticker.symbol);

      if (previousPrice) {
        const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
        
        if (Math.abs(changePercent) > 1) { // Alert on >1% move
          this.logger.warn(
            `${ticker.symbol} moved ${changePercent.toFixed(2)}% ` +
            `(${previousPrice} → ${currentPrice})`
          );
        }
      }

      this.previousPrices.set(ticker.symbol, currentPrice);
    }
  }
}
```

### Example 4: Calculate Technical Indicators

```typescript
import { Injectable } from '@nestjs/common';
import { MarketDataService } from '../market-data/services/market-data.service';

@Injectable()
export class TechnicalAnalysisService {
  constructor(
    private readonly marketDataService: MarketDataService,
  ) {}

  async calculateSMA(symbol: string, period: number): Promise<number | null> {
    // Get historical data
    const candles = await this.marketDataService.getHistoricalData(
      symbol,
      '1h',
      undefined,
      undefined,
      period
    );

    if (candles.length < period) {
      return null;
    }

    // Calculate Simple Moving Average
    const sum = candles.reduce((acc, candle) => acc + parseFloat(candle.close), 0);
    return sum / candles.length;
  }

  async getRSI(symbol: string, period: number = 14): Promise<number | null> {
    const candles = await this.marketDataService.getHistoricalData(
      symbol,
      '1h',
      undefined,
      undefined,
      period + 1
    );

    if (candles.length < period + 1) {
      return null;
    }

    // Calculate RSI (simplified example)
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < candles.length; i++) {
      const change = parseFloat(candles[i].close) - parseFloat(candles[i - 1].close);
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }
}
```

---

## Best Practices

### 1. Subscribe Early, Unsubscribe When Done

```typescript
@Injectable()
export class MyService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly marketDataService: MarketDataService) {}

  onModuleInit() {
    // Subscribe when module initializes
    this.marketDataService.subscribeTicker('BTC/USD');
  }

  onModuleDestroy() {
    // Clean up subscriptions
    this.marketDataService.unsubscribeTicker('BTC/USD');
  }
}
```

### 2. Handle Missing Data Gracefully

```typescript
async getPrice(symbol: string): Promise<number> {
  const ticker = this.marketDataService.getTicker(symbol);
  
  if (!ticker) {
    // Subscribe and wait, or throw error, or return default
    this.logger.warn(`No data for ${symbol}, subscribing...`);
    this.marketDataService.subscribeTicker(symbol);
    throw new Error(`No market data available for ${symbol}`);
  }

  return parseFloat(ticker.last);
}
```

### 3. Cache Historical Data Queries

```typescript
private historicalDataCache = new Map<string, { data: any[], timestamp: number }>();
private readonly CACHE_TTL = 60000; // 60 seconds

async getCachedHistoricalData(symbol: string, timeframe: string) {
  const cacheKey = `${symbol}:${timeframe}`;
  const cached = this.historicalDataCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    return cached.data;
  }

  const data = await this.marketDataService.getHistoricalData(symbol, timeframe);
  this.historicalDataCache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}
```

### 4. Monitor Connection Health

```typescript
@Cron(CronExpression.EVERY_MINUTE)
checkConnectionHealth() {
  const status = this.marketDataService.getConnectionStatus();
  
  if (!status.connected) {
    this.logger.error(`Market data WebSocket disconnected! Attempts: ${status.reconnectAttempts}`);
    // Maybe send alert, notification, etc.
  }
}
```

### 5. Use Type Safety

```typescript
import { TickerDataDto, OrderBookDto, OHLCVDto } from '../market-data/dto/market-data.dto';

async processTicker(ticker: TickerDataDto) {
  // TypeScript ensures you're using correct properties
  const price: number = parseFloat(ticker.last);
  const volume: number = parseFloat(ticker.volume);
  // ...
}
```

---

## Troubleshooting

### WebSocket Connection Issues

If the WebSocket connection fails:

1. Check Kraken API status: https://status.kraken.com/
2. Check the health endpoint: `GET /health/market-data`
3. Review logs for error messages
4. The service auto-reconnects with exponential backoff

### No Data Available

If `getTicker()` or `getOrderBook()` returns null:

1. Ensure you've subscribed to the symbol first
2. Wait a few seconds after subscribing for data to arrive
3. Check the connection status

### Historical Data Not Found

If historical queries return empty results:

1. Run backfill to populate data: `POST /market-data/backfill`
2. Check date ranges - data may not exist for very old dates
3. Verify symbol format (e.g., "BTC/USD" not "BTCUSD")

---

## Summary

The MarketDataModule provides:

- ✅ Real-time market data via WebSocket
- ✅ Historical data storage and retrieval
- ✅ REST API for easy integration
- ✅ Health monitoring and observability
- ✅ Automatic reconnection and error handling
- ✅ Cross-module compatibility

For questions or issues, refer to the [main README](./README.md) or check the completion documents:
- [Story 2.1 Complete](./STORY_2.1_COMPLETE.md)
- [Story 2.2 Complete](./STORY_2.2_COMPLETE.md)
- [Story 2.3 Complete](./STORY_2.3_COMPLETE.md)
