import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { Order, OrderStatus, OrderType, OrderSide } from '../entities/order.entity';
import { Position, PositionStatus } from '../entities/position.entity';
import { Trade, TradeType } from '../entities/trade.entity';
import { KrakenService } from './kraken.service';
import { TradingEventsService } from './trading-events.service';

export interface OrderExecutionJob {
  orderId: string;
  userId: string;
}

@Injectable()
@Processor('order-execution')
export class OrderExecutorService {
  private readonly logger = new Logger(OrderExecutorService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectQueue('order-execution')
    private readonly orderQueue: Queue,
    private readonly krakenService: KrakenService,
    private readonly tradingEventsService: TradingEventsService,
  ) {}

  /**
   * Add an order to the execution queue
   */
  async queueOrder(orderId: string, userId: string): Promise<void> {
    await this.orderQueue.add(
      'execute-order',
      { orderId, userId } as OrderExecutionJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.log(`Order ${orderId} queued for execution`);
  }

  /**
   * Process order execution job
   */
  @Process('execute-order')
  async handleOrderExecution(job: Job<OrderExecutionJob>): Promise<void> {
    const { orderId, userId } = job.data;
    this.logger.log(`Processing order execution for order ${orderId}`);

    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId, userId },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (!order.isActive) {
        this.logger.warn(`Order ${orderId} is not active, skipping execution`);
        return;
      }

      // Update status to submitted
      await this.updateOrderStatus(order, OrderStatus.SUBMITTED);

      // Execute order on exchange
      const exchangeResponse = await this.executeOnExchange(order);

      // Update order with exchange information
      order.exchangeOrderId = exchangeResponse.orderId;
      order.status = OrderStatus.OPEN;
      order.submittedAt = new Date();
      await this.orderRepository.save(order);

      this.logger.log(`Order ${orderId} successfully submitted to exchange`);

      // For market orders, check immediate fill
      if (order.type === OrderType.MARKET) {
        await this.checkOrderFill(order);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to execute order ${orderId}: ${errorMessage}`, errorStack);
      
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (order) {
        order.status = OrderStatus.REJECTED;
        order.rejectReason = errorMessage;
        await this.orderRepository.save(order);
        
        // Emit order rejected event
        this.tradingEventsService.emitOrderRejected({
          userId: order.userId,
          order,
        });
      }

      throw error;
    }
  }

  /**
   * Execute order on Kraken exchange
   */
  private async executeOnExchange(order: Order): Promise<{ orderId: string }> {
    const orderType = this.mapOrderTypeToKraken(order.type);
    const orderSide = order.side === OrderSide.BUY ? 'buy' : 'sell';

    const krakenOrder: any = {
      ordertype: orderType,
      type: orderSide,
      volume: order.quantity,
      pair: order.symbol,
      userref: order.clientOrderId || undefined,
    };

    // Add price for limit orders
    if (order.type === OrderType.LIMIT && order.price) {
      krakenOrder.price = order.price;
    }

    // Add stop price for stop orders
    if (
      (order.type === OrderType.STOP_LOSS || order.type === OrderType.STOP_LOSS_LIMIT) &&
      order.stopPrice
    ) {
      krakenOrder.price = order.stopPrice;
      if (order.price && order.type === OrderType.STOP_LOSS_LIMIT) {
        krakenOrder.price2 = order.price;
      }
    }

    // Add time in force
    if (order.timeInForce) {
      krakenOrder.timeinforce = order.timeInForce;
    }

    const result = await this.krakenService.placeOrder(krakenOrder);
    
    return {
      orderId: result.txid?.[0] || '',
    };
  }

  /**
   * Check if an order has been filled
   */
  async checkOrderFill(order: Order): Promise<void> {
    if (!order.exchangeOrderId) {
      this.logger.warn(`Order ${order.id} has no exchange order ID`);
      return;
    }

    try {
      const openOrders = await this.krakenService.getOpenOrders();
      const isOpen = openOrders.open?.[order.exchangeOrderId];

      if (!isOpen) {
        // Order is not in open orders, might be filled or cancelled
        await this.processFilledOrder(order);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to check order fill for ${order.id}: ${errorMessage}`);
    }
  }

  /**
   * Process a filled order
   */
  private async processFilledOrder(order: Order): Promise<void> {
    // In a real implementation, fetch trade details from exchange
    // For now, simulate the fill
    const fillPrice = order.price || '0'; // Would come from exchange
    const fillQuantity = order.quantity;
    const fee = parseFloat(fillQuantity) * 0.0026; // Kraken taker fee

    // Create trade record
    const trade = this.tradeRepository.create({
      userId: order.userId,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      type: TradeType.ENTRY, // Will be determined by position logic
      quantity: fillQuantity,
      price: fillPrice,
      value: (parseFloat(fillQuantity) * parseFloat(fillPrice)).toFixed(8),
      fee: fee.toFixed(8),
      exchangeOrderId: order.exchangeOrderId,
      llmProvider: order.llmProvider,
      llmReasoning: order.llmReasoning,
      llmConfidence: order.llmConfidence,
      executedAt: new Date(),
    });

    await this.tradeRepository.save(trade);

    // Update order status
    order.status = OrderStatus.FILLED;
    order.filledQuantity = fillQuantity;
    order.averageFillPrice = fillPrice;
    order.filledAt = new Date();
    await this.orderRepository.save(order);

    // Emit order filled event
    this.tradingEventsService.emitOrderFilled({
      userId: order.userId,
      order,
    });

    // Emit trade executed event
    this.tradingEventsService.emitTradeExecuted({
      userId: order.userId,
      trade,
    });

    // Create or update position
    await this.updatePosition(order, trade);

    this.logger.log(`Order ${order.id} filled at price ${fillPrice}`);
  }

  /**
   * Create or update position based on filled order
   */
  private async updatePosition(order: Order, trade: Trade): Promise<void> {
    // Find existing open position for this symbol and user
    const existingPosition = await this.positionRepository.findOne({
      where: {
        userId: order.userId,
        symbol: order.symbol,
        status: PositionStatus.OPEN,
      },
    });

    if (!existingPosition) {
      // Create new position
      const costBasis = parseFloat(trade.value) + parseFloat(trade.fee);
      
      const position = this.positionRepository.create({
        userId: order.userId,
        symbol: order.symbol,
        side: order.side,
        quantity: trade.quantity,
        entryPrice: trade.price,
        costBasis: costBasis.toFixed(8),
        fees: trade.fee,
        status: PositionStatus.OPEN,
      });

      await this.positionRepository.save(position);
      
      trade.positionId = position.id;
      trade.type = TradeType.ENTRY;
      await this.tradeRepository.save(trade);

      // Emit position opened event
      this.tradingEventsService.emitPositionOpened({
        userId: order.userId,
        position,
      });

      this.logger.log(`Created new position ${position.id} for order ${order.id}`);
    } else {
      // Check if this is closing or adding to position
      if (order.side !== existingPosition.side) {
        // Closing position (or reducing it)
        await this.closeOrReducePosition(existingPosition, trade);
      } else {
        // Adding to existing position - average in
        await this.addToPosition(existingPosition, trade);
      }
    }
  }

  /**
   * Close or reduce an existing position
   */
  private async closeOrReducePosition(position: Position, trade: Trade): Promise<void> {
    const positionQty = parseFloat(position.quantity);
    const tradeQty = parseFloat(trade.quantity);

    if (tradeQty >= positionQty) {
      // Full close
      position.closePosition(trade.price, parseFloat(trade.fee));
      trade.type = TradeType.EXIT;
      trade.positionId = position.id;
      trade.calculatePnl(position.entryPrice);
    } else {
      // Partial close
      const remainingQty = positionQty - tradeQty;
      const partialPnl = parseFloat(position.unrealizedPnl) * (tradeQty / positionQty);
      
      position.quantity = remainingQty.toFixed(8);
      position.realizedPnl = (parseFloat(position.realizedPnl) + partialPnl).toFixed(8);
      
      trade.type = TradeType.PARTIAL_EXIT;
      trade.positionId = position.id;
      trade.calculatePnl(position.entryPrice);
    }

    await this.positionRepository.save(position);
    await this.tradeRepository.save(trade);

    // Emit position event based on whether it was closed or reduced
    if (position.status === PositionStatus.CLOSED) {
      this.tradingEventsService.emitPositionClosed({
        userId: position.userId,
        position,
      });
    } else {
      this.tradingEventsService.emitPositionUpdated({
        userId: position.userId,
        position,
      });
    }

    this.logger.log(`Updated position ${position.id} with trade ${trade.id}`);
  }

  /**
   * Add to an existing position (average entry price)
   */
  private async addToPosition(position: Position, trade: Trade): Promise<void> {
    const oldQty = parseFloat(position.quantity);
    const oldEntry = parseFloat(position.entryPrice);
    const newQty = parseFloat(trade.quantity);
    const newEntry = parseFloat(trade.price);
    const oldCost = parseFloat(position.costBasis);
    const newCost = parseFloat(trade.value) + parseFloat(trade.fee);

    // Calculate new average entry price
    const totalQty = oldQty + newQty;
    const totalCost = oldCost + newCost;
    const avgEntry = (oldEntry * oldQty + newEntry * newQty) / totalQty;

    position.quantity = totalQty.toFixed(8);
    position.entryPrice = avgEntry.toFixed(8);
    position.costBasis = totalCost.toFixed(8);
    position.fees = (parseFloat(position.fees) + parseFloat(trade.fee)).toFixed(8);

    trade.positionId = position.id;
    trade.type = TradeType.ENTRY;

    await this.positionRepository.save(position);
    await this.tradeRepository.save(trade);

    // Emit position updated event
    this.tradingEventsService.emitPositionUpdated({
      userId: position.userId,
      position,
    });

    this.logger.log(`Added to position ${position.id} with trade ${trade.id}`);
  }

  /**
   * Update order status and emit event
   */
  private async updateOrderStatus(order: Order, status: OrderStatus): Promise<void> {
    const previousStatus = order.status;
    order.status = status;
    await this.orderRepository.save(order);

    // Emit event based on status
    if (status === OrderStatus.SUBMITTED) {
      this.tradingEventsService.emitOrderSubmitted({
        userId: order.userId,
        order,
      });
    }
  }

  /**
   * Map internal order type to Kraken order type
   */
  private mapOrderTypeToKraken(orderType: OrderType): string {
    const mapping = {
      [OrderType.MARKET]: 'market',
      [OrderType.LIMIT]: 'limit',
      [OrderType.STOP_LOSS]: 'stop-loss',
      [OrderType.TAKE_PROFIT]: 'take-profit',
      [OrderType.STOP_LOSS_LIMIT]: 'stop-loss-limit',
      [OrderType.TAKE_PROFIT_LIMIT]: 'take-profit-limit',
    };

    return mapping[orderType] || 'market';
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, userId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (!order.isActive) {
      throw new Error(`Order ${orderId} is not active`);
    }

    // Cancel on exchange if it has been submitted
    if (order.exchangeOrderId) {
      try {
        await this.krakenService.cancelOrder(order.exchangeOrderId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to cancel order on exchange: ${errorMessage}`);
        throw error;
      }
    }

    // Update order status
    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    await this.orderRepository.save(order);

    // Emit order cancelled event
    this.tradingEventsService.emitOrderCancelled({
      userId: order.userId,
      order,
    });

    this.logger.log(`Order ${orderId} cancelled`);
  }
}
