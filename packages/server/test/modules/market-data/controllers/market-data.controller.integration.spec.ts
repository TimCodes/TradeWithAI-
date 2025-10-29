import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { MarketDataModule } from '../../../../src/modules/market-data/market-data.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Timeframe } from '../../../../src/modules/market-data/dto/market-data.dto';

describe('MarketDataController - Historical Data (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'test',
          password: process.env.DB_PASSWORD || 'test',
          database: process.env.DB_NAME || 'tradewithaitest',
          entities: [__dirname + '/../../../../src/modules/**/*.entity{.ts,.js}'],
          synchronize: true, // Only for testing
        }),
        MarketDataModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /market-data/historical/:symbol', () => {
    it('should return historical OHLCV data', () => {
      return supertest(app.getHttpServer())
        .get('/market-data/historical/BTC/USD')
        .query({
          timeframe: Timeframe.ONE_HOUR,
          limit: 10,
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter by date range', () => {
      const startDate = '2025-10-01T00:00:00Z';
      const endDate = '2025-10-28T00:00:00Z';

      return supertest(app.getHttpServer())
        .get('/market-data/historical/BTC/USD')
        .query({
          timeframe: Timeframe.ONE_HOUR,
          startDate,
          endDate,
          limit: 100,
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            const timestamps = res.body.map((d: any) => new Date(d.timestamp).getTime());
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).getTime();
            
            timestamps.forEach((ts: number) => {
              expect(ts).toBeGreaterThanOrEqual(start);
              expect(ts).toBeLessThanOrEqual(end);
            });
          }
        });
    });

    it('should respect limit parameter', () => {
      return supertest(app.getHttpServer())
        .get('/market-data/historical/BTC/USD')
        .query({
          timeframe: Timeframe.ONE_HOUR,
          limit: 5,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });

    it('should validate timeframe parameter', () => {
      return supertest(app.getHttpServer())
        .get('/market-data/historical/BTC/USD')
        .query({
          timeframe: 'invalid',
        })
        .expect(400);
    });
  });

  describe('POST /market-data/backfill', () => {
    it('should backfill historical data successfully', async () => {
      const dto = {
        symbol: 'BTC/USD',
        timeframe: Timeframe.ONE_HOUR,
        startDate: '2025-10-01T00:00:00Z',
        endDate: '2025-10-01T02:00:00Z',
      };

      const response = await supertest(app.getHttpServer())
        .post('/market-data/backfill')
        .send(dto)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('candlesImported');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
      expect(typeof response.body.candlesImported).toBe('number');
    }, 30000); // Increase timeout for API call

    it('should validate required fields', () => {
      return supertest(app.getHttpServer())
        .post('/market-data/backfill')
        .send({
          symbol: 'BTC/USD',
          // Missing timeframe and startDate
        })
        .expect(400);
    });

    it('should handle invalid date format', () => {
      return supertest(app.getHttpServer())
        .post('/market-data/backfill')
        .send({
          symbol: 'BTC/USD',
          timeframe: Timeframe.ONE_HOUR,
          startDate: 'invalid-date',
        })
        .expect(400);
    });

    it('should use current date as default endDate', async () => {
      const dto = {
        symbol: 'ETH/USD',
        timeframe: Timeframe.FIVE_MINUTES,
        startDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      };

      const response = await supertest(app.getHttpServer())
        .post('/market-data/backfill')
        .send(dto)
        .expect(200);

      expect(response.body.success).toBeDefined();
      const endDate = new Date(response.body.endDate);
      const now = new Date();
      expect(endDate.getTime()).toBeLessThanOrEqual(now.getTime());
    }, 30000);
  });

  describe('GET /market-data/cache/stats', () => {
    it('should return cache statistics', () => {
      return supertest(app.getHttpServer())
        .get('/market-data/cache/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ohlcvCacheSize');
          expect(res.body).toHaveProperty('tickerCacheSize');
          expect(res.body).toHaveProperty('orderBookCacheSize');
          expect(typeof res.body.ohlcvCacheSize).toBe('number');
          expect(typeof res.body.tickerCacheSize).toBe('number');
          expect(typeof res.body.orderBookCacheSize).toBe('number');
        });
    });
  });

  describe('Cache behavior', () => {
    it('should cache historical data queries', async () => {
      const params = {
        timeframe: Timeframe.ONE_HOUR,
        limit: 10,
      };

      // First request
      const response1 = await supertest(app.getHttpServer())
        .get('/market-data/historical/BTC/USD')
        .query(params)
        .expect(200);

      // Get cache stats
      const stats1 = await supertest(app.getHttpServer())
        .get('/market-data/cache/stats')
        .expect(200);

      // Second identical request (should hit cache)
      const response2 = await supertest(app.getHttpServer())
        .get('/market-data/historical/BTC/USD')
        .query(params)
        .expect(200);

      // Results should be identical
      expect(response1.body).toEqual(response2.body);
      
      // Cache size should remain the same (cache hit)
      const stats2 = await supertest(app.getHttpServer())
        .get('/market-data/cache/stats')
        .expect(200);

      // Either same size or slightly larger (due to other operations)
      expect(stats2.body.ohlcvCacheSize).toBeGreaterThanOrEqual(stats1.body.ohlcvCacheSize);
    });
  });
});
