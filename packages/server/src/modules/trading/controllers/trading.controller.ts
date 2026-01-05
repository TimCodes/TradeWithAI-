import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TradingService } from '../services/trading.service';
import { PortfolioService } from '../services/portfolio.service';
import {
  CreateOrderDto,
  OrderQueryDto,
  PositionQueryDto,
  TradeQueryDto,
  OrderResponseDto,
  PositionResponseDto,
  TradeResponseDto,
  PortfolioSummaryDto,
  EquityCurveDto,
  AssetAllocationDto,
  PortfolioMetricsDto,
  TimeframeQueryDto,
  TimeframeDto,
} from '../dto/trading.dto';

// Note: JwtAuthGuard would be imported from auth module
// For now, using a placeholder
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Trading')
@Controller('trading')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is set up
@ApiBearerAuth()
export class TradingController {
  constructor(
    private readonly tradingService: TradingService,
    private readonly portfolioService: PortfolioService,
  ) {}

  // ========== Order Endpoints ==========

  @Post('orders')
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid order parameters' })
  async createOrder(@Request() req: any, @Body() createOrderDto: CreateOrderDto) {
    // In production, userId would come from JWT token
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.createOrder(userId, createOrderDto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders with optional filters' })
  @ApiResponse({ status: 200, description: 'List of orders', type: [OrderResponseDto] })
  async getOrders(@Request() req: any, @Query() query: OrderQueryDto) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.getOrders(userId, query);
  }

  @Get('orders/open')
  @ApiOperation({ summary: 'Get all open orders' })
  @ApiResponse({ status: 200, description: 'List of open orders', type: [OrderResponseDto] })
  async getOpenOrders(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.getOpenOrders(userId);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get a specific order by ID' })
  @ApiResponse({ status: 200, description: 'Order details', type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(@Request() req: any, @Param('orderId') orderId: string) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.getOrder(orderId, userId);
  }

  @Delete('orders/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(@Request() req: any, @Param('orderId') orderId: string) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.cancelOrder(orderId, userId);
  }

  // ========== Position Endpoints ==========

  @Get('positions')
  @ApiOperation({ summary: 'Get all positions with optional filters' })
  @ApiResponse({ status: 200, description: 'List of positions', type: [PositionResponseDto] })
  async getPositions(@Request() req: any, @Query() query: PositionQueryDto) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.getPositions(userId, query.status);
  }

  @Get('positions/open')
  @ApiOperation({ summary: 'Get all open positions' })
  @ApiResponse({ status: 200, description: 'List of open positions', type: [PositionResponseDto] })
  async getOpenPositions(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.getOpenPositions(userId);
  }

  @Get('positions/:positionId')
  @ApiOperation({ summary: 'Get a specific position by ID' })
  @ApiResponse({ status: 200, description: 'Position details', type: PositionResponseDto })
  @ApiResponse({ status: 404, description: 'Position not found' })
  async getPosition(@Request() req: any, @Param('positionId') positionId: string) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.getPosition(positionId, userId);
  }

  @Post('positions/:positionId/update-price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update position with current market price' })
  @ApiResponse({ status: 200, description: 'Position updated with current price', type: PositionResponseDto })
  @ApiResponse({ status: 404, description: 'Position not found' })
  async updatePositionPrice(@Request() req: any, @Param('positionId') positionId: string) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.updatePositionPrice(positionId, userId);
  }

  // ========== Trade Endpoints ==========

  @Get('trades')
  @ApiOperation({ summary: 'Get trade history with optional filters' })
  @ApiResponse({ status: 200, description: 'List of trades', type: [TradeResponseDto] })
  async getTrades(@Request() req: any, @Query() query: TradeQueryDto) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.getTrades(userId, query);
  }

  // ========== Portfolio Endpoints ==========

  @Get('portfolio/summary')
  @ApiOperation({ summary: 'Get portfolio summary with P&L' })
  @ApiResponse({ status: 200, description: 'Portfolio summary', type: PortfolioSummaryDto })
  async getPortfolioSummary(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.getPortfolioSummary(userId);
  }

  @Get('portfolio/balance')
  @ApiOperation({ summary: 'Get account balance from exchange' })
  @ApiResponse({ status: 200, description: 'Account balance' })
  async getBalance(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    return this.tradingService.getBalance(userId);
  }

  @Get('portfolio/equity-curve')
  @ApiOperation({ summary: 'Get equity curve over time' })
  @ApiResponse({ status: 200, description: 'Equity curve data', type: EquityCurveDto })
  async getEquityCurve(
    @Request() req: any,
    @Query() query: TimeframeQueryDto,
  ): Promise<EquityCurveDto> {
    const userId = req.user?.id || 'test-user-id';
    const timeframe = query.timeframe || TimeframeDto.ALL;
    const data = await this.portfolioService.getEquityCurve(userId, timeframe as any);
    
    return {
      data,
      timeframe,
    };
  }

  @Get('portfolio/allocation')
  @ApiOperation({ summary: 'Get asset allocation across portfolio' })
  @ApiResponse({ status: 200, description: 'Asset allocation data', type: AssetAllocationDto })
  async getAssetAllocation(@Request() req: any): Promise<AssetAllocationDto> {
    const userId = req.user?.id || 'test-user-id';
    const allocations = await this.portfolioService.getAssetAllocation(userId);
    
    const totalValue = allocations.reduce((sum, item) => sum + item.value, 0);
    
    return {
      allocations,
      totalValue,
    };
  }

  @Get('portfolio/metrics')
  @ApiOperation({ summary: 'Get comprehensive portfolio metrics' })
  @ApiResponse({ status: 200, description: 'Portfolio metrics', type: PortfolioMetricsDto })
  async getPortfolioMetrics(
    @Request() req: any,
    @Query() query: TimeframeQueryDto,
  ): Promise<PortfolioMetricsDto> {
    const userId = req.user?.id || 'test-user-id';
    const timeframe = query.timeframe || TimeframeDto.ALL;
    const metrics = await this.portfolioService.getPortfolioMetrics(userId, timeframe as any);
    
    return {
      ...metrics,
      timeframe,
    };
  }
}
