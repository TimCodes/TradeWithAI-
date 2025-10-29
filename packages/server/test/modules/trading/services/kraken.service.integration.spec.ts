import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KrakenService } from '../../../../src/modules/trading/services/kraken.service';

/**
 * Integration tests for Kraken API Service
 * 
 * IMPORTANT: These tests connect to the actual Kraken API
 * 
 * To run these tests:
 * 1. Set up environment variables:
 *    - KRAKEN_API_KEY: Your Kraken API key
 *    - KRAKEN_API_SECRET: Your Kraken API secret
 * 2. For testing, use Kraken's staging environment or ensure you have minimal funds
 * 3. Run with: npm run test -- kraken.service.integration.spec.ts
 * 
 * NOTE: These tests may fail if:
 * - API credentials are invalid
 * - Rate limits are exceeded
 * - Network connectivity issues
 * - Kraken API is down
 */
describe('KrakenService Integration Tests', () => {
  let service: KrakenService;
  let configService: ConfigService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
      ],
      providers: [KrakenService],
    }).compile();

    service = module.get<KrakenService>(KrakenService);
    configService = module.get<ConfigService>(ConfigService);

    // Check if credentials are configured
    const apiKey = configService.get<string>('KRAKEN_API_KEY');
    const apiSecret = configService.get<string>('KRAKEN_API_SECRET');

    if (!apiKey || !apiSecret) {
      console.warn('⚠️  Kraken API credentials not configured. Integration tests will be skipped.');
    }
  });

  describe('Public API Endpoints', () => {
    describe('getServerTime', () => {
      it('should fetch Kraken server time', async () => {
        const result = await service.getServerTime();

        expect(result).toBeDefined();
        expect(result.unixtime).toBeDefined();
        expect(result.rfc1123).toBeDefined();
        expect(typeof result.unixtime).toBe('number');
        expect(typeof result.rfc1123).toBe('string');
        
        console.log('✅ Server Time:', result);
      }, 10000);
    });

    describe('healthCheck', () => {
      it('should return true when API is healthy', async () => {
        const result = await service.healthCheck();

        expect(result).toBe(true);
        console.log('✅ Health Check: Passed');
      }, 10000);
    });

    describe('getAssetPairs', () => {
      it('should fetch tradable asset pairs', async () => {
        const result = await service.getAssetPairs();

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(Object.keys(result).length).toBeGreaterThan(0);
        
        // Check for common pairs
        const hasXBTUSD = Object.keys(result).some(key => 
          result[key].altname === 'XBTUSD' || key.includes('XBT')
        );
        expect(hasXBTUSD).toBe(true);
        
        console.log('✅ Asset Pairs: Found', Object.keys(result).length, 'pairs');
      }, 10000);
    });

    describe('getTicker', () => {
      it('should fetch ticker for BTC/USD', async () => {
        const pair = 'XBTUSD';
        const result = await service.getTicker(pair);

        expect(result).toBeDefined();
        expect(result.a).toBeDefined(); // Ask
        expect(result.b).toBeDefined(); // Bid
        expect(result.c).toBeDefined(); // Last trade
        expect(result.v).toBeDefined(); // Volume
        
        console.log('✅ Ticker XBTUSD:', {
          ask: result.a[0],
          bid: result.b[0],
          last: result.c[0],
          volume24h: result.v[1],
        });
      }, 10000);

      it('should fetch ticker for ETH/USD', async () => {
        const pair = 'ETHUSD';
        const result = await service.getTicker(pair);

        expect(result).toBeDefined();
        expect(result.a).toBeDefined();
        
        console.log('✅ Ticker ETHUSD:', {
          ask: result.a[0],
          bid: result.b[0],
        });
      }, 10000);
    });

    describe('getOrderBook', () => {
      it('should fetch order book for BTC/USD', async () => {
        const pair = 'XBTUSD';
        const result = await service.getOrderBook(pair, 10);

        expect(result).toBeDefined();
        expect(result.asks).toBeDefined();
        expect(result.bids).toBeDefined();
        expect(Array.isArray(result.asks)).toBe(true);
        expect(Array.isArray(result.bids)).toBe(true);
        expect(result.asks.length).toBeGreaterThan(0);
        expect(result.bids.length).toBeGreaterThan(0);
        
        console.log('✅ Order Book XBTUSD:', {
          bestAsk: result.asks[0],
          bestBid: result.bids[0],
          spread: parseFloat(result.asks[0][0]) - parseFloat(result.bids[0][0]),
        });
      }, 10000);
    });

    describe('getOHLC', () => {
      it('should fetch 1-hour OHLC data for BTC/USD', async () => {
        const pair = 'XBTUSD';
        const result = await service.getOHLC(pair, 60);

        expect(result).toBeDefined();
        expect(result[pair]).toBeDefined();
        expect(Array.isArray(result[pair])).toBe(true);
        expect(result[pair].length).toBeGreaterThan(0);
        expect(result.last).toBeDefined();
        
        const latestCandle = result[pair][result[pair].length - 1];
        console.log('✅ OHLC XBTUSD (1h):', {
          time: new Date(latestCandle[0] * 1000).toISOString(),
          open: latestCandle[1],
          high: latestCandle[2],
          low: latestCandle[3],
          close: latestCandle[4],
          volume: latestCandle[6],
        });
      }, 10000);
    });

    describe('getRecentTrades', () => {
      it('should fetch recent trades for BTC/USD', async () => {
        const pair = 'XBTUSD';
        const result = await service.getRecentTrades(pair);

        expect(result).toBeDefined();
        expect(result[pair]).toBeDefined();
        expect(Array.isArray(result[pair])).toBe(true);
        expect(result[pair].length).toBeGreaterThan(0);
        expect(result.last).toBeDefined();
        
        const latestTrade = result[pair][0];
        console.log('✅ Recent Trades XBTUSD:', {
          price: latestTrade[0],
          volume: latestTrade[1],
          time: new Date(latestTrade[2] * 1000).toISOString(),
          side: latestTrade[3],
        });
      }, 10000);
    });
  });

  describe('Private API Endpoints (Requires Credentials)', () => {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    beforeEach(() => {
      if (!apiKey || !apiSecret) {
        console.warn('⚠️  Skipping private API tests - credentials not configured');
      }
    });

    describe('getBalance', () => {
      it('should fetch account balance', async () => {
        if (!apiKey || !apiSecret) {
          return; // Skip test
        }

        const result = await service.getBalance();

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        
        console.log('✅ Account Balance:', result);
      }, 15000);
    });

    describe('getOpenOrders', () => {
      it('should fetch open orders', async () => {
        if (!apiKey || !apiSecret) {
          return; // Skip test
        }

        const result = await service.getOpenOrders();

        expect(result).toBeDefined();
        expect(result.open).toBeDefined();
        expect(typeof result.open).toBe('object');
        
        const orderCount = Object.keys(result.open).length;
        console.log('✅ Open Orders:', orderCount, 'orders');
      }, 15000);
    });

    describe('getClosedOrders', () => {
      it('should fetch closed orders', async () => {
        if (!apiKey || !apiSecret) {
          return; // Skip test
        }

        const result = await service.getClosedOrders();

        expect(result).toBeDefined();
        expect(result.closed).toBeDefined();
        expect(result.count).toBeDefined();
        expect(typeof result.closed).toBe('object');
        
        console.log('✅ Closed Orders:', result.count, 'orders');
      }, 15000);
    });

    describe('placeOrder (Validation Only)', () => {
      it('should validate a market buy order without executing', async () => {
        if (!apiKey || !apiSecret) {
          return; // Skip test
        }

        const result = await service.placeOrder({
          pair: 'XBTUSD',
          type: 'buy',
          ordertype: 'market',
          volume: '0.001', // Very small amount
          validate: true, // Validation only - DO NOT execute
        });

        expect(result).toBeDefined();
        expect(result.descr).toBeDefined();
        expect(result.descr.order).toBeDefined();
        
        console.log('✅ Order Validation:', result.descr.order);
      }, 15000);

      it('should validate a limit sell order without executing', async () => {
        if (!apiKey || !apiSecret) {
          return; // Skip test
        }

        // First get current price
        const ticker = await service.getTicker('XBTUSD');
        const currentPrice = parseFloat(ticker.c[0]);
        const limitPrice = (currentPrice * 1.1).toFixed(2); // 10% above market

        const result = await service.placeOrder({
          pair: 'XBTUSD',
          type: 'sell',
          ordertype: 'limit',
          volume: '0.001',
          price: limitPrice,
          validate: true,
        });

        expect(result).toBeDefined();
        expect(result.descr).toBeDefined();
        
        console.log('✅ Limit Order Validation:', result.descr.order);
      }, 15000);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple rapid requests without errors', async () => {
      const promises = [];
      
      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        promises.push(service.getServerTime());
      }

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.unixtime).toBeDefined();
      });

      console.log('✅ Rate Limiting: Handled 10 rapid requests successfully');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid trading pair gracefully', async () => {
      const invalidPair = 'INVALID_PAIR_12345';
      
      await expect(service.getTicker(invalidPair)).rejects.toThrow();
      
      console.log('✅ Error Handling: Invalid pair handled correctly');
    }, 10000);
  });
});
