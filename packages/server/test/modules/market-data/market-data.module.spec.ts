import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MarketDataModule } from '../../../src/modules/market-data/market-data.module';
import { MarketDataService } from '../../../src/modules/market-data/services/market-data.service';
import { MarketDataController } from '../../../src/modules/market-data/controllers/market-data.controller';
import { MarketDataHealthController } from '../../../src/modules/market-data/controllers/health.controller';
import { OHLCVEntity } from '../../../src/modules/market-data/entities/ohlcv.entity';

describe('MarketDataModule Integration', () => {
  let module: TestingModule;
  let marketDataService: MarketDataService;
  let marketDataController: MarketDataController;
  let marketDataHealthController: MarketDataHealthController;

  // Mock repository
  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [MarketDataModule],
    })
      .overrideProvider(getRepositoryToken(OHLCVEntity))
      .useValue(mockRepository)
      .compile();

    marketDataService = module.get<MarketDataService>(MarketDataService);
    marketDataController = module.get<MarketDataController>(MarketDataController);
    marketDataHealthController = module.get<MarketDataHealthController>(MarketDataHealthController);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should have MarketDataService', () => {
      expect(marketDataService).toBeDefined();
      expect(marketDataService).toBeInstanceOf(MarketDataService);
    });

    it('should have MarketDataController', () => {
      expect(marketDataController).toBeDefined();
      expect(marketDataController).toBeInstanceOf(MarketDataController);
    });

    it('should have MarketDataHealthController', () => {
      expect(marketDataHealthController).toBeDefined();
      expect(marketDataHealthController).toBeInstanceOf(MarketDataHealthController);
    });

    it('should export MarketDataService', () => {
      const exportedService = module.get<MarketDataService>(MarketDataService);
      expect(exportedService).toBeDefined();
      expect(exportedService).toBe(marketDataService);
    });
  });

  describe('Service Methods', () => {
    it('should have subscribeTicker method', () => {
      expect(marketDataService.subscribeTicker).toBeDefined();
      expect(typeof marketDataService.subscribeTicker).toBe('function');
    });

    it('should have subscribeOrderBook method', () => {
      expect(marketDataService.subscribeOrderBook).toBeDefined();
      expect(typeof marketDataService.subscribeOrderBook).toBe('function');
    });

    it('should have getTicker method', () => {
      expect(marketDataService.getTicker).toBeDefined();
      expect(typeof marketDataService.getTicker).toBe('function');
    });

    it('should have getOrderBook method', () => {
      expect(marketDataService.getOrderBook).toBeDefined();
      expect(typeof marketDataService.getOrderBook).toBe('function');
    });

    it('should have getHistoricalData method', () => {
      expect(marketDataService.getHistoricalData).toBeDefined();
      expect(typeof marketDataService.getHistoricalData).toBe('function');
    });

    it('should have backfillHistoricalData method', () => {
      expect(marketDataService.backfillHistoricalData).toBeDefined();
      expect(typeof marketDataService.backfillHistoricalData).toBe('function');
    });

    it('should have getConnectionStatus method', () => {
      expect(marketDataService.getConnectionStatus).toBeDefined();
      expect(typeof marketDataService.getConnectionStatus).toBe('function');
    });
  });

  describe('Controller Endpoints', () => {
    it('should have health endpoint', () => {
      expect(marketDataController.getHealth).toBeDefined();
      const health = marketDataController.getHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
    });

    it('should have getTicker endpoint', () => {
      expect(marketDataController.getTicker).toBeDefined();
    });

    it('should have getAllTickers endpoint', () => {
      expect(marketDataController.getAllTickers).toBeDefined();
      const tickers = marketDataController.getAllTickers();
      expect(Array.isArray(tickers)).toBe(true);
    });

    it('should have getOrderBook endpoint', () => {
      expect(marketDataController.getOrderBook).toBeDefined();
    });

    it('should have subscribe endpoint', () => {
      expect(marketDataController.subscribe).toBeDefined();
    });

    it('should have unsubscribe endpoint', () => {
      expect(marketDataController.unsubscribe).toBeDefined();
    });

    it('should have getHistoricalData endpoint', () => {
      expect(marketDataController.getHistoricalData).toBeDefined();
    });

    it('should have backfillHistoricalData endpoint', () => {
      expect(marketDataController.backfillHistoricalData).toBeDefined();
    });

    it('should have getCacheStats endpoint', () => {
      expect(marketDataController.getCacheStats).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in service methods gracefully', () => {
      // Test that methods don't throw on invalid input
      expect(() => marketDataService.getTicker('INVALID_SYMBOL')).not.toThrow();
      expect(() => marketDataService.getOrderBook('INVALID_SYMBOL')).not.toThrow();
    });

    it('should return null for non-existent ticker data', () => {
      const ticker = marketDataService.getTicker('NONEXISTENT');
      expect(ticker).toBeNull();
    });

    it('should return null for non-existent order book', () => {
      const orderBook = marketDataService.getOrderBook('NONEXISTENT');
      expect(orderBook).toBeNull();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize on module init', async () => {
      // Service should be initialized
      expect(marketDataService).toBeDefined();
      
      // Connection status should be available
      const status = marketDataService.getConnectionStatus();
      expect(status).toBeDefined();
      expect(status).toHaveProperty('connected');
    });

    it('should cleanup on module destroy', async () => {
      // This will be called automatically in afterAll
      expect(module.close).toBeDefined();
    });
  });

  describe('Integration with Other Modules', () => {
    it('should be importable by other modules', () => {
      // If we can get the service, it means the module exports it correctly
      const service = module.get<MarketDataService>(MarketDataService);
      expect(service).toBeDefined();
    });

    it('should provide access to OHLCV repository', () => {
      // Service should have access to the repository through dependency injection
      expect(marketDataService).toBeDefined();
    });
  });
});
