import { IsString, IsEnum, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Timeframe {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
}

export class TickerDataDto {
  @ApiProperty({ example: 'BTC/USD' })
  symbol: string;

  @ApiProperty({ example: 50000.5 })
  price: number;

  @ApiProperty({ example: 50001.0 })
  bid: number;

  @ApiProperty({ example: 50002.0 })
  ask: number;

  @ApiProperty({ example: 1234567.89 })
  volume24h: number;

  @ApiProperty({ example: 2.5 })
  change24h: number;

  @ApiProperty({ example: 51000.0 })
  high24h: number;

  @ApiProperty({ example: 49000.0 })
  low24h: number;

  @ApiProperty()
  timestamp: Date;
}

export class OrderBookLevel {
  @ApiProperty({ example: 50000.5 })
  price: number;

  @ApiProperty({ example: 1.5 })
  size: number;

  @ApiProperty({ example: 1.5 })
  total: number;
}

export class OrderBookDto {
  @ApiProperty({ example: 'BTC/USD' })
  symbol: string;

  @ApiProperty({ type: [OrderBookLevel] })
  bids: OrderBookLevel[];

  @ApiProperty({ type: [OrderBookLevel] })
  asks: OrderBookLevel[];

  @ApiProperty()
  timestamp: Date;
}

export class SubscribeMarketDataDto {
  @ApiProperty({ example: 'BTC/USD' })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: ['ticker', 'orderbook', 'trades'], example: 'ticker' })
  @IsEnum(['ticker', 'orderbook', 'trades'])
  type: 'ticker' | 'orderbook' | 'trades';
}

export class UnsubscribeMarketDataDto {
  @ApiProperty({ example: 'BTC/USD' })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: ['ticker', 'orderbook', 'trades'], example: 'ticker' })
  @IsEnum(['ticker', 'orderbook', 'trades'])
  type: 'ticker' | 'orderbook' | 'trades';
}

export class GetHistoricalDataDto {
  @ApiProperty({ example: 'BTC/USD' })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: Timeframe, example: Timeframe.ONE_HOUR })
  @IsEnum(Timeframe)
  timeframe: Timeframe;

  @ApiProperty({ example: '2025-10-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2025-10-28T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 100, required: false, description: 'Max number of candles to return' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class OHLCVDto {
  @ApiProperty()
  timestamp: Date;

  @ApiProperty({ example: 50000.0 })
  open: number;

  @ApiProperty({ example: 51000.0 })
  high: number;

  @ApiProperty({ example: 49500.0 })
  low: number;

  @ApiProperty({ example: 50500.0 })
  close: number;

  @ApiProperty({ example: 1234.56 })
  volume: number;

  @ApiProperty({ example: 250 })
  trades: number;
}

export class BackfillRequestDto {
  @ApiProperty({ example: 'BTC/USD' })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: Timeframe, example: Timeframe.ONE_HOUR })
  @IsEnum(Timeframe)
  timeframe: Timeframe;

  @ApiProperty({ example: '2025-10-01T00:00:00Z', description: 'Start date for backfill' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-10-28T00:00:00Z', required: false, description: 'End date for backfill (defaults to now)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class BackfillStatusDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Backfill completed' })
  message: string;

  @ApiProperty({ example: 1000 })
  candlesImported: number;

  @ApiProperty({ example: '2025-10-01T00:00:00Z' })
  startDate: Date;

  @ApiProperty({ example: '2025-10-28T00:00:00Z' })
  endDate: Date;
}
