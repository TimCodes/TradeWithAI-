import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { OrderSide } from './order.entity';

export enum PositionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('positions')
@Index(['userId', 'status'])
@Index(['symbol', 'status'])
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  symbol: string;

  @Column({
    type: 'enum',
    enum: OrderSide,
  })
  side: OrderSide;

  @Column({
    type: 'enum',
    enum: PositionStatus,
    default: PositionStatus.OPEN,
  })
  @Index()
  status: PositionStatus;

  @Column('decimal', { precision: 20, scale: 8 })
  quantity: string;

  @Column('decimal', { precision: 20, scale: 8 })
  entryPrice: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  currentPrice: string | null;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  exitPrice: string | null;

  @Column('decimal', { precision: 20, scale: 8, default: '0' })
  realizedPnl: string;

  @Column('decimal', { precision: 20, scale: 8, default: '0' })
  unrealizedPnl: string;

  @Column('decimal', { precision: 10, scale: 4, default: '0' })
  realizedPnlPercentage: string;

  @Column('decimal', { precision: 10, scale: 4, default: '0' })
  unrealizedPnlPercentage: string;

  // Risk management
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  stopLossPrice: string | null;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  takeProfitPrice: string | null;

  @Column({ nullable: true })
  stopLossOrderId: string | null;

  @Column({ nullable: true })
  takeProfitOrderId: string | null;

  // Tracking
  @Column('decimal', { precision: 20, scale: 8 })
  costBasis: string;

  @Column('decimal', { precision: 20, scale: 8, default: '0' })
  fees: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  // Helper methods
  get isOpen(): boolean {
    return this.status === PositionStatus.OPEN;
  }

  get totalValue(): string {
    const qty = parseFloat(this.quantity);
    const price = parseFloat(this.currentPrice || this.entryPrice);
    return (qty * price).toFixed(8);
  }

  /**
   * Calculate unrealized P&L based on current market price
   * @param currentMarketPrice - Current market price for the symbol
   */
  calculateUnrealizedPnl(currentMarketPrice: string): void {
    this.currentPrice = currentMarketPrice;
    
    const qty = parseFloat(this.quantity);
    const entryPrice = parseFloat(this.entryPrice);
    const currentPrice = parseFloat(currentMarketPrice);
    const fees = parseFloat(this.fees);

    let pnl: number;
    if (this.side === OrderSide.BUY) {
      // Long position: profit when price goes up
      pnl = (currentPrice - entryPrice) * qty - fees;
    } else {
      // Short position: profit when price goes down
      pnl = (entryPrice - currentPrice) * qty - fees;
    }

    this.unrealizedPnl = pnl.toFixed(8);

    const costBasis = parseFloat(this.costBasis);
    if (costBasis > 0) {
      this.unrealizedPnlPercentage = ((pnl / costBasis) * 100).toFixed(4);
    }
  }

  /**
   * Close the position and calculate realized P&L
   * @param exitPrice - Price at which position was closed
   * @param exitFees - Fees incurred on exit
   */
  closePosition(exitPrice: string, exitFees: number = 0): void {
    this.exitPrice = exitPrice;
    this.status = PositionStatus.CLOSED;
    this.closedAt = new Date();

    const qty = parseFloat(this.quantity);
    const entryPrice = parseFloat(this.entryPrice);
    const exit = parseFloat(exitPrice);
    const totalFees = parseFloat(this.fees) + exitFees;

    let pnl: number;
    if (this.side === OrderSide.BUY) {
      pnl = (exit - entryPrice) * qty - totalFees;
    } else {
      pnl = (entryPrice - exit) * qty - totalFees;
    }

    this.realizedPnl = pnl.toFixed(8);
    this.unrealizedPnl = '0';

    const costBasis = parseFloat(this.costBasis);
    if (costBasis > 0) {
      this.realizedPnlPercentage = ((pnl / costBasis) * 100).toFixed(4);
      this.unrealizedPnlPercentage = '0';
    }

    this.fees = totalFees.toFixed(8);
  }

  /**
   * Check if stop loss should be triggered
   * @param currentPrice - Current market price
   */
  shouldTriggerStopLoss(currentPrice: string): boolean {
    if (!this.stopLossPrice) return false;

    const current = parseFloat(currentPrice);
    const stopLoss = parseFloat(this.stopLossPrice);

    if (this.side === OrderSide.BUY) {
      return current <= stopLoss;
    } else {
      return current >= stopLoss;
    }
  }

  /**
   * Check if take profit should be triggered
   * @param currentPrice - Current market price
   */
  shouldTriggerTakeProfit(currentPrice: string): boolean {
    if (!this.takeProfitPrice) return false;

    const current = parseFloat(currentPrice);
    const takeProfit = parseFloat(this.takeProfitPrice);

    if (this.side === OrderSide.BUY) {
      return current >= takeProfit;
    } else {
      return current <= takeProfit;
    }
  }

  /**
   * Get the total P&L (realized + unrealized)
   */
  get totalPnl(): string {
    const realized = parseFloat(this.realizedPnl);
    const unrealized = parseFloat(this.unrealizedPnl);
    return (realized + unrealized).toFixed(8);
  }

  /**
   * Get the total P&L percentage
   */
  get totalPnlPercentage(): string {
    const costBasis = parseFloat(this.costBasis);
    if (costBasis === 0) return '0';
    
    const totalPnl = parseFloat(this.totalPnl);
    return ((totalPnl / costBasis) * 100).toFixed(4);
  }
}
