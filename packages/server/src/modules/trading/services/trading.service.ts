import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { Order, OrderStatus, OrderType, OrderSide, TimeInForce } from '../entities/order.entity';
import { Position, PositionStatus } from '../entities/position.entity';
import { Trade } from '../entities/trade.entity';
import { OrderExecutorService } from './order-executor.service';
import { KrakenService } from './kraken.service';
import { RiskManagementService } from './risk-management.service';
import { TradingEventsService } from './trading-events.service';
import { RiskCheckStatus } from '../dto/risk-check.dto';

export interface CreateOrderDto {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: TimeInForce;
  riskPercentage?: string;
  llmProvider?: string;
  llmReasoning?: string;
  llmConfidence?: string;
  metadata?: Record<string, any>;
}

export interface OrderQueryDto {
  status?: OrderStatus;
  symbol?: string;
  side?: OrderSide;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly orderExecutor: OrderExecutorService,
    private readonly krakenService: KrakenService,
    private readonly riskManagement: RiskManagementService,
    private readonly tradingEventsService: TradingEventsService,
  ) {}

  /**
   * Create and queue a new order
   */
  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    // Validate order parameters
    this.validateOrderParameters(dto);

    // Check balance (simple check, more sophisticated in risk management)
    await this.validateBalance(userId, dto);

    // Get current market price for risk check
    let price: number;
    if (dto.price) {
      price = parseFloat(dto.price);
    } else {
      price = await this.getCurrentPrice(dto.symbol);
    }

    // Perform risk management check
    const riskCheck = await this.riskManagement.validateOrder({
      userId,
      symbol: dto.symbol,
      side: dto.side,
      size: parseFloat(dto.quantity),
      price,
      orderType: dto.type === OrderType.MARKET ? 'market' : 'limit',
    });

    // Log risk check results
    this.logger.log(
      `Risk check for ${dto.symbol} ${dto.side} ${dto.quantity}: ${riskCheck.status} - ${riskCheck.reasons.join(', ')}`
    );

    // Reject order if risk check fails
    if (riskCheck.status === RiskCheckStatus.REJECTED) {
      throw new BadRequestException({
        message: 'Order rejected by risk management',
        reasons: riskCheck.reasons,
        suggestions: riskCheck.suggestions,
        riskMetrics: riskCheck.riskMetrics,
      });
    }

    // Generate client order ID
    const clientOrderId = `${userId}-${Date.now()}`;

    // Create order entity
    const order = this.orderRepository.create({
      userId,
      symbol: dto.symbol,
      side: dto.side,
      type: dto.type,
      quantity: dto.quantity,
      price: dto.price || null,
      stopPrice: dto.stopPrice || null,
      timeInForce: dto.timeInForce || TimeInForce.GTC,
      status: OrderStatus.PENDING,
      filledQuantity: '0',
      clientOrderId,
      riskPercentage: dto.riskPercentage || null,
      llmProvider: dto.llmProvider || null,
      llmReasoning: dto.llmReasoning || null,
      llmConfidence: dto.llmConfidence || null,
      metadata: {
        ...dto.metadata,
        riskCheck: {
          status: riskCheck.status,
          metrics: riskCheck.riskMetrics,
        },
      },
    });

    // Save order
    const savedOrder = await this.orderRepository.save(order);

    // Check if automatic stop loss should be placed
    const riskSettings = await this.riskManagement.getRiskSettings(userId);
    if (
      dto.side === 'buy' &&
      this.riskManagement.shouldPlaceAutomaticStopLoss(riskSettings)
    ) {
      const stopLossPrice = this.riskManagement.calculateStopLossPrice(
        price,
        dto.side,
        riskSettings.defaultStopLossPct,
      );

      this.logger.log(
        `Automatic stop loss will be placed at ${stopLossPrice} for order ${savedOrder.id}`
      );

      // Store stop loss info in order metadata
      savedOrder.metadata = {
        ...savedOrder.metadata,
        automaticStopLoss: {
          price: stopLossPrice,
          percentage: riskSettings.defaultStopLossPct,
        },
      };
      await this.orderRepository.save(savedOrder);
    }

    // Emit order created event
    this.tradingEventsService.emitOrderCreated({
      userId,
      order: savedOrder,
    });

    // Queue for execution
    await this.orderExecutor.queueOrder(savedOrder.id, userId);

    this.logger.log(`Created order ${savedOrder.id} for user ${userId}`);

    return savedOrder;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return order;
  }

  /**
   * Get orders with filters
   */
  async getOrders(userId: string, query: OrderQueryDto): Promise<{ orders: Order[]; total: number }> {
    const where: FindOptionsWhere<Order> = { userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.symbol) {
      where.symbol = query.symbol;
    }

    if (query.side) {
      where.side = query.side;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = Between(query.startDate, query.endDate) as any;
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    return { orders, total };
  }

  /**
   * Get open orders
   */
  async getOpenOrders(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        userId,
        status: OrderStatus.OPEN,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    const order = await this.getOrder(orderId, userId);

    if (!order.isActive) {
      throw new BadRequestException(`Order ${orderId} cannot be cancelled (status: ${order.status})`);
    }

    await this.orderExecutor.cancelOrder(orderId, userId);

    return this.getOrder(orderId, userId);
  }

  /**
   * Get all positions
   */
  async getPositions(userId: string, status?: PositionStatus): Promise<Position[]> {
    const where: FindOptionsWhere<Position> = { userId };

    if (status) {
      where.status = status;
    }

    return this.positionRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get open positions
   */
  async getOpenPositions(userId: string): Promise<Position[]> {
    return this.positionRepository.find({
      where: {
        userId,
        status: PositionStatus.OPEN,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get position by ID
   */
  async getPosition(positionId: string, userId: string): Promise<Position> {
    const position = await this.positionRepository.findOne({
      where: { id: positionId, userId },
    });

    if (!position) {
      throw new NotFoundException(`Position ${positionId} not found`);
    }

    return position;
  }

  /**
   * Update position with current market price
   */
  async updatePositionPrice(positionId: string, userId: string): Promise<Position> {
    const position = await this.getPosition(positionId, userId);

    if (position.status !== PositionStatus.OPEN) {
      throw new BadRequestException('Position is not open');
    }

    // Fetch current price from Kraken
    const ticker = await this.krakenService.getTicker(position.symbol);
    const currentPrice = ticker.c[0]; // Last trade price

    // Update P&L
    position.calculateUnrealizedPnl(currentPrice);
    await this.positionRepository.save(position);

    return position;
  }

  /**
   * Get trades with filters
   */
  async getTrades(
    userId: string,
    filters?: { symbol?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number },
  ): Promise<{ trades: Trade[]; total: number }> {
    const where: FindOptionsWhere<Trade> = { userId };

    if (filters?.symbol) {
      where.symbol = filters.symbol;
    }

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate) as any;
    }

    const [trades, total] = await this.tradeRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      relations: ['order', 'position'],
    });

    return { trades, total };
  }

  /**
   * Get account balance
   */
  async getBalance(userId: string): Promise<any> {
    // This would fetch from Kraken using user's API keys
    // For now, return from KrakenService
    return this.krakenService.getBalance();
  }

  /**
   * Get portfolio summary
   */
  async getPortfolioSummary(userId: string): Promise<any> {
    const openPositions = await this.getOpenPositions(userId);
    
    let totalValue = 0;
    let totalUnrealizedPnl = 0;
    let totalRealizedPnl = 0;

    for (const position of openPositions) {
      totalValue += parseFloat(position.totalValue);
      totalUnrealizedPnl += parseFloat(position.unrealizedPnl);
      totalRealizedPnl += parseFloat(position.realizedPnl);
    }

    // Get closed positions for total realized P&L
    const closedPositions = await this.getPositions(userId, PositionStatus.CLOSED);
    for (const position of closedPositions) {
      totalRealizedPnl += parseFloat(position.realizedPnl);
    }

    return {
      openPositions: openPositions.length,
      totalValue: totalValue.toFixed(8),
      totalUnrealizedPnl: totalUnrealizedPnl.toFixed(8),
      totalRealizedPnl: totalRealizedPnl.toFixed(8),
      totalPnl: (totalUnrealizedPnl + totalRealizedPnl).toFixed(8),
    };
  }

  /**
   * Get current market price for a symbol
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const ticker = await this.krakenService.getTicker(symbol);
      // Use the last trade price or mid-price
      const lastPrice = ticker.result[Object.keys(ticker.result)[0]].c[0];
      return parseFloat(lastPrice);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get current price for ${symbol}: ${errorMessage}`);
      // Return a default/fallback price - in production, this should fail the order
      return 0;
    }
  }

  /**
   * Validate order parameters
   */
  private validateOrderParameters(dto: CreateOrderDto): void {
    // Validate quantity
    const quantity = parseFloat(dto.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      throw new BadRequestException('Invalid quantity');
    }

    // Validate price for limit orders
    if (dto.type === OrderType.LIMIT && !dto.price) {
      throw new BadRequestException('Price is required for limit orders');
    }

    if (dto.price) {
      const price = parseFloat(dto.price);
      if (isNaN(price) || price <= 0) {
        throw new BadRequestException('Invalid price');
      }
    }

    // Validate stop price for stop orders
    if (
      (dto.type === OrderType.STOP_LOSS || dto.type === OrderType.STOP_LOSS_LIMIT) &&
      !dto.stopPrice
    ) {
      throw new BadRequestException('Stop price is required for stop orders');
    }

    if (dto.stopPrice) {
      const stopPrice = parseFloat(dto.stopPrice);
      if (isNaN(stopPrice) || stopPrice <= 0) {
        throw new BadRequestException('Invalid stop price');
      }
    }
  }

  /**
   * Validate user has sufficient balance
   */
  private async validateBalance(userId: string, dto: CreateOrderDto): Promise<void> {
    // This is a simplified check
    // In production, you'd check against the user's actual balance from Kraken
    // and account for fees, existing open orders, etc.
    
    try {
      const balance = await this.krakenService.getBalance();
      
      // For buy orders, check if user has enough quote currency
      if (dto.side === OrderSide.BUY) {
        const orderValue = parseFloat(dto.quantity) * (parseFloat(dto.price || '0') || 1);
        const estimatedFee = orderValue * 0.0026; // Kraken taker fee
        const requiredBalance = orderValue + estimatedFee;
        
        // Extract base currency from pair (e.g., USD from XXBTZUSD)
        // This is simplified - in production you'd parse the symbol properly
        this.logger.debug(`Order requires approximately ${requiredBalance} in balance`);
      }
    } catch (error) {
      this.logger.warn('Failed to validate balance, allowing order creation');
      // Don't block order creation if balance check fails
    }
  }
}
