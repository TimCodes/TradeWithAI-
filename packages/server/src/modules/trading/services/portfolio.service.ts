import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Position, PositionStatus } from '../entities/position.entity';
import { Trade } from '../entities/trade.entity';
import { Order } from '../entities/order.entity';

export enum Timeframe {
  DAY = '24h',
  WEEK = '7d',
  MONTH = '30d',
  ALL = 'all',
}

export interface EquityPoint {
  timestamp: Date;
  value: number;
  totalPnl: number;
}

export interface AssetAllocation {
  symbol: string;
  value: number;
  percentage: number;
  unrealizedPnl: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  roi: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
}

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Calculate equity curve over time
   */
  async getEquityCurve(userId: string, timeframe: Timeframe): Promise<EquityPoint[]> {
    const startDate = this.getStartDate(timeframe);
    
    // Get all trades in the timeframe
    const trades = await this.tradeRepository.find({
      where: {
        userId,
        executedAt: startDate ? MoreThan(startDate) : undefined,
      },
      order: { executedAt: 'ASC' },
    });

    // Calculate cumulative equity
    const equityCurve: EquityPoint[] = [];
    let cumulativePnl = 0;
    const initialBalance = 10000; // TODO: Get from user settings

    // Group trades by day
    const tradesByDay = new Map<string, Trade[]>();
    for (const trade of trades) {
      if (!trade.executedAt) continue;
      
      const dateKey = trade.executedAt.toISOString().split('T')[0];
      if (!tradesByDay.has(dateKey)) {
        tradesByDay.set(dateKey, []);
      }
      tradesByDay.get(dateKey)!.push(trade);
    }

    // Create equity points
    for (const [dateKey, dayTrades] of tradesByDay.entries()) {
      const dayPnl = dayTrades.reduce((sum, t) => {
        return sum + (t.realizedPnl ? parseFloat(t.realizedPnl) : 0);
      }, 0);

      cumulativePnl += dayPnl;

      equityCurve.push({
        timestamp: new Date(dateKey),
        value: initialBalance + cumulativePnl,
        totalPnl: cumulativePnl,
      });
    }

    // If no data, return current balance
    if (equityCurve.length === 0) {
      equityCurve.push({
        timestamp: new Date(),
        value: initialBalance,
        totalPnl: 0,
      });
    }

    return equityCurve;
  }

  /**
   * Get asset allocation across open positions
   */
  async getAssetAllocation(userId: string): Promise<AssetAllocation[]> {
    const openPositions = await this.positionRepository.find({
      where: {
        userId,
        status: PositionStatus.OPEN,
      },
    });

    if (openPositions.length === 0) {
      return [];
    }

    // Calculate total portfolio value
    const totalValue = openPositions.reduce((sum, pos) => {
      const posValue = parseFloat(pos.quantity) * parseFloat(pos.currentPrice || pos.entryPrice);
      return sum + posValue;
    }, 0);

    // Build allocation data
    const allocation: AssetAllocation[] = openPositions.map((pos) => {
      const posValue = parseFloat(pos.quantity) * parseFloat(pos.currentPrice || pos.entryPrice);
      const percentage = totalValue > 0 ? (posValue / totalValue) * 100 : 0;

      return {
        symbol: pos.symbol,
        value: posValue,
        percentage,
        unrealizedPnl: parseFloat(pos.unrealizedPnl),
      };
    });

    // Sort by value descending
    return allocation.sort((a, b) => b.value - a.value);
  }

  /**
   * Calculate comprehensive portfolio metrics
   */
  async getPortfolioMetrics(userId: string, timeframe: Timeframe): Promise<PortfolioMetrics> {
    const startDate = this.getStartDate(timeframe);

    // Get all positions
    const positions = await this.positionRepository.find({
      where: {
        userId,
        createdAt: startDate ? MoreThan(startDate) : undefined,
      },
    });

    // Calculate P&L
    const realizedPnl = positions.reduce(
      (sum, pos) => sum + parseFloat(pos.realizedPnl),
      0,
    );

    const openPositions = positions.filter((p) => p.status === PositionStatus.OPEN);
    const unrealizedPnl = openPositions.reduce(
      (sum, pos) => sum + parseFloat(pos.unrealizedPnl),
      0,
    );

    const totalPnl = realizedPnl + unrealizedPnl;

    // Calculate total portfolio value
    const totalValue = openPositions.reduce((sum, pos) => {
      const posValue = parseFloat(pos.quantity) * parseFloat(pos.currentPrice || pos.entryPrice);
      return sum + posValue;
    }, 0);

    // Calculate initial investment
    const initialInvestment = positions.reduce(
      (sum, pos) => sum + parseFloat(pos.costBasis),
      0,
    );

    // ROI calculation
    const roi = initialInvestment > 0 ? (totalPnl / initialInvestment) * 100 : 0;

    // Get equity curve for drawdown and Sharpe
    const equityCurve = await this.getEquityCurve(userId, timeframe);
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve);
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);

    // Win rate calculation
    const closedPositions = positions.filter((p) => p.status === PositionStatus.CLOSED);
    const winningTrades = closedPositions.filter(
      (p) => parseFloat(p.realizedPnl) > 0,
    ).length;
    const winRate = closedPositions.length > 0
      ? (winningTrades / closedPositions.length) * 100
      : 0;

    return {
      totalValue,
      totalPnl,
      realizedPnl,
      unrealizedPnl,
      roi,
      maxDrawdown,
      sharpeRatio,
      winRate,
      totalTrades: closedPositions.length,
    };
  }

  /**
   * Calculate maximum drawdown from equity curve
   */
  private calculateMaxDrawdown(equityCurve: EquityPoint[]): number {
    if (equityCurve.length === 0) return 0;

    let maxDrawdown = 0;
    let peak = equityCurve[0].value;

    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }

      const drawdown = ((peak - point.value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate Sharpe ratio (annualized)
   * Assumes risk-free rate of 2%
   */
  private calculateSharpeRatio(equityCurve: EquityPoint[]): number {
    if (equityCurve.length < 2) return 0;

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevValue = equityCurve[i - 1].value;
      const currValue = equityCurve[i].value;
      const dailyReturn = (currValue - prevValue) / prevValue;
      returns.push(dailyReturn);
    }

    if (returns.length === 0) return 0;

    // Calculate mean and standard deviation
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => {
      return sum + Math.pow(ret - meanReturn, 2);
    }, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualize (assuming 252 trading days)
    const annualizedReturn = meanReturn * 252;
    const annualizedStdDev = stdDev * Math.sqrt(252);
    const riskFreeRate = 0.02; // 2%

    const sharpe = (annualizedReturn - riskFreeRate) / annualizedStdDev;
    return sharpe;
  }

  /**
   * Get start date based on timeframe
   */
  private getStartDate(timeframe: Timeframe): Date | null {
    const now = new Date();
    
    switch (timeframe) {
      case Timeframe.DAY:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case Timeframe.WEEK:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case Timeframe.MONTH:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case Timeframe.ALL:
      default:
        return null; // No filter
    }
  }
}
