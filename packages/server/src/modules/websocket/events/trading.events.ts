import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGatewayService } from '../websocket.gateway';
import {
  TRADING_EVENTS,
  OrderEventPayload,
  PositionEventPayload,
  TradeEventPayload,
  BalanceEventPayload,
} from '../../trading/services/trading-events.service';

/**
 * Trading Events Handler for WebSocket Broadcasting
 * 
 * Listens to trading events emitted by TradingService and OrderExecutorService
 * and broadcasts them to connected WebSocket clients in real-time.
 * 
 * Events broadcasted:
 * - order:created - New order created
 * - order:submitted - Order submitted to exchange
 * - order:filled - Order filled on exchange
 * - order:cancelled - Order cancelled
 * - order:rejected - Order rejected
 * - position:opened - New position opened
 * - position:updated - Position P&L updated
 * - position:closed - Position closed
 * - trade:executed - Trade executed
 * - balance:updated - Account balance changed
 * 
 * Client subscription:
 * ```typescript
 * socket.emit('subscribe', { channel: 'trading' });
 * socket.on('order:filled', (data) => {
 *   console.log('Order filled:', data);
 * });
 * ```
 */
@Injectable()
export class TradingEventsHandler {
  private readonly logger = new Logger(TradingEventsHandler.name);

  constructor(private readonly wsGateway: WebSocketGatewayService) {}

  /**
   * Handle order created event
   */
  @OnEvent(TRADING_EVENTS.ORDER_CREATED)
  handleOrderCreated(payload: OrderEventPayload) {
    this.logger.debug(`Broadcasting order created: ${payload.order.id}`);
    
    // Send to user-specific room
    this.wsGateway.sendToUser(payload.userId, 'order:created', {
      order: this.serializeOrder(payload.order),
    });

    // Broadcast to trading channel
    this.wsGateway.broadcastToRoom('trading', 'order:created', {
      userId: payload.userId,
      order: this.serializeOrder(payload.order),
    });
  }

  /**
   * Handle order submitted event
   */
  @OnEvent(TRADING_EVENTS.ORDER_SUBMITTED)
  handleOrderSubmitted(payload: OrderEventPayload) {
    this.logger.debug(`Broadcasting order submitted: ${payload.order.id}`);
    
    this.wsGateway.sendToUser(payload.userId, 'order:submitted', {
      order: this.serializeOrder(payload.order),
    });

    this.wsGateway.broadcastToRoom('trading', 'order:submitted', {
      userId: payload.userId,
      order: this.serializeOrder(payload.order),
    });
  }

  /**
   * Handle order filled event
   */
  @OnEvent(TRADING_EVENTS.ORDER_FILLED)
  handleOrderFilled(payload: OrderEventPayload) {
    this.logger.log(`Broadcasting order filled: ${payload.order.id}`);
    
    this.wsGateway.sendToUser(payload.userId, 'order:filled', {
      order: this.serializeOrder(payload.order),
    });

    this.wsGateway.broadcastToRoom('trading', 'order:filled', {
      userId: payload.userId,
      order: this.serializeOrder(payload.order),
    });
  }

  /**
   * Handle order cancelled event
   */
  @OnEvent(TRADING_EVENTS.ORDER_CANCELLED)
  handleOrderCancelled(payload: OrderEventPayload) {
    this.logger.debug(`Broadcasting order cancelled: ${payload.order.id}`);
    
    this.wsGateway.sendToUser(payload.userId, 'order:cancelled', {
      order: this.serializeOrder(payload.order),
    });

    this.wsGateway.broadcastToRoom('trading', 'order:cancelled', {
      userId: payload.userId,
      order: this.serializeOrder(payload.order),
    });
  }

  /**
   * Handle order rejected event
   */
  @OnEvent(TRADING_EVENTS.ORDER_REJECTED)
  handleOrderRejected(payload: OrderEventPayload) {
    this.logger.warn(`Broadcasting order rejected: ${payload.order.id}`);
    
    this.wsGateway.sendToUser(payload.userId, 'order:rejected', {
      order: this.serializeOrder(payload.order),
      reason: payload.order.rejectReason,
    });

    this.wsGateway.broadcastToRoom('trading', 'order:rejected', {
      userId: payload.userId,
      order: this.serializeOrder(payload.order),
      reason: payload.order.rejectReason,
    });
  }

  /**
   * Handle position opened event
   */
  @OnEvent(TRADING_EVENTS.POSITION_OPENED)
  handlePositionOpened(payload: PositionEventPayload) {
    this.logger.log(`Broadcasting position opened: ${payload.position.id}`);
    
    this.wsGateway.sendToUser(payload.userId, 'position:opened', {
      position: this.serializePosition(payload.position),
    });

    this.wsGateway.broadcastToRoom('trading', 'position:opened', {
      userId: payload.userId,
      position: this.serializePosition(payload.position),
    });
  }

  /**
   * Handle position updated event (P&L changes)
   */
  @OnEvent(TRADING_EVENTS.POSITION_UPDATED)
  handlePositionUpdated(payload: PositionEventPayload) {
    this.logger.debug(`Broadcasting position updated: ${payload.position.id}`);
    
    this.wsGateway.sendToUser(payload.userId, 'position:updated', {
      position: this.serializePosition(payload.position),
    });

    this.wsGateway.broadcastToRoom('trading', 'position:updated', {
      userId: payload.userId,
      position: this.serializePosition(payload.position),
    });
  }

  /**
   * Handle position closed event
   */
  @OnEvent(TRADING_EVENTS.POSITION_CLOSED)
  handlePositionClosed(payload: PositionEventPayload) {
    this.logger.log(`Broadcasting position closed: ${payload.position.id}`);
    
    this.wsGateway.sendToUser(payload.userId, 'position:closed', {
      position: this.serializePosition(payload.position),
    });

    this.wsGateway.broadcastToRoom('trading', 'position:closed', {
      userId: payload.userId,
      position: this.serializePosition(payload.position),
    });
  }

  /**
   * Handle trade executed event
   */
  @OnEvent(TRADING_EVENTS.TRADE_EXECUTED)
  handleTradeExecuted(payload: TradeEventPayload) {
    this.logger.log(`Broadcasting trade executed: ${payload.trade.id}`);
    
    this.wsGateway.sendToUser(payload.userId, 'trade:executed', {
      trade: this.serializeTrade(payload.trade),
    });

    this.wsGateway.broadcastToRoom('trading', 'trade:executed', {
      userId: payload.userId,
      trade: this.serializeTrade(payload.trade),
    });
  }

  /**
   * Handle balance updated event
   */
  @OnEvent(TRADING_EVENTS.BALANCE_UPDATED)
  handleBalanceUpdated(payload: BalanceEventPayload) {
    this.logger.debug(`Broadcasting balance updated for user: ${payload.userId}`);
    
    // Only send to specific user (balance is sensitive)
    this.wsGateway.sendToUser(payload.userId, 'balance:updated', {
      balance: payload.balance,
    });
  }

  /**
   * Serialize order for client
   * Remove sensitive or unnecessary data
   */
  private serializeOrder(order: any) {
    return {
      id: order.id,
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price,
      stopPrice: order.stopPrice,
      status: order.status,
      filledQuantity: order.filledQuantity,
      averagePrice: order.averagePrice,
      timeInForce: order.timeInForce,
      exchangeOrderId: order.exchangeOrderId,
      rejectReason: order.rejectReason,
      createdAt: order.createdAt,
      submittedAt: order.submittedAt,
      filledAt: order.filledAt,
      cancelledAt: order.cancelledAt,
    };
  }

  /**
   * Serialize position for client
   */
  private serializePosition(position: any) {
    return {
      id: position.id,
      symbol: position.symbol,
      side: position.side,
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      currentPrice: position.currentPrice,
      unrealizedPnL: position.unrealizedPnL,
      unrealizedPnLPercent: position.unrealizedPnLPercent,
      realizedPnL: position.realizedPnL,
      totalPnL: position.totalPnL,
      status: position.status,
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
      openedAt: position.openedAt,
      closedAt: position.closedAt,
      lastUpdated: position.lastUpdated,
    };
  }

  /**
   * Serialize trade for client
   */
  private serializeTrade(trade: any) {
    return {
      id: trade.id,
      orderId: trade.orderId,
      symbol: trade.symbol,
      side: trade.side,
      type: trade.type,
      quantity: trade.quantity,
      price: trade.price,
      value: trade.value,
      fee: trade.fee,
      exchangeOrderId: trade.exchangeOrderId,
      executedAt: trade.executedAt,
    };
  }
}
