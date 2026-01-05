import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Trade } from '../../trading/entities/trade.entity';
import { Order, OrderStatus } from '../../trading/entities/order.entity';

export interface ModelPerformanceStats {
  provider: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  averagePnl: number;
  averageConfidence: number;
  confidenceCorrelation: number;
  bestTrade: number;
  worstTrade: number;
  lastTradeDate: Date | null;
}

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class LlmAnalyticsService {
  private readonly logger = new Logger(LlmAnalyticsService.name);

  constructor(
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Get performance statistics for all LLM providers
   */
  async getModelPerformanceStats(
    userId: string,
    dateRange?: DateRange,
  ): Promise<ModelPerformanceStats[]> {
    this.logger.log(
      `Fetching model performance stats for user ${userId} with date range ${JSON.stringify(dateRange)}`,
    );

    // Build where clause for date filtering
    const whereClause: any = {
      userId,
      llmProvider: Not(null),
    };

    if (dateRange?.startDate && dateRange?.endDate) {
      whereClause.createdAt = Between(dateRange.startDate, dateRange.endDate);
    } else if (dateRange?.startDate) {
      whereClause.createdAt = MoreThanOrEqual(dateRange.startDate);
    } else if (dateRange?.endDate) {
      whereClause.createdAt = LessThanOrEqual(dateRange.endDate);
    }

    // Get all trades with LLM provider attribution
    const trades = await this.tradeRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    if (trades.length === 0) {
      this.logger.log('No LLM-attributed trades found');
      return [];
    }

    // Group trades by provider
    const tradesByProvider = this.groupTradesByProvider(trades);

    // Calculate stats for each provider
    const performanceStats = await Promise.all(
      Object.entries(tradesByProvider).map(([provider, providerTrades]) =>
        this.calculateProviderStats(provider, providerTrades),
      ),
    );

    // Sort by total PnL descending
    return performanceStats.sort((a, b) => b.totalPnl - a.totalPnl);
  }

  /**
   * Get performance stats for a specific LLM provider
   */
  async getProviderPerformanceStats(
    userId: string,
    provider: string,
    dateRange?: DateRange,
  ): Promise<ModelPerformanceStats | null> {
    const whereClause: any = {
      userId,
      llmProvider: provider,
    };

    if (dateRange?.startDate && dateRange?.endDate) {
      whereClause.createdAt = Between(dateRange.startDate, dateRange.endDate);
    } else if (dateRange?.startDate) {
      whereClause.createdAt = MoreThanOrEqual(dateRange.startDate);
    } else if (dateRange?.endDate) {
      whereClause.createdAt = LessThanOrEqual(dateRange.endDate);
    }

    const trades = await this.tradeRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    if (trades.length === 0) {
      return null;
    }

    return this.calculateProviderStats(provider, trades);
  }

  /**
   * Group trades by LLM provider
   */
  private groupTradesByProvider(trades: Trade[]): Record<string, Trade[]> {
    return trades.reduce(
      (acc, trade) => {
        const provider = trade.llmProvider || 'unknown';
        if (!acc[provider]) {
          acc[provider] = [];
        }
        acc[provider].push(trade);
        return acc;
      },
      {} as Record<string, Trade[]>,
    );
  }

  /**
   * Calculate performance statistics for a provider's trades
   */
  private async calculateProviderStats(
    provider: string,
    trades: Trade[],
  ): Promise<ModelPerformanceStats> {
    // Filter trades with realized PnL (completed positions)
    const completedTrades = trades.filter(
      (t) => t.realizedPnl !== null && t.realizedPnl !== undefined,
    );

    let totalPnl = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let bestTrade = 0;
    let worstTrade = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    const confidenceVsPnl: Array<{ confidence: number; pnl: number }> = [];

    completedTrades.forEach((trade) => {
      const pnl = parseFloat(trade.realizedPnl || '0');
      totalPnl += pnl;

      if (pnl > 0) {
        winningTrades++;
      } else if (pnl < 0) {
        losingTrades++;
      }

      if (pnl > bestTrade) {
        bestTrade = pnl;
      }
      if (pnl < worstTrade) {
        worstTrade = pnl;
      }

      // Track confidence scores
      if (trade.llmConfidence !== null && trade.llmConfidence !== undefined) {
        const confidence = parseFloat(trade.llmConfidence);
        totalConfidence += confidence;
        confidenceCount++;
        confidenceVsPnl.push({ confidence, pnl });
      }
    });

    const totalCompletedTrades = completedTrades.length;
    const winRate =
      totalCompletedTrades > 0 ? (winningTrades / totalCompletedTrades) * 100 : 0;
    const averagePnl = totalCompletedTrades > 0 ? totalPnl / totalCompletedTrades : 0;
    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    // Calculate confidence correlation (simple correlation coefficient)
    const confidenceCorrelation = this.calculateCorrelation(confidenceVsPnl);

    // Get last trade date
    const lastTradeDate =
      trades.length > 0 ? new Date(trades[0].createdAt) : null;

    return {
      provider,
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRate,
      totalPnl,
      averagePnl,
      averageConfidence,
      confidenceCorrelation,
      bestTrade,
      worstTrade,
      lastTradeDate,
    };
  }

  /**
   * Calculate Pearson correlation coefficient between confidence and PnL
   * Returns value between -1 and 1
   * 1 = perfect positive correlation
   * 0 = no correlation
   * -1 = perfect negative correlation
   */
  private calculateCorrelation(
    data: Array<{ confidence: number; pnl: number }>,
  ): number {
    if (data.length < 2) {
      return 0;
    }

    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    data.forEach(({ confidence, pnl }) => {
      sumX += confidence;
      sumY += pnl;
      sumXY += confidence * pnl;
      sumX2 += confidence * confidence;
      sumY2 += pnl * pnl;
    });

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }

  /**
   * Get top performing providers
   */
  async getTopProviders(
    userId: string,
    limit: number = 5,
    dateRange?: DateRange,
  ): Promise<ModelPerformanceStats[]> {
    const stats = await this.getModelPerformanceStats(userId, dateRange);
    return stats.slice(0, limit);
  }

  /**
   * Compare two providers head-to-head
   */
  async compareProviders(
    userId: string,
    provider1: string,
    provider2: string,
    dateRange?: DateRange,
  ): Promise<{
    provider1: ModelPerformanceStats | null;
    provider2: ModelPerformanceStats | null;
    winner: string | null;
  }> {
    const [stats1, stats2] = await Promise.all([
      this.getProviderPerformanceStats(userId, provider1, dateRange),
      this.getProviderPerformanceStats(userId, provider2, dateRange),
    ]);

    let winner: string | null = null;
    if (stats1 && stats2) {
      winner = stats1.totalPnl > stats2.totalPnl ? provider1 : provider2;
    } else if (stats1) {
      winner = provider1;
    } else if (stats2) {
      winner = provider2;
    }

    return {
      provider1: stats1,
      provider2: stats2,
      winner,
    };
  }
}

// Import Not from typeorm
import { Not } from 'typeorm';
