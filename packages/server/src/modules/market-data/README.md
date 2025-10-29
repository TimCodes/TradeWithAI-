# Market Data Module

## Overview

The Market Data Module provides real-time market data streaming from Kraken exchange via WebSocket, historical data storage, and retrieval capabilities.

## Features

✅ **WebSocket Market Data Service**
- Real-time connection to Kraken WebSocket API
- Auto-reconnection with exponential backoff
- Subscribe to ticker data (BTC/USD, ETH/USD, etc.)
- Subscribe to order book depth updates (10 or 25 levels)
- Connection health monitoring
- Graceful error handling

✅ **OHLCV Data Storage**
- Store candlestick data in PostgreSQL/TimescaleDB
- Optimized hypertable storage for time-series data
- Data compression and retention policies
- Support for multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)

✅ **REST API Endpoints**
- Get latest ticker data
- Get order book snapshot
- Subscribe/unsubscribe to market data
- Query historical OHLCV data

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MarketDataModule                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │        MarketDataService                         │   │
│  │  - WebSocket connection management               │   │
│  │  - Auto-reconnection with backoff                │   │
│  │  - Subscription management                       │   │
│  │  - In-memory data caching                        │   │
│  │  - OHLCV storage                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                      ↓                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │      MarketDataController                        │   │
│  │  - REST API endpoints                            │   │
│  │  - Ticker/OrderBook access                       │   │
│  │  - Historical data queries                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
         ↕                                  ↕
  WebSocket (Kraken)              PostgreSQL/TimescaleDB
  wss://ws.kraken.com
```

## Installation & Setup

### 1. Enable TimescaleDB (Optional but Recommended)

For optimal time-series data storage:

```sql
-- Connect to your database
psql -U postgres -d alpha_arena

-- Install TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### 2. Run Migrations

```bash
npm run migration:run
```

This will:
- Create the `ohlcv` table
- Convert it to a TimescaleDB hypertable (if extension is available)
- Add compression policy (compress data older than 7 days)
- Add retention policy (keep data for 365 days)

### 3. Start the Server

```bash
npm run dev
```

The service will automatically connect to Kraken WebSocket on startup.

## Usage Examples

### Subscribe to Market Data

```typescript
// Subscribe to ticker
POST http://localhost:3000/market-data/subscribe
{
  "symbol": "BTC/USD",
  "type": "ticker"
}

// Subscribe to order book
POST http://localhost:3000/market-data/subscribe
{
  "symbol": "ETH/USD",
  "type": "orderbook"
}
```

### Get Latest Data

```typescript
// Get ticker
GET http://localhost:3000/market-data/ticker/BTC/USD

Response:
{
  "symbol": "BTC/USD",
  "price": 50000.5,
  "bid": 50000.0,
  "ask": 50001.0,
  "volume24h": 1234567.89,
  "change24h": 2.5,
  "high24h": 51000.0,
  "low24h": 49000.0,
  "timestamp": "2025-10-28T12:00:00.000Z"
}

// Get order book
GET http://localhost:3000/market-data/orderbook/BTC/USD

Response:
{
  "symbol": "BTC/USD",
  "bids": [
    { "price": 50000.0, "size": 1.5, "total": 1.5 },
    { "price": 49999.0, "size": 2.0, "total": 3.5 }
  ],
  "asks": [
    { "price": 50001.0, "size": 1.2, "total": 1.2 },
    { "price": 50002.0, "size": 1.8, "total": 3.0 }
  ],
  "timestamp": "2025-10-28T12:00:00.000Z"
}
```

### Get Historical Data

```typescript
GET http://localhost:3000/market-data/historical/BTC/USD?timeframe=1h&limit=100

Response:
[
  {
    "timestamp": "2025-10-28T11:00:00.000Z",
    "open": 49500.0,
    "high": 50000.0,
    "low": 49400.0,
    "close": 49900.0,
    "volume": 123.45,
    "trades": 250
  },
  ...
]
```

### Check Service Health

```typescript
GET http://localhost:3000/market-data/health

Response:
{
  "status": "healthy",
  "connected": true,
  "reconnectAttempts": 0,
  "subscriptions": 4,
  "timestamp": "2025-10-28T12:00:00.000Z"
}
```

## WebSocket Implementation Details

### Connection Management

- **URL**: `wss://ws.kraken.com`
- **Auto-reconnection**: Exponential backoff (1s → 2s → 4s → ... → 60s max)
- **Max reconnection attempts**: 10
- **Heartbeat**: Ping every 30 seconds

### Subscription Format

Ticker subscription:
```json
{
  "event": "subscribe",
  "pair": ["XBT/USD"],
  "subscription": { "name": "ticker" }
}
```

Order book subscription:
```json
{
  "event": "subscribe",
  "pair": ["XBT/USD"],
  "subscription": { "name": "book", "depth": 10 }
}
```

### Data Caching

The service maintains in-memory caches for:
- **Ticker data**: Latest price, bid, ask, volume, 24h stats
- **Order book**: Top 15 bids and asks per symbol

Cached data is updated in real-time as WebSocket messages arrive.

## Database Schema

### OHLCV Table

```sql
CREATE TABLE "ohlcv" (
  "id" uuid PRIMARY KEY,
  "symbol" varchar(20) NOT NULL,
  "timeframe" varchar(10) NOT NULL,  -- '1m', '5m', '15m', '1h', '4h', '1d'
  "timestamp" timestamptz NOT NULL,
  "open" decimal(20,8) NOT NULL,
  "high" decimal(20,8) NOT NULL,
  "low" decimal(20,8) NOT NULL,
  "close" decimal(20,8) NOT NULL,
  "volume" decimal(20,8) NOT NULL,
  "trades" int NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ohlcv_symbol_timeframe_timestamp ON ohlcv (symbol, timeframe, timestamp);
CREATE INDEX idx_ohlcv_timestamp ON ohlcv (timestamp);
```

### TimescaleDB Optimizations

When TimescaleDB is enabled:
- **Hypertable**: Automatic time-based partitioning
- **Compression**: Data older than 7 days is compressed
- **Retention**: Data older than 365 days is automatically deleted
- **Query optimization**: Fast time-range queries with parallel workers

## Error Handling

### WebSocket Errors

- Connection errors trigger auto-reconnection
- Parse errors are logged but don't crash the service
- Rate limiting is handled by Kraken (no action needed)

### Database Errors

- Failed OHLCV inserts are logged
- Duplicate entries are handled gracefully
- Connection pool manages database reconnections

## Monitoring

### Logs

```
[MarketDataService] Connecting to Kraken WebSocket...
[MarketDataService] Connected to Kraken WebSocket
[MarketDataService] Subscribed to ticker for BTC/USD (XBT/USD)
[MarketDataService] Ticker update for BTC/USD: 50000.5
[MarketDataService] OrderBook update for BTC/USD
```

### Health Endpoint

Monitor service status via `/market-data/health`:
- `connected`: WebSocket connection status
- `reconnectAttempts`: Number of reconnection attempts
- `subscriptions`: Number of active subscriptions

## Performance Considerations

### Memory Usage

- Ticker cache: ~1KB per symbol
- Order book cache: ~5KB per symbol (15 levels each side)
- Total memory for 10 symbols: ~60KB

### Database Storage

- OHLCV data: ~100 bytes per candle
- 1 minute candles for 1 year: ~52M candles = ~5GB (before compression)
- TimescaleDB compression: ~10x reduction = ~500MB

### Query Performance

- Ticker/OrderBook access: O(1) from cache
- Historical queries: <100ms for 100 candles (with indexes)
- TimescaleDB hypertables: 10-100x faster than regular tables

## Future Enhancements

- [ ] Trade data streaming
- [ ] Spread data tracking
- [ ] OHLCV aggregation from tick data
- [ ] Multi-exchange support
- [ ] Data backfill mechanism
- [ ] WebSocket event broadcasting to clients
- [ ] Redis caching for distributed systems

## Testing

### Manual Testing

```bash
# Check health
curl http://localhost:3000/market-data/health

# Subscribe to BTC ticker
curl -X POST http://localhost:3000/market-data/subscribe \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC/USD","type":"ticker"}'

# Get ticker (wait a few seconds for data)
curl http://localhost:3000/market-data/ticker/BTC/USD
```

### Integration Tests

```bash
npm run test:e2e -- market-data
```

## Troubleshooting

### WebSocket won't connect

- Check network connectivity
- Verify Kraken API is operational: https://status.kraken.com
- Check firewall rules (allow outbound WSS on port 443)

### No data received

- Verify subscriptions are active: `GET /market-data/health`
- Check logs for WebSocket errors
- Try restarting the service

### Database performance issues

- Ensure indexes are created: Check migration logs
- Consider enabling TimescaleDB for better performance
- Adjust chunk interval for hypertables if needed

## References

- [Kraken WebSocket API Docs](https://docs.kraken.com/websockets/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [NestJS WebSocket Guide](https://docs.nestjs.com/websockets/gateways)
