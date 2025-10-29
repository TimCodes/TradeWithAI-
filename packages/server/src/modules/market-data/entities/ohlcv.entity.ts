import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * OHLCV (Open, High, Low, Close, Volume) entity for storing candlestick data
 * Optimized for TimescaleDB hypertable storage
 */
@Entity('ohlcv')
@Index(['symbol', 'timeframe', 'timestamp'])
@Index(['timestamp'])
export class OHLCVEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  symbol: string;

  @Column({ length: 10 })
  timeframe: string; // '1m', '5m', '15m', '1h', '4h', '1d'

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp: Date;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  open: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  high: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  low: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  close: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  volume: string;

  @Column({ type: 'int', default: 0 })
  trades: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
