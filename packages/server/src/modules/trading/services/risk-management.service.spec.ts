import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskManagementService } from './risk-management.service';
import { RiskSettings } from '../entities/risk-settings.entity';
import { Position, PositionStatus } from '../entities/position.entity';
import { Trade } from '../entities/trade.entity';
import { RiskCheckStatus } from '../dto/risk-check.dto';
import { OrderSide } from '../entities/order.entity';

describe('RiskManagementService', () => {
  let service: RiskManagementService;
  let riskSettingsRepo: Repository<RiskSettings>;
  let positionRepo: Repository<Position>;
  let tradeRepo: Repository<Trade>;

  const mockRiskSettings: RiskSettings = {
    id: '1',
    userId: 'user1',
    user: null,
    maxPositionSize: 1.0,
    maxPositionValueUsd: 10000,
    maxPortfolioExposure: 80,
    maxPositionsCount: 10,
    defaultStopLossPct: 5,
    enableAutomaticStopLoss: true,
    maxDrawdownPct: 20,
    enableDrawdownProtection: true,
    riskPerTradePct: 2,
    maxDailyLossUsd: null,
    enableRiskChecks: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskManagementService,
        {
          provide: getRepositoryToken(RiskSettings),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Position),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Trade),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RiskManagementService>(RiskManagementService);
    riskSettingsRepo = module.get<Repository<RiskSettings>>(getRepositoryToken(RiskSettings));
    positionRepo = module.get<Repository<Position>>(getRepositoryToken(Position));
    tradeRepo = module.get<Repository<Trade>>(getRepositoryToken(Trade));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRiskSettings', () => {
    it('should return existing risk settings', async () => {
      jest.spyOn(riskSettingsRepo, 'findOne').mockResolvedValue(mockRiskSettings);

      const result = await service.getRiskSettings('user1');

      expect(result).toEqual(mockRiskSettings);
      expect(riskSettingsRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });
    });

    it('should create default settings if none exist', async () => {
      jest.spyOn(riskSettingsRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(riskSettingsRepo, 'create').mockReturnValue(mockRiskSettings as any);
      jest.spyOn(riskSettingsRepo, 'save').mockResolvedValue(mockRiskSettings);

      const result = await service.getRiskSettings('user1');

      expect(result).toEqual(mockRiskSettings);
      expect(riskSettingsRepo.create).toHaveBeenCalled();
      expect(riskSettingsRepo.save).toHaveBeenCalled();
    });
  });

  describe('validateOrder', () => {
    beforeEach(() => {
      jest.spyOn(service, 'getRiskSettings').mockResolvedValue(mockRiskSettings);
      jest.spyOn(positionRepo, 'find').mockResolvedValue([]);
    });

    it('should approve order that passes all checks', async () => {
      const result = await service.validateOrder({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        side: 'buy',
        size: 0.5,
        price: 50000,
        orderType: 'market',
      });

      expect(result.status).toBe(RiskCheckStatus.APPROVED);
      expect(result.approved).toBe(true);
      expect(result.reasons).toContain('All risk checks passed');
    });

    it('should reject order exceeding position size limit', async () => {
      const result = await service.validateOrder({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        side: 'buy',
        size: 1.5, // Exceeds max of 1.0
        price: 50000,
        orderType: 'market',
      });

      expect(result.status).toBe(RiskCheckStatus.REJECTED);
      expect(result.approved).toBe(false);
      expect(result.reasons[0]).toContain('exceeds maximum allowed');
    });

    it('should reject order exceeding position value limit', async () => {
      const result = await service.validateOrder({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        side: 'buy',
        size: 0.5,
        price: 100000, // Value = 50000, exceeds limit of 10000
        orderType: 'market',
      });

      expect(result.status).toBe(RiskCheckStatus.REJECTED);
      expect(result.approved).toBe(false);
      expect(result.reasons[0]).toContain('Position value');
    });

    it('should reject order when at max positions count', async () => {
      // Mock 10 open positions
      const mockPositions = Array(10).fill(null).map((_, i) => ({
        id: `pos${i}`,
        userId: 'user1',
        symbol: 'XXBTZUSD',
        side: OrderSide.BUY,
        status: PositionStatus.OPEN,
        quantity: '0.1',
        entryPrice: '50000',
        currentPrice: '51000',
      }));

      jest.spyOn(positionRepo, 'find').mockResolvedValue(mockPositions as any);

      const result = await service.validateOrder({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        side: 'buy',
        size: 0.1,
        price: 50000,
        orderType: 'market',
      });

      expect(result.status).toBe(RiskCheckStatus.REJECTED);
      expect(result.approved).toBe(false);
      expect(result.reasons[0]).toContain('maximum positions count');
    });

    it('should approve order when risk checks are disabled', async () => {
      jest.spyOn(service, 'getRiskSettings').mockResolvedValue({
        ...mockRiskSettings,
        enableRiskChecks: false,
      });

      const result = await service.validateOrder({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        side: 'buy',
        size: 10, // Would normally fail
        price: 100000,
        orderType: 'market',
      });

      expect(result.status).toBe(RiskCheckStatus.APPROVED);
      expect(result.approved).toBe(true);
      expect(result.reasons).toContain('Risk checks disabled by user');
    });

    it('should issue warning for high risk percentage', async () => {
      const result = await service.validateOrder({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        side: 'buy',
        size: 0.8,
        price: 50000,
        orderType: 'market',
      });

      // Should still approve but with warning
      expect(result.approved).toBe(true);
      expect(result.status).toBe(RiskCheckStatus.WARNING);
      expect(result.reasons.some(r => r.includes('Risk per trade'))).toBe(true);
    });
  });

  describe('calculatePositionSize', () => {
    beforeEach(() => {
      jest.spyOn(service, 'getRiskSettings').mockResolvedValue(mockRiskSettings);
      jest.spyOn(positionRepo, 'find').mockResolvedValue([]);
    });

    it('should calculate position size with stop loss', async () => {
      const result = await service.calculatePositionSize({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        entryPrice: 50000,
        stopLossPrice: 47500, // 5% stop loss
      });

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.maxSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBe(2040); // 2% of 102000 portfolio
      expect(result.reasoning).toContain('risk');
    });

    it('should calculate position size without stop loss (use default)', async () => {
      const result = await service.calculatePositionSize({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        entryPrice: 50000,
      });

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.reasoning).toContain('default');
      expect(result.reasoning).toContain('5%');
    });

    it('should limit size to max position size', async () => {
      const result = await service.calculatePositionSize({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        entryPrice: 1000, // Low price would allow large size
        stopLossPrice: 950,
      });

      expect(result.recommendedSize).toBeLessThanOrEqual(result.maxSize);
      expect(result.maxSize).toBe(1.0); // From mockRiskSettings
    });

    it('should use custom risk percentage', async () => {
      const result = await service.calculatePositionSize({
        userId: 'user1',
        symbol: 'XXBTZUSD',
        entryPrice: 50000,
        stopLossPrice: 47500,
        riskPercentage: 1, // Override default 2%
      });

      expect(result.riskAmount).toBe(1020); // 1% instead of 2%
      expect(result.reasoning).toContain('1%');
    });
  });

  describe('calculateStopLossPrice', () => {
    it('should calculate stop loss for buy order', () => {
      const result = service.calculateStopLossPrice(50000, 'buy', 5);
      expect(result).toBe(47500); // 5% below entry
    });

    it('should calculate stop loss for sell order', () => {
      const result = service.calculateStopLossPrice(50000, 'sell', 5);
      expect(result).toBe(52500); // 5% above entry
    });
  });

  describe('shouldPlaceAutomaticStopLoss', () => {
    it('should return true when enabled', () => {
      const result = service.shouldPlaceAutomaticStopLoss(mockRiskSettings);
      expect(result).toBe(true);
    });

    it('should return false when disabled', () => {
      const result = service.shouldPlaceAutomaticStopLoss({
        ...mockRiskSettings,
        enableAutomaticStopLoss: false,
      });
      expect(result).toBe(false);
    });
  });

  describe('monitorPositionsForStopLoss', () => {
    it('should detect triggered stop loss for buy position', async () => {
      jest.spyOn(service, 'getRiskSettings').mockResolvedValue(mockRiskSettings);
      
      const mockPositions = [{
        id: 'pos1',
        userId: 'user1',
        symbol: 'XXBTZUSD',
        side: OrderSide.BUY,
        status: PositionStatus.OPEN,
        quantity: '0.1',
        entryPrice: '50000',
        currentPrice: '47000', // Below 5% stop loss
      }];

      jest.spyOn(positionRepo, 'find').mockResolvedValue(mockPositions as any);

      const result = await service.monitorPositionsForStopLoss('user1');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('pos1');
    });

    it('should detect triggered stop loss for sell position', async () => {
      jest.spyOn(service, 'getRiskSettings').mockResolvedValue(mockRiskSettings);
      
      const mockPositions = [{
        id: 'pos1',
        userId: 'user1',
        symbol: 'XXBTZUSD',
        side: OrderSide.SELL,
        status: PositionStatus.OPEN,
        quantity: '0.1',
        entryPrice: '50000',
        currentPrice: '53000', // Above 5% stop loss
      }];

      jest.spyOn(positionRepo, 'find').mockResolvedValue(mockPositions as any);

      const result = await service.monitorPositionsForStopLoss('user1');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('pos1');
    });

    it('should not trigger stop loss when disabled', async () => {
      jest.spyOn(service, 'getRiskSettings').mockResolvedValue({
        ...mockRiskSettings,
        enableAutomaticStopLoss: false,
      });

      const result = await service.monitorPositionsForStopLoss('user1');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateRiskSettings', () => {
    it('should update risk settings', async () => {
      jest.spyOn(service, 'getRiskSettings').mockResolvedValue(mockRiskSettings);
      jest.spyOn(riskSettingsRepo, 'save').mockResolvedValue({
        ...mockRiskSettings,
        maxPositionSize: 2.0,
      });

      const result = await service.updateRiskSettings('user1', {
        maxPositionSize: 2.0,
      });

      expect(result.maxPositionSize).toBe(2.0);
      expect(riskSettingsRepo.save).toHaveBeenCalled();
    });
  });
});
