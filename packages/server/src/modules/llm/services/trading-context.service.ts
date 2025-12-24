import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderSide, OrderType, OrderStatus } from '../../trading/entities/order.entity';
import { Position, PositionStatus } from '../../trading/entities/position.entity';
import { OHLCVEntity } from '../../market-data/entities/ohlcv.entity';

export interface TradingContext {
  balance: {
    currency: string;
    available: number;
    reserved: number;
    total: number;
  }[];
  positions: {
    id: string;
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnl: number;
    unrealizedPnlPercent: number;
  }[];
  recentOrders: {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    size: number;
    price?: number;
    status: string;
    createdAt: Date;
  }[];
  marketPrices: {
    symbol: string;
    price: number;
    change24h: number;
    volume24h: number;
  }[];
  timestamp: Date;
}

@Injectable()
export class TradingContextService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(OHLCVEntity)
    private ohlcvRepository: Repository<OHLCVEntity>,
  ) {}

  /**
   * Get current trading context for a user
   */
  async getTradingContext(userId: string): Promise<TradingContext> {
    const [balance, positions, recentOrders, marketPrices] = await Promise.all([
      this.getUserBalance(userId),
      this.getUserPositions(userId),
      this.getRecentOrders(userId),
      this.getCurrentMarketPrices(),
    ]);

    return {
      balance,
      positions,
      recentOrders,
      marketPrices,
      timestamp: new Date(),
    };
  }

  /**
   * Format trading context as a structured prompt for LLM
   */
  formatContextPrompt(context: TradingContext): string {
    const lines: string[] = [];

    lines.push('=== CURRENT TRADING CONTEXT ===');
    lines.push(`Timestamp: ${context.timestamp.toISOString()}`);
    lines.push('');

    // Balance section
    lines.push('📊 ACCOUNT BALANCE:');
    context.balance.forEach((bal) => {
      lines.push(
        `  ${bal.currency}: ${bal.total.toFixed(2)} (Available: ${bal.available.toFixed(2)}, Reserved: ${bal.reserved.toFixed(2)})`,
      );
    });
    lines.push('');

    // Positions section
    if (context.positions.length > 0) {
      lines.push('📈 OPEN POSITIONS:');
      context.positions.forEach((pos) => {
        const pnlSign = pos.unrealizedPnl >= 0 ? '+' : '';
        lines.push(
          `  ${pos.symbol} ${pos.side.toUpperCase()}: ${pos.size} @ $${pos.entryPrice} (Current: $${pos.currentPrice})`,
        );
        lines.push(
          `    P&L: ${pnlSign}$${pos.unrealizedPnl.toFixed(2)} (${pnlSign}${pos.unrealizedPnlPercent.toFixed(2)}%)`,
        );
      });
      lines.push('');
    } else {
      lines.push('📈 OPEN POSITIONS: None');
      lines.push('');
    }

    // Recent orders section
    if (context.recentOrders.length > 0) {
      lines.push('📝 RECENT ORDERS (Last 5):');
      context.recentOrders.forEach((order) => {
        const priceStr = order.price ? ` @ $${order.price}` : ' (Market)';
        lines.push(
          `  ${order.status.toUpperCase()} - ${order.side.toUpperCase()} ${order.size} ${order.symbol}${priceStr} (${order.type})`,
        );
      });
      lines.push('');
    }

    // Market prices section
    if (context.marketPrices.length > 0) {
      lines.push('💹 CURRENT MARKET PRICES:');
      context.marketPrices.forEach((market) => {
        const changeSign = market.change24h >= 0 ? '+' : '';
        lines.push(
          `  ${market.symbol}: $${market.price.toFixed(2)} (24h: ${changeSign}${market.change24h.toFixed(2)}%, Vol: ${this.formatVolume(market.volume24h)})`,
        );
      });
      lines.push('');
    }

    lines.push('=== END OF CONTEXT ===');
    lines.push('');
    lines.push(
      'Based on the above trading context, please provide informed advice.',
    );

    return lines.join('\n');
  }

  /**
   * Get user balance (mock for now - will integrate with actual balance tracking)
   */
  private async getUserBalance(
    userId: string,
  ): Promise<TradingContext['balance']> {
    // TODO: Implement actual balance tracking
    // For now, return mock data
    return [
      {
        currency: 'USD',
        available: 10000,
        reserved: 0,
        total: 10000,
      },
    ];
  }

  /**
   * Get user open positions
   */
  private async getUserPositions(
    userId: string,
  ): Promise<TradingContext['positions']> {
    const positions = await this.positionRepository.find({
      where: { userId, status: PositionStatus.OPEN },
      order: { createdAt: 'DESC' },
    });

    return positions.map((pos) => ({
      id: pos.id,
      symbol: pos.symbol,
      side: pos.side === OrderSide.BUY ? ('long' as const) : ('short' as const),
      size: parseFloat(pos.quantity),
      entryPrice: parseFloat(pos.entryPrice),
      currentPrice: parseFloat(pos.currentPrice || pos.entryPrice),
      unrealizedPnl: parseFloat(pos.unrealizedPnl),
      unrealizedPnlPercent: parseFloat(pos.unrealizedPnlPercentage),
    }));
  }

  /**
   * Get recent orders (last 5)
   */
  private async getRecentOrders(
    userId: string,
  ): Promise<TradingContext['recentOrders']> {
    const orders = await this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return orders.map((order) => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side === OrderSide.BUY ? ('buy' as const) : ('sell' as const),
      type: order.type === OrderType.MARKET ? ('market' as const) : ('limit' as const),
      size: parseFloat(order.quantity),
      price: order.price ? parseFloat(order.price) : undefined,
      status: order.status,
      createdAt: order.createdAt,
    }));
  }

  /**
   * Get current market prices for major pairs
   */
  private async getCurrentMarketPrices(): Promise<
    TradingContext['marketPrices']
  > {
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'MATIC/USD'];
    const prices: TradingContext['marketPrices'] = [];

    for (const symbol of symbols) {
      try {
        // Get latest OHLCV data
        const latest = await this.ohlcvRepository.findOne({
          where: { symbol },
          order: { timestamp: 'DESC' },
        });

        // Get 24h ago data for comparison
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dayAgo = await this.ohlcvRepository.findOne({
          where: { symbol },
          order: { timestamp: 'DESC' },
        });

        if (latest) {
          const latestClose = parseFloat(latest.close);
          const dayAgoClose = dayAgo ? parseFloat(dayAgo.close) : latestClose;
          const change24h = ((latestClose - dayAgoClose) / dayAgoClose) * 100;

          prices.push({
            symbol,
            price: latestClose,
            change24h,
            volume24h: parseFloat(latest.volume),
          });
        }
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
      }
    }

    return prices;
  }

  /**
   * Format volume for display
   */
  private formatVolume(volume: number): string {
    if (volume >= 1_000_000_000) {
      return `$${(volume / 1_000_000_000).toFixed(2)}B`;
    } else if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `$${(volume / 1_000).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  }
}
