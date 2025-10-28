import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Order, OrderSide } from './order.entity';
import { Position } from './position.entity';

export enum TradeType {
  ENTRY = 'entry',
  EXIT = 'exit',
  PARTIAL_EXIT = 'partial_exit',
}

@Entity('trades')
@Index(['userId', 'createdAt'])
@Index(['orderId'])
@Index(['positionId'])
@Index(['symbol', 'createdAt'])
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index()
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ nullable: true })
  @Index()
  positionId: string | null;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'positionId' })
  position: Position | null;

  @Column()
  symbol: string;

  @Column({
    type: 'enum',
    enum: OrderSide,
  })
  side: OrderSide;

  @Column({
    type: 'enum',
    enum: TradeType,
  })
  type: TradeType;

  @Column('decimal', { precision: 20, scale: 8 })
  quantity: string;

  @Column('decimal', { precision: 20, scale: 8 })
  price: string;

  @Column('decimal', { precision: 20, scale: 8 })
  value: string;

  @Column('decimal', { precision: 20, scale: 8, default: '0' })
  fee: string;

  @Column({ nullable: true })
  exchangeTradeId: string | null;

  @Column({ nullable: true })
  exchangeOrderId: string | null;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  realizedPnl: string | null;

  // LLM tracking
  @Column({ nullable: true })
  llmProvider: string | null;

  @Column({ type: 'text', nullable: true })
  llmReasoning: string | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  llmConfidence: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  executedAt: Date | null;

  // Helper methods
  get netValue(): string {
    const val = parseFloat(this.value);
    const fee = parseFloat(this.fee);
    return (val - fee).toFixed(8);
  }

  get isEntry(): boolean {
    return this.type === TradeType.ENTRY;
  }

  get isExit(): boolean {
    return this.type === TradeType.EXIT || this.type === TradeType.PARTIAL_EXIT;
  }

  /**
   * Calculate the effective price including fees
   */
  get effectivePrice(): string {
    const qty = parseFloat(this.quantity);
    if (qty === 0) return '0';

    const val = parseFloat(this.value);
    const fee = parseFloat(this.fee);

    if (this.side === OrderSide.BUY) {
      // For buys, fee increases the cost
      return ((val + fee) / qty).toFixed(8);
    } else {
      // For sells, fee decreases the proceeds
      return ((val - fee) / qty).toFixed(8);
    }
  }

  /**
   * Calculate P&L for this trade (only applicable for exits)
   * @param entryPrice - The entry price of the position
   */
  calculatePnl(entryPrice: string): void {
    if (!this.isExit) {
      this.realizedPnl = null;
      return;
    }

    const qty = parseFloat(this.quantity);
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(this.price);
    const fee = parseFloat(this.fee);

    let pnl: number;
    if (this.side === OrderSide.SELL) {
      // Closing a long position
      pnl = (exit - entry) * qty - fee;
    } else {
      // Closing a short position
      pnl = (entry - exit) * qty - fee;
    }

    this.realizedPnl = pnl.toFixed(8);
  }
}
