import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsNumberString,
  IsDateString,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderSide, OrderType, TimeInForce, OrderStatus } from '../entities/order.entity';
import { PositionStatus } from '../entities/position.entity';

export class CreateOrderDto {
  @ApiProperty({ description: 'Trading symbol (e.g., XXBTZUSD, XETHZUSD)', example: 'XXBTZUSD' })
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'Order side', enum: OrderSide, example: OrderSide.BUY })
  @IsEnum(OrderSide)
  side: OrderSide;

  @ApiProperty({ description: 'Order type', enum: OrderType, example: OrderType.MARKET })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ description: 'Order quantity in base currency', example: '0.01' })
  @IsNumberString()
  quantity: string;

  @ApiPropertyOptional({ description: 'Limit price (required for limit orders)', example: '50000.00' })
  @IsNumberString()
  @IsOptional()
  price?: string;

  @ApiPropertyOptional({ description: 'Stop price (required for stop orders)', example: '48000.00' })
  @IsNumberString()
  @IsOptional()
  stopPrice?: string;

  @ApiPropertyOptional({ description: 'Time in force', enum: TimeInForce, example: TimeInForce.GTC })
  @IsEnum(TimeInForce)
  @IsOptional()
  timeInForce?: TimeInForce;

  @ApiPropertyOptional({ description: 'Risk percentage of portfolio', example: '2.5' })
  @IsNumberString()
  @IsOptional()
  riskPercentage?: string;

  @ApiPropertyOptional({ description: 'LLM provider that suggested this trade', example: 'openai' })
  @IsString()
  @IsOptional()
  llmProvider?: string;

  @ApiPropertyOptional({
    description: 'LLM reasoning for the trade',
    example: 'Strong bullish momentum with RSI oversold',
  })
  @IsString()
  @IsOptional()
  llmReasoning?: string;

  @ApiPropertyOptional({ description: 'LLM confidence score (0-100)', example: '85.5' })
  @IsNumberString()
  @IsOptional()
  llmConfidence?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { strategy: 'momentum' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ description: 'Filter by order status', enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Filter by symbol', example: 'XXBTZUSD' })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Filter by order side', enum: OrderSide })
  @IsEnum(OrderSide)
  @IsOptional()
  side?: OrderSide;

  @ApiPropertyOptional({ description: 'Start date for filtering', example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for filtering', example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Maximum number of results', example: 50, default: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', example: 0, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;
}

export class PositionQueryDto {
  @ApiPropertyOptional({ description: 'Filter by position status', enum: PositionStatus })
  @IsEnum(PositionStatus)
  @IsOptional()
  status?: PositionStatus;

  @ApiPropertyOptional({ description: 'Filter by symbol', example: 'XXBTZUSD' })
  @IsString()
  @IsOptional()
  symbol?: string;
}

export class TradeQueryDto {
  @ApiPropertyOptional({ description: 'Filter by symbol', example: 'XXBTZUSD' })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering', example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for filtering', example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Maximum number of results', example: 50, default: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', example: 0, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty({ enum: OrderSide })
  side: OrderSide;

  @ApiProperty({ enum: OrderType })
  type: OrderType;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  quantity: string;

  @ApiProperty({ nullable: true })
  price: string | null;

  @ApiProperty({ nullable: true })
  stopPrice: string | null;

  @ApiProperty()
  filledQuantity: string;

  @ApiProperty({ nullable: true })
  averageFillPrice: string | null;

  @ApiProperty({ enum: TimeInForce })
  timeInForce: TimeInForce;

  @ApiProperty({ nullable: true })
  exchangeOrderId: string | null;

  @ApiProperty({ nullable: true })
  clientOrderId: string | null;

  @ApiProperty({ nullable: true })
  rejectReason: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  submittedAt: Date | null;

  @ApiProperty({ nullable: true })
  filledAt: Date | null;

  @ApiProperty({ nullable: true })
  cancelledAt: Date | null;
}

export class PositionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty({ enum: OrderSide })
  side: OrderSide;

  @ApiProperty({ enum: PositionStatus })
  status: PositionStatus;

  @ApiProperty()
  quantity: string;

  @ApiProperty()
  entryPrice: string;

  @ApiProperty({ nullable: true })
  currentPrice: string | null;

  @ApiProperty({ nullable: true })
  exitPrice: string | null;

  @ApiProperty()
  realizedPnl: string;

  @ApiProperty()
  unrealizedPnl: string;

  @ApiProperty()
  realizedPnlPercentage: string;

  @ApiProperty()
  unrealizedPnlPercentage: string;

  @ApiProperty({ nullable: true })
  stopLossPrice: string | null;

  @ApiProperty({ nullable: true })
  takeProfitPrice: string | null;

  @ApiProperty()
  costBasis: string;

  @ApiProperty()
  fees: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  closedAt: Date | null;
}

export class TradeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty({ nullable: true })
  positionId: string | null;

  @ApiProperty()
  symbol: string;

  @ApiProperty({ enum: OrderSide })
  side: OrderSide;

  @ApiProperty()
  quantity: string;

  @ApiProperty()
  price: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  fee: string;

  @ApiProperty({ nullable: true })
  exchangeTradeId: string | null;

  @ApiProperty({ nullable: true })
  realizedPnl: string | null;

  @ApiProperty({ nullable: true })
  llmProvider: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  executedAt: Date | null;
}

export class PortfolioSummaryDto {
  @ApiProperty()
  openPositions: number;

  @ApiProperty()
  totalValue: string;

  @ApiProperty()
  totalUnrealizedPnl: string;

  @ApiProperty()
  totalRealizedPnl: string;

  @ApiProperty()
  totalPnl: string;
}
