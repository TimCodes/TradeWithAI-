# Trading Module - Kraken API Integration

## Overview

# Trading Module

This module provides integration with the Kraken cryptocurrency exchange API, enabling real-time trading functionality for the TradeWithAI platform.

## Features

✅ **Implemented:**
- Full Kraken REST API integration
- Public endpoints (ticker, order book, OHLC, trades)
- Private endpoints (balance, orders, positions)
- Order placement (market and limit orders)
- Order cancellation
- Rate limiting (15 requests/second)
- Comprehensive error handling
- Authentication with HMAC-SHA512 signatures
- Unit tests with >80% coverage
- Integration tests for live API testing

## File Structure

```
trading/
├── controllers/
│   └── kraken.controller.ts       # REST API endpoints
├── services/
│   ├── kraken.service.ts          # Core Kraken API service
│   ├── kraken.service.spec.ts     # Unit tests
│   └── kraken.service.integration.spec.ts  # Integration tests
├── dto/
│   └── kraken.dto.ts              # Data transfer objects
└── trading.module.ts              # Module definition
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Kraken API Credentials
KRAKEN_API_KEY=your-api-key-here
KRAKEN_API_SECRET=your-api-secret-here
```

### Getting Kraken API Keys

1. Sign up at https://kraken.com
2. Navigate to Settings → API
3. Click "Generate New Key"
4. Set permissions:
   - ✅ Query Funds
   - ✅ Query Open Orders & Trades
   - ✅ Query Closed Orders & Trades
   - ✅ Create & Modify Orders (for trading)
5. Copy the API Key and Secret to your `.env` file

⚠️ **Security Note:** Never commit your API keys to version control!

## Usage

### Import the Module

The `TradingModule` is already imported in `app.module.ts`:

```typescript
import { TradingModule } from './modules/trading/trading.module';

@Module({
  imports: [
    // ... other modules
    TradingModule,
  ],
})
export class AppModule {}
```

### Using the Kraken Service

```typescript
import { KrakenService } from './modules/trading/services/kraken.service';

@Injectable()
export class MyService {
  constructor(private krakenService: KrakenService) {}

  async getCurrentPrice(pair: string) {
    const ticker = await this.krakenService.getTicker(pair);
    return ticker.c[0]; // Last trade price
  }

  async placeMarketOrder() {
    const order = await this.krakenService.placeOrder({
      pair: 'XBTUSD',
      type: 'buy',
      ordertype: 'market',
      volume: '0.001',
    });
    return order;
  }
}
```

## API Endpoints

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/kraken/health` | Check API connectivity |
| GET | `/kraken/server-time` | Get Kraken server time |
| GET | `/kraken/asset-pairs` | Get all tradable pairs |
| GET | `/kraken/ticker/:pair` | Get ticker for a pair |
| GET | `/kraken/orderbook/:pair` | Get order book depth |
| GET | `/kraken/ohlc/:pair` | Get OHLC candlestick data |
| GET | `/kraken/trades/:pair` | Get recent trades |

### Private Endpoints (Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/kraken/balance` | Get account balance |
| POST | `/kraken/orders` | Place a new order |
| DELETE | `/kraken/orders/:txid` | Cancel an order |
| GET | `/kraken/orders/open` | Get open orders |
| GET | `/kraken/orders/closed` | Get closed orders |

### Example Requests

#### Get Ticker Data
```bash
curl http://localhost:3000/kraken/ticker/XBTUSD
```

#### Get Order Book
```bash
curl http://localhost:3000/kraken/orderbook/XBTUSD?count=10
```

#### Place an Order (Validation Only)
```bash
curl -X POST http://localhost:3000/kraken/orders \
  -H "Content-Type: application/json" \
  -d '{
    "pair": "XBTUSD",
    "type": "buy",
    "ordertype": "market",
    "volume": "0.001",
    "validate": true
  }'
```

## Trading Pairs

Common Kraken trading pairs:
- `XBTUSD` - Bitcoin / US Dollar
- `ETHUSD` - Ethereum / US Dollar
- `XXBTZUSD` - Bitcoin / US Dollar (alternative)
- `XETHZUSD` - Ethereum / US Dollar (alternative)

**Note:** Kraken uses different naming conventions. Use the `/kraken/asset-pairs` endpoint to see all available pairs.

## Rate Limiting

The service automatically handles rate limiting:
- Maximum: 15 requests per second (conservative limit)
- Requests are queued when limit is reached
- No action required from the developer

## Testing

### Run Unit Tests
```bash
npm test -- kraken.service.spec.ts
```

### Run Integration Tests
```bash
# Make sure KRAKEN_API_KEY and KRAKEN_API_SECRET are set in .env
npm test -- kraken.service.integration.spec.ts
```

### Test Coverage
```bash
npm run test:cov
```

Expected coverage: >80% for all Kraken service files

## Error Handling

The service handles various error scenarios:

- **Invalid credentials:** `401 Unauthorized`
- **Invalid parameters:** `400 Bad Request`
- **Rate limit exceeded:** Automatic retry with backoff
- **Network errors:** `503 Service Unavailable`
- **API errors:** Includes Kraken error messages

Example error response:
```json
{
  "statusCode": 400,
  "message": "EGeneral:Invalid arguments",
  "error": "Kraken API Error"
}
```

## Order Types

### Market Orders
Execute immediately at current market price:
```typescript
{
  pair: 'XBTUSD',
  type: 'buy',
  ordertype: 'market',
  volume: '0.001'
}
```

### Limit Orders
Execute at a specific price or better:
```typescript
{
  pair: 'XBTUSD',
  type: 'sell',
  ordertype: 'limit',
  volume: '0.001',
  price: '52000.00'
}
```

### Order Validation
Test orders without executing:
```typescript
{
  pair: 'XBTUSD',
  type: 'buy',
  ordertype: 'market',
  volume: '0.001',
  validate: true  // Will not execute
}
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Restrict API key permissions** to only what's needed
4. **Enable IP whitelisting** on Kraken for production
5. **Use 2FA** on your Kraken account
6. **Monitor API usage** regularly
7. **Set spending limits** on your API keys

## Troubleshooting

### "Kraken API credentials not configured"
- Verify `KRAKEN_API_KEY` and `KRAKEN_API_SECRET` are in `.env`
- Restart the server after updating `.env`

### "Invalid API key"
- Check that the API key is copied correctly
- Verify the API key is not revoked in Kraken settings
- Ensure proper permissions are enabled

### Rate limit errors
- The service handles rate limiting automatically
- If you see frequent rate limit warnings, reduce request frequency

### "EService:Unavailable"
- Kraken API may be temporarily down
- Check https://status.kraken.com
- Retry after a few minutes

## Next Steps

This implementation completes **Story 1.1** of the project roadmap. Next stories:

- **1.2:** Order Management System (entities, order executor)
- **1.3:** Risk Management System
- **1.4:** Trading Module Integration (Bull queue, etc.)

## Resources

- [Kraken API Documentation](https://docs.kraken.com/rest/)
- [Kraken WebSocket API](https://docs.kraken.com/websockets/)
- [Kraken Status Page](https://status.kraken.com)
- [Kraken Support](https://support.kraken.com)

## License

Part of the TradeWithAI project. See main project README for license information.
