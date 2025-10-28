import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { KrakenService } from '../services/kraken.service';
import {
  PlaceOrderDto,
  CancelOrderDto,
  GetTickerDto,
  GetOrderBookDto,
  GetOHLCDto,
  GetRecentTradesDto,
  GetOpenOrdersDto,
  GetClosedOrdersDto,
} from '../dto/kraken.dto';

@ApiTags('Kraken Trading')
@Controller('kraken')
export class KrakenController {
  constructor(private readonly krakenService: KrakenService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check Kraken API connectivity' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  @ApiResponse({ status: 503, description: 'API is unavailable' })
  async healthCheck() {
    const isHealthy = await this.krakenService.healthCheck();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('server-time')
  @ApiOperation({ summary: 'Get Kraken server time' })
  @ApiResponse({ status: 200, description: 'Server time retrieved' })
  async getServerTime() {
    return await this.krakenService.getServerTime();
  }

  @Get('asset-pairs')
  @ApiOperation({ summary: 'Get tradable asset pairs' })
  @ApiResponse({ status: 200, description: 'Asset pairs retrieved' })
  async getAssetPairs() {
    return await this.krakenService.getAssetPairs();
  }

  @Get('ticker/:pair')
  @ApiOperation({ summary: 'Get ticker information for a trading pair' })
  @ApiResponse({ status: 200, description: 'Ticker data retrieved' })
  async getTicker(@Param('pair') pair: string) {
    return await this.krakenService.getTicker(pair);
  }

  @Get('orderbook/:pair')
  @ApiOperation({ summary: 'Get order book depth for a trading pair' })
  @ApiResponse({ status: 200, description: 'Order book retrieved' })
  async getOrderBook(
    @Param('pair') pair: string,
    @Query('count') count?: number,
  ) {
    return await this.krakenService.getOrderBook(pair, count || 100);
  }

  @Get('ohlc/:pair')
  @ApiOperation({ summary: 'Get OHLC (candlestick) data' })
  @ApiResponse({ status: 200, description: 'OHLC data retrieved' })
  async getOHLC(
    @Param('pair') pair: string,
    @Query('interval') interval?: number,
    @Query('since') since?: number,
  ) {
    return await this.krakenService.getOHLC(
      pair,
      (interval as any) || 60,
      since,
    );
  }

  @Get('trades/:pair')
  @ApiOperation({ summary: 'Get recent trades for a trading pair' })
  @ApiResponse({ status: 200, description: 'Recent trades retrieved' })
  async getRecentTrades(
    @Param('pair') pair: string,
    @Query('since') since?: number,
  ) {
    return await this.krakenService.getRecentTrades(pair, since);
  }

  @Get('balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get account balance (requires authentication)' })
  @ApiResponse({ status: 200, description: 'Balance retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBalance() {
    return await this.krakenService.getBalance();
  }

  @Post('orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a new order (requires authentication)' })
  @ApiResponse({ status: 201, description: 'Order placed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.CREATED)
  async placeOrder(@Body() placeOrderDto: PlaceOrderDto) {
    return await this.krakenService.placeOrder(placeOrderDto);
  }

  @Delete('orders/:txid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an open order (requires authentication)' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cancelOrder(@Param('txid') txid: string) {
    return await this.krakenService.cancelOrder(txid);
  }

  @Get('orders/open')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get open orders (requires authentication)' })
  @ApiResponse({ status: 200, description: 'Open orders retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOpenOrders(
    @Query('trades') trades?: boolean,
    @Query('userref') userref?: string,
  ) {
    return await this.krakenService.getOpenOrders(trades, userref);
  }

  @Get('orders/closed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get closed orders (requires authentication)' })
  @ApiResponse({ status: 200, description: 'Closed orders retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getClosedOrders(
    @Query('trades') trades?: boolean,
    @Query('userref') userref?: string,
    @Query('start') start?: number,
    @Query('end') end?: number,
    @Query('ofs') ofs?: number,
    @Query('closetime') closetime?: 'open' | 'close' | 'both',
  ) {
    return await this.krakenService.getClosedOrders(
      trades,
      userref,
      start,
      end,
      ofs,
      closetime,
    );
  }
}
