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

export enum OrderStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LOSS = 'stop_loss',
  TAKE_PROFIT = 'take_profit',
  STOP_LOSS_LIMIT = 'stop_loss_limit',
  TAKE_PROFIT_LIMIT = 'take_profit_limit',
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum TimeInForce {
  GTC = 'GTC', // Good-Til-Cancelled
  IOC = 'IOC', // Immediate-Or-Cancel
  FOK = 'FOK', // Fill-Or-Kill
}

@Entity('orders')
@Index(['userId', 'status'])
@Index(['symbol', 'status'])
@Index(['createdAt'])
export class Order {
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
    enum: OrderType,
  })
  type: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  @Index()
  status: OrderStatus;

  @Column('decimal', { precision: 20, scale: 8 })
  quantity: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  price: string | null;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  stopPrice: string | null;

  @Column('decimal', { precision: 20, scale: 8, default: '0' })
  filledQuantity: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  averageFillPrice: string | null;

  @Column({
    type: 'enum',
    enum: TimeInForce,
    default: TimeInForce.GTC,
  })
  timeInForce: TimeInForce;

  @Column({ nullable: true })
  exchangeOrderId: string | null;

  @Column({ nullable: true })
  clientOrderId: string | null;

  @Column({ type: 'text', nullable: true })
  rejectReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Risk management fields
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  riskPercentage: string | null;

  @Column({ nullable: true })
  llmProvider: string | null;

  @Column({ type: 'text', nullable: true })
  llmReasoning: string | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  llmConfidence: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  filledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  // Helper methods
  get isActive(): boolean {
    return [
      OrderStatus.PENDING,
      OrderStatus.SUBMITTED,
      OrderStatus.OPEN,
      OrderStatus.PARTIALLY_FILLED,
    ].includes(this.status);
  }

  get isFilled(): boolean {
    return this.status === OrderStatus.FILLED;
  }

  get isCancelled(): boolean {
    return this.status === OrderStatus.CANCELLED;
  }

  get fillPercentage(): number {
    if (!this.quantity || parseFloat(this.quantity) === 0) return 0;
    return (parseFloat(this.filledQuantity) / parseFloat(this.quantity)) * 100;
  }

  get remainingQuantity(): string {
    const qty = parseFloat(this.quantity);
    const filled = parseFloat(this.filledQuantity);
    return (qty - filled).toFixed(8);
  }
}
