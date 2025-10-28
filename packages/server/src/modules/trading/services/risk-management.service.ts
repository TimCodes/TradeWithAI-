import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskSettings } from '../entities/risk-settings.entity';
import { Position, PositionStatus } from '../entities/position.entity';
import { Trade } from '../entities/trade.entity';
import {
  RiskCheckRequestDto,
  RiskCheckResponseDto,
  RiskCheckStatus,
  RiskMetrics,
  PositionSizeCalculationDto,
  PositionSizeResponseDto,
  UpdateRiskSettingsDto,
} from '../dto/risk-check.dto';

@Injectable()
export class RiskManagementService {
  private readonly logger = new Logger(RiskManagementService.name);

  constructor(
    @InjectRepository(RiskSettings)
    private readonly riskSettingsRepo: Repository<RiskSettings>,
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    @InjectRepository(Trade)
    private readonly tradeRepo: Repository<Trade>,
  ) {}

  /**
   * Validate if an order passes risk management checks
   */
  async validateOrder(request: RiskCheckRequestDto): Promise<RiskCheckResponseDto> {
    this.logger.log(`Validating order: ${request.symbol} ${request.side} ${request.size} @ ${request.price}`);

    // Get user's risk settings
    const riskSettings = await this.getRiskSettings(request.userId);

    // If risk checks are disabled, approve immediately
    if (!riskSettings.enableRiskChecks) {
      return {
        status: RiskCheckStatus.APPROVED,
        approved: true,
        reasons: ['Risk checks disabled by user'],
        riskMetrics: await this.calculateRiskMetrics(request, riskSettings),
      };
    }

    const reasons: string[] = [];
    const suggestions: string[] = [];
    let status = RiskCheckStatus.APPROVED;

    // Calculate risk metrics
    const metrics = await this.calculateRiskMetrics(request, riskSettings);

    // Check 1: Position size limit per symbol
    if (metrics.exceedsPositionLimit) {
      reasons.push(`Position size ${request.size} exceeds maximum allowed ${riskSettings.maxPositionSize}`);
      suggestions.push(`Reduce position size to ${riskSettings.maxPositionSize} or less`);
      status = RiskCheckStatus.REJECTED;
    }

    // Check 2: Position value limit
    if (metrics.positionSizeUsd > riskSettings.maxPositionValueUsd) {
      reasons.push(`Position value $${metrics.positionSizeUsd.toFixed(2)} exceeds maximum $${riskSettings.maxPositionValueUsd}`);
      suggestions.push(`Reduce position size to stay within $${riskSettings.maxPositionValueUsd} limit`);
      status = RiskCheckStatus.REJECTED;
    }

    // Check 3: Portfolio exposure limit
    if (metrics.exceedsExposureLimit) {
      reasons.push(`Portfolio exposure ${metrics.portfolioExposurePct.toFixed(2)}% exceeds maximum ${riskSettings.maxPortfolioExposure}%`);
      suggestions.push(`Close some positions or reduce order size to lower exposure`);
      status = RiskCheckStatus.REJECTED;
    }

    // Check 4: Maximum positions count
    if (metrics.currentPositionsCount >= riskSettings.maxPositionsCount && request.side === 'buy') {
      reasons.push(`Already at maximum positions count (${riskSettings.maxPositionsCount})`);
      suggestions.push(`Close an existing position before opening a new one`);
      status = RiskCheckStatus.REJECTED;
    }

    // Check 5: Drawdown protection
    if (metrics.exceedsDrawdownLimit && riskSettings.enableDrawdownProtection) {
      reasons.push(`Current drawdown ${metrics.currentDrawdownPct.toFixed(2)}% exceeds maximum ${riskSettings.maxDrawdownPct}%`);
      suggestions.push(`Trading halted due to excessive drawdown. Wait for recovery.`);
      status = RiskCheckStatus.REJECTED;
    }

    // Check 6: Daily loss limit
    if (metrics.exceedsDailyLossLimit) {
      reasons.push(`Daily loss $${metrics.dailyLossUsd.toFixed(2)} exceeds maximum $${riskSettings.maxDailyLossUsd}`);
      suggestions.push(`Daily loss limit reached. No more trades today.`);
      status = RiskCheckStatus.REJECTED;
    }

    // Check 7: Available balance
    if (metrics.positionSizeUsd > metrics.availableBalance) {
      reasons.push(`Insufficient balance. Required: $${metrics.positionSizeUsd.toFixed(2)}, Available: $${metrics.availableBalance.toFixed(2)}`);
      suggestions.push(`Reduce position size or add more funds`);
      status = RiskCheckStatus.REJECTED;
    }

    // Warning checks (doesn't reject, but warns)
    if (metrics.riskPct > riskSettings.riskPerTradePct) {
      reasons.push(`Risk per trade ${metrics.riskPct.toFixed(2)}% exceeds recommended ${riskSettings.riskPerTradePct}%`);
      if (status === RiskCheckStatus.APPROVED) {
        status = RiskCheckStatus.WARNING;
      }
    }

    if (status === RiskCheckStatus.APPROVED && reasons.length === 0) {
      reasons.push('All risk checks passed');
    }

    this.logger.log(`Risk check result: ${status} - ${reasons.join(', ')}`);

    return {
      status,
      approved: status !== RiskCheckStatus.REJECTED,
      reasons,
      riskMetrics: metrics,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Calculate recommended position size based on risk parameters
   */
  async calculatePositionSize(request: PositionSizeCalculationDto): Promise<PositionSizeResponseDto> {
    const riskSettings = await this.getRiskSettings(request.userId);
    const riskPct = request.riskPercentage || riskSettings.riskPerTradePct;

    // Get available balance
    const positions = await this.positionRepo.find({
      where: { userId: request.userId, status: PositionStatus.OPEN },
    });
    
    // Calculate total position value using quantity * currentPrice
    const totalPositionValue = positions.reduce((sum, p) => {
      const quantity = parseFloat(p.quantity);
      const currentPrice = parseFloat(p.currentPrice || p.entryPrice);
      return sum + (quantity * currentPrice);
    }, 0);
    
    const availableBalance = 100000; // TODO: Get from exchange or balance service
    const portfolioValue = availableBalance + totalPositionValue;

    // Calculate risk amount (amount willing to lose)
    const riskAmount = portfolioValue * (riskPct / 100);

    // Calculate position size based on stop loss
    let recommendedSize: number;
    let reasoning: string;

    if (request.stopLossPrice && request.stopLossPrice > 0) {
      // Calculate size based on stop loss distance
      const stopLossDistance = Math.abs(request.entryPrice - request.stopLossPrice);
      const stopLossPct = (stopLossDistance / request.entryPrice) * 100;
      
      // Size = Risk Amount / (Entry Price * Stop Loss %)
      recommendedSize = riskAmount / (request.entryPrice * (stopLossPct / 100));
      reasoning = `Position sized for ${riskPct}% risk with ${stopLossPct.toFixed(2)}% stop loss`;
    } else {
      // Use default stop loss percentage
      const defaultStopLossPct = riskSettings.defaultStopLossPct;
      recommendedSize = riskAmount / (request.entryPrice * (defaultStopLossPct / 100));
      reasoning = `Position sized for ${riskPct}% risk with default ${defaultStopLossPct}% stop loss`;
    }

    // Apply maximum position size constraint
    const maxSize = Math.min(
      riskSettings.maxPositionSize,
      riskSettings.maxPositionValueUsd / request.entryPrice,
    );

    if (recommendedSize > maxSize) {
      recommendedSize = maxSize;
      reasoning += ` (limited by max position size)`;
    }

    const positionValue = recommendedSize * request.entryPrice;

    return {
      recommendedSize: parseFloat(recommendedSize.toFixed(8)),
      maxSize: parseFloat(maxSize.toFixed(8)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      positionValue: parseFloat(positionValue.toFixed(2)),
      reasoning,
    };
  }

  /**
   * Calculate risk metrics for an order
   */
  private async calculateRiskMetrics(
    request: RiskCheckRequestDto,
    riskSettings: RiskSettings,
  ): Promise<RiskMetrics> {
    // Get current positions
    const positions = await this.positionRepo.find({
      where: { userId: request.userId, status: PositionStatus.OPEN },
    });

    const currentPositionsCount = positions.length;
    
    // Calculate total position value using quantity * currentPrice
    const totalPositionValue = positions.reduce((sum, p) => {
      const quantity = parseFloat(p.quantity);
      const currentPrice = parseFloat(p.currentPrice || p.entryPrice);
      return sum + (quantity * currentPrice);
    }, 0);

    // Calculate new position value
    const positionSizeUsd = request.size * request.price;

    // Get available balance (TODO: integrate with actual balance service)
    const availableBalance = 100000; // Placeholder
    const portfolioValue = availableBalance + totalPositionValue;

    // Calculate portfolio exposure
    const newTotalExposure = request.side === 'buy' ? totalPositionValue + positionSizeUsd : totalPositionValue;
    const portfolioExposurePct = (newTotalExposure / portfolioValue) * 100;

    // Calculate risk metrics
    const stopLossPct = riskSettings.defaultStopLossPct;
    const riskAmountUsd = positionSizeUsd * (stopLossPct / 100);
    const riskPct = (riskAmountUsd / portfolioValue) * 100;

    // Calculate current drawdown
    const currentDrawdownPct = await this.calculateCurrentDrawdown(request.userId, portfolioValue);

    // Calculate daily loss
    const dailyLossUsd = await this.calculateDailyLoss(request.userId);

    // Check limits
    const exceedsPositionLimit = request.size > riskSettings.maxPositionSize;
    const exceedsExposureLimit = portfolioExposurePct > riskSettings.maxPortfolioExposure;
    const exceedsDrawdownLimit = currentDrawdownPct > riskSettings.maxDrawdownPct;
    const exceedsDailyLossLimit = riskSettings.maxDailyLossUsd !== null && dailyLossUsd > riskSettings.maxDailyLossUsd;

    return {
      positionSizeUsd,
      portfolioExposurePct,
      riskAmountUsd,
      riskPct,
      maxPositionSize: riskSettings.maxPositionSize,
      availableBalance,
      currentPositionsCount,
      currentDrawdownPct,
      dailyLossUsd,
      exceedsPositionLimit,
      exceedsExposureLimit,
      exceedsDrawdownLimit,
      exceedsDailyLossLimit,
    };
  }

  /**
   * Calculate current drawdown percentage
   */
  private async calculateCurrentDrawdown(userId: string, currentValue: number): Promise<number> {
    // Get all trades to find peak portfolio value
    const trades = await this.tradeRepo.find({
      where: { userId },
      order: { executedAt: 'ASC' },
    });

    if (trades.length === 0) {
      return 0;
    }

    // Calculate peak value (simplified - in production, track this separately)
    const initialValue = 100000; // TODO: Get initial portfolio value
    const peakValue = Math.max(currentValue, initialValue);

    // Drawdown = (Peak - Current) / Peak * 100
    const drawdown = ((peakValue - currentValue) / peakValue) * 100;

    return Math.max(0, drawdown);
  }

  /**
   * Calculate total loss for today
   */
  private async calculateDailyLoss(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaysTrades = await this.tradeRepo
      .createQueryBuilder('trade')
      .where('trade.userId = :userId', { userId })
      .andWhere('trade.executedAt >= :startOfDay', { startOfDay })
      .getMany();

    // Calculate net P&L for today
    const dailyPnL = todaysTrades.reduce((sum, trade) => {
      // Use realizedPnl if available, otherwise calculate from value
      const pnl = trade.realizedPnl ? parseFloat(trade.realizedPnl) : 0;
      return sum + pnl;
    }, 0);

    // Return absolute loss (negative P&L)
    return Math.abs(Math.min(0, dailyPnL));
  }

  /**
   * Get or create risk settings for a user
   */
  async getRiskSettings(userId: string): Promise<RiskSettings> {
    let settings = await this.riskSettingsRepo.findOne({
      where: { userId },
    });

    if (!settings) {
      // Create default settings
      settings = this.riskSettingsRepo.create({
        userId,
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
      });

      settings = await this.riskSettingsRepo.save(settings);
      this.logger.log(`Created default risk settings for user ${userId}`);
    }

    return settings;
  }

  /**
   * Update risk settings for a user
   */
  async updateRiskSettings(userId: string, updates: UpdateRiskSettingsDto): Promise<RiskSettings> {
    let settings = await this.getRiskSettings(userId);

    // Update fields
    Object.assign(settings, updates);

    settings = await this.riskSettingsRepo.save(settings);
    this.logger.log(`Updated risk settings for user ${userId}`);

    return settings;
  }

  /**
   * Check if automatic stop loss should be placed
   */
  shouldPlaceAutomaticStopLoss(riskSettings: RiskSettings): boolean {
    return riskSettings.enableAutomaticStopLoss;
  }

  /**
   * Calculate stop loss price for a position
   */
  calculateStopLossPrice(
    entryPrice: number,
    side: 'buy' | 'sell',
    stopLossPct: number,
  ): number {
    if (side === 'buy') {
      // For long positions, stop loss is below entry
      return entryPrice * (1 - stopLossPct / 100);
    } else {
      // For short positions, stop loss is above entry
      return entryPrice * (1 + stopLossPct / 100);
    }
  }

  /**
   * Monitor positions and trigger stop loss if needed
   */
  async monitorPositionsForStopLoss(userId: string): Promise<string[]> {
    const riskSettings = await this.getRiskSettings(userId);

    if (!riskSettings.enableAutomaticStopLoss) {
      return [];
    }

    const positions = await this.positionRepo.find({
      where: { userId, status: PositionStatus.OPEN },
    });

    const triggeredStopLosses: string[] = [];

    for (const position of positions) {
      const stopLossPrice = this.calculateStopLossPrice(
        parseFloat(position.entryPrice.toString()),
        position.side,
        riskSettings.defaultStopLossPct,
      );

      const currentPrice = parseFloat(position.currentPrice.toString());

      // Check if stop loss is triggered
      const stopLossTriggered =
        (position.side === 'buy' && currentPrice <= stopLossPrice) ||
        (position.side === 'sell' && currentPrice >= stopLossPrice);

      if (stopLossTriggered) {
        this.logger.warn(
          `Stop loss triggered for position ${position.id}: ${position.symbol} ${position.side} @ ${stopLossPrice}`,
        );
        triggeredStopLosses.push(position.id);
      }
    }

    return triggeredStopLosses;
  }
}
