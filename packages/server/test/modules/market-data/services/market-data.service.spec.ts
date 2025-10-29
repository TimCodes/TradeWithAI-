import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketDataService } from '../../../../src/modules/market-data/services/market-data.service';
import { OHLCVEntity } from '../../../../src/modules/market-data/entities/ohlcv.entity';
import { Timeframe } from '../../../../src/modules/market-data/dto/market-data.dto';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MarketDataService - Historical Data', () => {
  let service: MarketDataService;
  let repository: Repository<OHLCVEntity>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataService,
        {
          provide: getRepositoryToken(OHLCVEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MarketDataService>(MarketDataService);
    repository = module.get<Repository<OHLCVEntity>>(getRepositoryToken(OHLCVEntity));

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Stop service to prevent WebSocket connections in tests
    service.onModuleDestroy();
  });

  describe('getHistoricalData', () => {
    it('should fetch historical OHLCV data from database', async () => {
      const mockData = [
        {
          id: '1',
          symbol: 'BTC/USD',
          timeframe: Timeframe.ONE_HOUR,
          timestamp: new Date('2025-10-01T00:00:00Z'),
          open: '50000.00',
          high: '51000.00',
          low: '49500.00',
          close: '50500.00',
          volume: '1234.56',
          trades: 250,
          createdAt: new Date(),
        },
        {
          id: '2',
          symbol: 'BTC/USD',
          timeframe: Timeframe.ONE_HOUR,
          timestamp: new Date('2025-10-01T01:00:00Z'),
          open: '50500.00',
          high: '51500.00',
          low: '50000.00',
          close: '51000.00',
          volume: '2345.67',
          trades: 300,
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getHistoricalData(
        'BTC/USD',
        Timeframe.ONE_HOUR,
        new Date('2025-10-01T00:00:00Z'),
        new Date('2025-10-01T23:59:59Z'),
        100,
      );

      expect(result).toHaveLength(2);
      expect(result[0].open).toBe(50000);
      expect(result[0].close).toBe(50500);
      expect(result[1].open).toBe(50500);
      expect(result[1].close).toBe(51000);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ohlcv.symbol = :symbol', { symbol: 'BTC/USD' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('ohlcv.timeframe = :timeframe', { 
        timeframe: Timeframe.ONE_HOUR 
      });
    });

    it('should use cache for repeated queries', async () => {
      const mockData = [
        {
          id: '1',
          symbol: 'BTC/USD',
          timeframe: Timeframe.ONE_HOUR,
          timestamp: new Date('2025-10-01T00:00:00Z'),
          open: '50000.00',
          high: '51000.00',
          low: '49500.00',
          close: '50500.00',
          volume: '1234.56',
          trades: 250,
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // First call - should query database
      const result1 = await service.getHistoricalData('BTC/USD', Timeframe.ONE_HOUR);
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);

      // Second call with same parameters - should use cache
      const result2 = await service.getHistoricalData('BTC/USD', Timeframe.ONE_HOUR);
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1); // Still 1, not called again
      expect(result1).toEqual(result2);
    });

    it('should handle errors gracefully', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getHistoricalData('BTC/USD', Timeframe.ONE_HOUR);
      expect(result).toEqual([]);
    });
  });

  describe('backfillHistoricalData', () => {
    it('should fetch and store historical data from Kraken', async () => {
      const mockKrakenResponse = {
        data: {
          error: [],
          result: {
            'XXBTZUSD': [
              [1696118400, '50000.0', '51000.0', '49500.0', '50500.0', '50250.0', '1234.56', 250],
              [1696122000, '50500.0', '51500.0', '50000.0', '51000.0', '50750.0', '2345.67', 300],
            ],
            last: 1696122000,
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockKrakenResponse);

      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.create.mockImplementation((data) => data as any);

      const result = await service.backfillHistoricalData(
        'BTC/USD',
        Timeframe.ONE_HOUR,
        new Date('2025-10-01T00:00:00Z'),
        new Date('2025-10-01T02:00:00Z'),
      );

      expect(result.success).toBe(true);
      expect(result.candlesImported).toBe(2);
      expect(mockedAxios.get).toHaveBeenCalled();
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should handle Kraken API errors', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          error: ['API key invalid'],
          result: {},
        },
      });

      const result = await service.backfillHistoricalData(
        'BTC/USD',
        Timeframe.ONE_HOUR,
        new Date('2025-10-01T00:00:00Z'),
        new Date('2025-10-01T02:00:00Z'),
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.backfillHistoricalData(
        'BTC/USD',
        Timeframe.ONE_HOUR,
        new Date('2025-10-01T00:00:00Z'),
        new Date('2025-10-01T02:00:00Z'),
      );

      expect(result.success).toBe(false);
      expect(result.candlesImported).toBe(0);
    });

    it('should respect rate limits', async () => {
      const mockKrakenResponse = {
        data: {
          error: [],
          result: {
            'XXBTZUSD': [
              [1696118400, '50000.0', '51000.0', '49500.0', '50500.0', '50250.0', '1234.56', 250],
            ],
            last: 1696118400,
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockKrakenResponse);

      const mockQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.create.mockImplementation((data) => data as any);

      const startTime = Date.now();
      await service.backfillHistoricalData(
        'BTC/USD',
        Timeframe.ONE_HOUR,
        new Date('2025-10-01T00:00:00Z'),
        new Date('2025-10-01T01:00:00Z'),
      );
      const endTime = Date.now();

      // Should take at least 1 second due to rate limiting
      expect(endTime - startTime).toBeGreaterThanOrEqual(900);
    });
  });

  describe('timeframeToMinutes', () => {
    it('should convert timeframes correctly', () => {
      // Access private method through any for testing
      const serviceAny = service as any;
      
      expect(serviceAny.timeframeToMinutes(Timeframe.ONE_MINUTE)).toBe(1);
      expect(serviceAny.timeframeToMinutes(Timeframe.FIVE_MINUTES)).toBe(5);
      expect(serviceAny.timeframeToMinutes(Timeframe.FIFTEEN_MINUTES)).toBe(15);
      expect(serviceAny.timeframeToMinutes(Timeframe.ONE_HOUR)).toBe(60);
      expect(serviceAny.timeframeToMinutes(Timeframe.FOUR_HOURS)).toBe(240);
      expect(serviceAny.timeframeToMinutes(Timeframe.ONE_DAY)).toBe(1440);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('ohlcvCacheSize');
      expect(stats).toHaveProperty('tickerCacheSize');
      expect(stats).toHaveProperty('orderBookCacheSize');
      expect(typeof stats.ohlcvCacheSize).toBe('number');
      expect(typeof stats.tickerCacheSize).toBe('number');
      expect(typeof stats.orderBookCacheSize).toBe('number');
    });
  });
});
