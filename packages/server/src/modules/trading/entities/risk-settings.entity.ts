import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('risk_settings')
export class RiskSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Position size limits
  @Column({ name: 'max_position_size', type: 'decimal', precision: 20, scale: 8, default: 1.0 })
  maxPositionSize: number; // Maximum size per position in base currency

  @Column({ name: 'max_position_value_usd', type: 'decimal', precision: 20, scale: 2, default: 10000.00 })
  maxPositionValueUsd: number; // Maximum USD value per position

  // Portfolio exposure
  @Column({ name: 'max_portfolio_exposure', type: 'decimal', precision: 5, scale: 2, default: 80.00 })
  maxPortfolioExposure: number; // Maximum % of portfolio that can be in positions (0-100)

  @Column({ name: 'max_positions_count', type: 'int', default: 10 })
  maxPositionsCount: number; // Maximum number of concurrent positions

  // Stop loss settings
  @Column({ name: 'default_stop_loss_pct', type: 'decimal', precision: 5, scale: 2, default: 5.00 })
  defaultStopLossPct: number; // Default stop loss % (0-100)

  @Column({ name: 'enable_automatic_stop_loss', type: 'boolean', default: true })
  enableAutomaticStopLoss: boolean; // Auto-place stop loss orders

  // Drawdown settings
  @Column({ name: 'max_drawdown_pct', type: 'decimal', precision: 5, scale: 2, default: 20.00 })
  maxDrawdownPct: number; // Maximum drawdown before halting trades (0-100)

  @Column({ name: 'enable_drawdown_protection', type: 'boolean', default: true })
  enableDrawdownProtection: boolean;

  // Risk per trade
  @Column({ name: 'risk_per_trade_pct', type: 'decimal', precision: 5, scale: 2, default: 2.00 })
  riskPerTradePct: number; // % of portfolio to risk per trade (0-100)

  // Additional settings
  @Column({ name: 'max_daily_loss_usd', type: 'decimal', precision: 20, scale: 2, nullable: true })
  maxDailyLossUsd: number | null; // Maximum loss per day in USD

  @Column({ name: 'enable_risk_checks', type: 'boolean', default: true })
  enableRiskChecks: boolean; // Master switch for risk management

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
