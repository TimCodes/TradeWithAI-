import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderTypeEnum {
  MARKET = 'market',
  LIMIT = 'limit',
}

export class PlaceOrderDto {
  @ApiProperty({ description: 'Trading pair (e.g., XBTUSD, ETHUSD)', example: 'XBTUSD' })
  @IsString()
  pair: string;

  @ApiProperty({ description: 'Order side', enum: OrderType, example: OrderType.BUY })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ description: 'Order type', enum: OrderTypeEnum, example: OrderTypeEnum.MARKET })
  @IsEnum(OrderTypeEnum)
  ordertype: OrderTypeEnum;

  @ApiProperty({ description: 'Order volume in base currency', example: '0.01' })
  @IsString()
  volume: string;

  @ApiPropertyOptional({ description: 'Limit price (required for limit orders)', example: '50000.00' })
  @IsString()
  @IsOptional()
  price?: string;

  @ApiPropertyOptional({ description: 'Leverage amount', example: '2' })
  @IsString()
  @IsOptional()
  leverage?: string;

  @ApiPropertyOptional({ description: 'Order flags (e.g., post, fcib, fciq, nompp)', example: 'post' })
  @IsString()
  @IsOptional()
  oflags?: string;

  @ApiPropertyOptional({ description: 'Scheduled start time (unix timestamp or relative)', example: '0' })
  @IsString()
  @IsOptional()
  starttm?: string;

  @ApiPropertyOptional({ description: 'Expiration time (unix timestamp or relative)', example: '0' })
  @IsString()
  @IsOptional()
  expiretm?: string;

  @ApiPropertyOptional({ description: 'User reference ID', example: '12345' })
  @IsString()
  @IsOptional()
  userref?: string;

  @ApiPropertyOptional({ description: 'Validate only, do not submit order', example: false })
  @IsBoolean()
  @IsOptional()
  validate?: boolean;
}

export class CancelOrderDto {
  @ApiProperty({ description: 'Transaction ID of the order to cancel', example: 'ORDER-ID-123' })
  @IsString()
  txid: string;
}

export class GetTickerDto {
  @ApiProperty({ description: 'Trading pair', example: 'XBTUSD' })
  @IsString()
  pair: string;
}

export class GetOrderBookDto {
  @ApiProperty({ description: 'Trading pair', example: 'XBTUSD' })
  @IsString()
  pair: string;

  @ApiPropertyOptional({ description: 'Number of orders to retrieve', example: 100, minimum: 1, maximum: 500 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  count?: number;
}

export class GetOHLCDto {
  @ApiProperty({ description: 'Trading pair', example: 'XBTUSD' })
  @IsString()
  pair: string;

  @ApiPropertyOptional({ 
    description: 'Time frame interval in minutes', 
    example: 60,
    enum: [1, 5, 15, 30, 60, 240, 1440, 10080, 21600]
  })
  @IsNumber()
  @IsOptional()
  interval?: 1 | 5 | 15 | 30 | 60 | 240 | 1440 | 10080 | 21600;

  @ApiPropertyOptional({ description: 'Return data since this timestamp', example: 1234567890 })
  @IsNumber()
  @IsOptional()
  since?: number;
}

export class GetRecentTradesDto {
  @ApiProperty({ description: 'Trading pair', example: 'XBTUSD' })
  @IsString()
  pair: string;

  @ApiPropertyOptional({ description: 'Return trades since this timestamp' })
  @IsNumber()
  @IsOptional()
  since?: number;
}

export class GetOpenOrdersDto {
  @ApiPropertyOptional({ description: 'Include trades in output', example: false })
  @IsBoolean()
  @IsOptional()
  trades?: boolean;

  @ApiPropertyOptional({ description: 'Filter by user reference ID' })
  @IsString()
  @IsOptional()
  userref?: string;
}

export class GetClosedOrdersDto {
  @ApiPropertyOptional({ description: 'Include trades in output', example: false })
  @IsBoolean()
  @IsOptional()
  trades?: boolean;

  @ApiPropertyOptional({ description: 'Filter by user reference ID' })
  @IsString()
  @IsOptional()
  userref?: string;

  @ApiPropertyOptional({ description: 'Starting timestamp' })
  @IsNumber()
  @IsOptional()
  start?: number;

  @ApiPropertyOptional({ description: 'Ending timestamp' })
  @IsNumber()
  @IsOptional()
  end?: number;

  @ApiPropertyOptional({ description: 'Result offset' })
  @IsNumber()
  @IsOptional()
  ofs?: number;

  @ApiPropertyOptional({ 
    description: 'Which time to use', 
    enum: ['open', 'close', 'both'],
    example: 'both'
  })
  @IsString()
  @IsOptional()
  closetime?: 'open' | 'close' | 'both';
}
