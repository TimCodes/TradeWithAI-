import { Injectable } from '@nestjs/common';
import { Order } from '../entities/order.entity';
import { Position } from '../entities/position.entity';
import { Trade } from '../entities/trade.entity';

// WebSocket gateway events
export const TRADING_EVENTS = {
  ORDER_CREATED: 'trading.order.created',
  ORDER_SUBMITTED: 'trading.order.submitted',
  ORDER_FILLED: 'trading.order.filled',
  ORDER_CANCELLED: 'trading.order.cancelled',
  ORDER_REJECTED: 'trading.order.rejected',
  POSITION_OPENED: 'trading.position.opened',
  POSITION_UPDATED: 'trading.position.updated',
  POSITION_CLOSED: 'trading.position.closed',
  TRADE_EXECUTED: 'trading.trade.executed',
  BALANCE_UPDATED: 'trading.balance.updated',
};

export interface OrderEventPayload {
  userId: string;
  order: Order;
}

export interface PositionEventPayload {
  userId: string;
  position: Position;
}

export interface TradeEventPayload {
  userId: string;
  trade: Trade;
}

export interface BalanceEventPayload {
  userId: string;
  balance: Record<string, any>;
}

/**
 * WebSocket Events Service for Trading
 * 
 * This service defines the event structure for real-time trading updates.
 * When a WebSocketGateway is implemented (Epic 3), it will subscribe to these events
 * and broadcast them to connected clients.
 * 
 * Usage:
 * - OrderExecutorService emits events when order status changes
 * - TradingService emits events when positions are updated
 * - WebSocketGateway listens to these events and broadcasts to clients
 * 
 * Example WebSocket message format:
 * {
 *   event: 'trading.order.filled',
 *   data: {
 *     userId: 'user-123',
 *     order: { ... }
 *   }
 * }
 */
@Injectable()
export class TradingEventsService {
  // This is a placeholder service that defines the event structure
  // When WebSocketGateway is implemented, it will use @OnEvent decorators
  // to listen to these events and broadcast them via Socket.IO

  /**
   * Example of how WebSocketGateway would handle these events:
   * 
   * @OnEvent(TRADING_EVENTS.ORDER_FILLED)
   * async handleOrderFilled(payload: OrderEventPayload) {
   *   this.server
   *     .to(`user:${payload.userId}`)
   *     .emit('order:filled', payload.order);
   * }
   */

  // Event emitters (to be called from TradingService and OrderExecutorService)
  
  emitOrderCreated(payload: OrderEventPayload): void {
    // EventEmitter will be injected when @nestjs/event-emitter is set up
    // this.eventEmitter.emit(TRADING_EVENTS.ORDER_CREATED, payload);
  }

  emitOrderSubmitted(payload: OrderEventPayload): void {
    // this.eventEmitter.emit(TRADING_EVENTS.ORDER_SUBMITTED, payload);
  }

  emitOrderFilled(payload: OrderEventPayload): void {
    // this.eventEmitter.emit(TRADING_EVENTS.ORDER_FILLED, payload);
  }

  emitOrderCancelled(payload: OrderEventPayload): void {
    // this.eventEmitter.emit(TRADING_EVENTS.ORDER_CANCELLED, payload);
  }

  emitOrderRejected(payload: OrderEventPayload): void {
    // this.eventEmitter.emit(TRADING_EVENTS.ORDER_REJECTED, payload);
  }

  emitPositionOpened(payload: PositionEventPayload): void {
    // this.eventEmitter.emit(TRADING_EVENTS.POSITION_OPENED, payload);
  }

  emitPositionUpdated(payload: PositionEventPayload): void {
    // this.eventEmitter.emit(TRADING_EVENTS.POSITION_UPDATED, payload);
  }

  emitPositionClosed(payload: PositionEventPayload): void {
    // this.eventEmitter.emit(TRADING_EVENTS.POSITION_CLOSED, payload);
  }

  emitTradeExecuted(payload: TradeEventPayload): void {
    // this.eventEmitter.emit(TRADING_EVENTS.TRADE_EXECUTED, payload);
  }

  emitBalanceUpdated(payload: BalanceEventPayload): void {
    // this.eventEmitter.emit(TRADING_EVENTS.BALANCE_UPDATED, payload);
  }
}
