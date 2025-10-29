import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketDataService } from '../services/market-data.service';
import {
  SubscribeMarketDataDto,
  UnsubscribeMarketDataDto,
  GetHistoricalDataDto,
  BackfillRequestDto,
  BackfillStatusDto,
  TickerDataDto,
  OrderBookDto,
  OHLCVDto,
} from '../dto/market-data.dto';

@ApiTags('market-data')
@Controller('market-data')
export class MarketDataController {
  private readonly logger = new Logger(MarketDataController.name);

  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check market data service health' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  getHealth() {
    const status = this.marketDataService.getConnectionStatus();
    return {
      status: status.connected ? 'healthy' : 'unhealthy',
      ...status,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ticker/:symbol')
  @ApiOperation({ summary: 'Get latest ticker data for a symbol' })
  @ApiResponse({ status: 200, description: 'Latest ticker data', type: TickerDataDto })
  @ApiResponse({ status: 404, description: 'Ticker data not found' })
  getTicker(@Param('symbol') symbol: string): TickerDataDto | null {
    this.logger.log(`Getting ticker for ${symbol}`);
    return this.marketDataService.getTicker(symbol);
  }

  @Get('tickers')
  @ApiOperation({ summary: 'Get all cached ticker data' })
  @ApiResponse({ status: 200, description: 'All ticker data', type: [TickerDataDto] })
  getAllTickers(): TickerDataDto[] {
    return this.marketDataService.getAllTickers();
  }

  @Get('orderbook/:symbol')
  @ApiOperation({ summary: 'Get latest order book for a symbol' })
  @ApiResponse({ status: 200, description: 'Latest order book', type: OrderBookDto })
  @ApiResponse({ status: 404, description: 'Order book not found' })
  getOrderBook(@Param('symbol') symbol: string): OrderBookDto | null {
    this.logger.log(`Getting order book for ${symbol}`);
    return this.marketDataService.getOrderBook(symbol);
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to market data updates' })
  @ApiResponse({ status: 200, description: 'Subscription successful' })
  subscribe(@Body() dto: SubscribeMarketDataDto) {
    this.logger.log(`Subscribing to ${dto.type} for ${dto.symbol}`);
    
    if (dto.type === 'ticker') {
      this.marketDataService.subscribeTicker(dto.symbol);
    } else if (dto.type === 'orderbook') {
      this.marketDataService.subscribeOrderBook(dto.symbol);
    }

    return {
      success: true,
      message: `Subscribed to ${dto.type} for ${dto.symbol}`,
    };
  }

  @Delete('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe from market data updates' })
  @ApiResponse({ status: 200, description: 'Unsubscription successful' })
  unsubscribe(@Body() dto: UnsubscribeMarketDataDto) {
    this.logger.log(`Unsubscribing from ${dto.type} for ${dto.symbol}`);
    
    if (dto.type === 'ticker') {
      this.marketDataService.unsubscribeTicker(dto.symbol);
    } else if (dto.type === 'orderbook') {
      this.marketDataService.unsubscribeOrderBook(dto.symbol);
    }

    return {
      success: true,
      message: `Unsubscribed from ${dto.type} for ${dto.symbol}`,
    };
  }

  @Get('historical/:symbol')
  @ApiOperation({ summary: 'Get historical OHLCV data' })
  @ApiResponse({ status: 200, description: 'Historical OHLCV data', type: [OHLCVDto] })
  async getHistoricalData(
    @Param('symbol') symbol: string,
    @Query() query: GetHistoricalDataDto,
  ): Promise<OHLCVDto[]> {
    this.logger.log(`Getting historical data for ${symbol} ${query.timeframe}`);
    
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const limit = query.limit || 100;

    return this.marketDataService.getHistoricalData(
      symbol,
      query.timeframe,
      startDate,
      endDate,
      limit,
    );
  }

  @Post('backfill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Backfill historical OHLCV data from Kraken' })
  @ApiResponse({ status: 200, description: 'Backfill status', type: BackfillStatusDto })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async backfillHistoricalData(
    @Body() dto: BackfillRequestDto,
  ): Promise<BackfillStatusDto> {
    this.logger.log(`Starting backfill for ${dto.symbol} ${dto.timeframe}`);
    
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date();

    const result = await this.marketDataService.backfillHistoricalData(
      dto.symbol,
      dto.timeframe,
      startDate,
      endDate,
    );

    return {
      success: result.success,
      message: result.message,
      candlesImported: result.candlesImported,
      startDate,
      endDate,
    };
  }

  @Get('cache/stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics' })
  getCacheStats() {
    return this.marketDataService.getCacheStats();
  }
}
