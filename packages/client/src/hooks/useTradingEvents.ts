import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useTradingStore } from '../stores/useTradingStore';
import type { Order, Position, Balance } from '../types/store.types';

interface UseTradingEventsOptions {
  autoSubscribe?: boolean;
  onOrderFilled?: (order: Order) => void;
  onOrderCancelled?: (order: Order) => void;
  onOrderRejected?: (order: Order) => void;
  onPositionOpened?: (position: Position) => void;
  onPositionClosed?: (position: Position) => void;
  onBalanceUpdated?: (balance: Balance) => void;
}

interface UseTradingEventsReturn {
  isConnected: boolean;
  error: string | null;
  subscribe: () => void;
  unsubscribe: () => void;
}

/**
 * React Hook for Trading Events WebSocket Streaming
 * 
 * Features:
 * - Listen to order status updates (created, submitted, filled, cancelled, rejected)
 * - Listen to position updates (opened, updated, closed)
 * - Listen to balance changes
 * - Automatic store updates
 * - Optional callbacks for custom handling
 * - User-specific event channels
 * 
 * @example
 * ```tsx
 * const { isConnected, subscribe } = useTradingEvents({
 *   autoSubscribe: true,
 *   onOrderFilled: (order) => {
 *     toast.success(`Order filled: ${order.symbol}`);
 *   },
 *   onPositionClosed: (position) => {
 *     toast.info(`Position closed with P&L: ${position.realizedPnl}`);
 *   },
 * });
 * ```
 */
export function useTradingEvents(options: UseTradingEventsOptions = {}): UseTradingEventsReturn {
  const {
    autoSubscribe = false,
    onOrderFilled,
    onOrderCancelled,
    onOrderRejected,
    onPositionOpened,
    onPositionClosed,
    onBalanceUpdated,
  } = options;

  const { status, error, on, off, subscribe: wsSubscribe, unsubscribe: wsUnsubscribe } = useWebSocket();
  
  const {
    addOrder,
    updateOrder,
    updatePosition,
    removePosition,
    setBalances,
    setError,
  } = useTradingStore();

  /**
   * Handle order created event
   */
  const handleOrderCreated = useCallback((data: any) => {
    console.log('[Trading Events] Order created:', data.order);
    
    const order: Order = {
      id: data.order.id,
      symbol: data.order.symbol,
      side: data.order.side,
      type: data.order.type,
      size: data.order.size,
      price: data.order.price,
      status: data.order.status,
      filledSize: data.order.filledSize || 0,
      averagePrice: data.order.averagePrice,
      createdAt: new Date(data.order.createdAt),
      updatedAt: new Date(data.order.updatedAt),
    };

    addOrder(order);
  }, [addOrder]);

  /**
   * Handle order submitted event
   */
  const handleOrderSubmitted = useCallback((data: any) => {
    console.log('[Trading Events] Order submitted:', data.order);
    
    updateOrder(data.order.id, {
      status: 'pending',
      updatedAt: new Date(data.order.updatedAt),
    });
  }, [updateOrder]);

  /**
   * Handle order filled event
   */
  const handleOrderFilled = useCallback((data: any) => {
    console.log('[Trading Events] Order filled:', data.order);
    
    const orderUpdate: Partial<Order> = {
      status: 'filled',
      filledSize: data.order.filledSize,
      averagePrice: data.order.averagePrice,
      updatedAt: new Date(data.order.updatedAt),
    };

    updateOrder(data.order.id, orderUpdate);

    // Call optional callback
    if (onOrderFilled) {
      const order: Order = {
        id: data.order.id,
        symbol: data.order.symbol,
        side: data.order.side,
        type: data.order.type,
        size: data.order.size,
        price: data.order.price,
        status: 'filled',
        filledSize: data.order.filledSize,
        averagePrice: data.order.averagePrice,
        createdAt: new Date(data.order.createdAt),
        updatedAt: new Date(data.order.updatedAt),
      };
      onOrderFilled(order);
    }
  }, [updateOrder, onOrderFilled]);

  /**
   * Handle order cancelled event
   */
  const handleOrderCancelled = useCallback((data: any) => {
    console.log('[Trading Events] Order cancelled:', data.order);
    
    updateOrder(data.order.id, {
      status: 'cancelled',
      updatedAt: new Date(data.order.updatedAt),
    });

    // Call optional callback
    if (onOrderCancelled) {
      const order: Order = {
        id: data.order.id,
        symbol: data.order.symbol,
        side: data.order.side,
        type: data.order.type,
        size: data.order.size,
        price: data.order.price,
        status: 'cancelled',
        filledSize: data.order.filledSize || 0,
        averagePrice: data.order.averagePrice,
        createdAt: new Date(data.order.createdAt),
        updatedAt: new Date(data.order.updatedAt),
      };
      onOrderCancelled(order);
    }
  }, [updateOrder, onOrderCancelled]);

  /**
   * Handle order rejected event
   */
  const handleOrderRejected = useCallback((data: any) => {
    console.log('[Trading Events] Order rejected:', data.order);
    
    updateOrder(data.order.id, {
      status: 'rejected',
      error: data.order.error,
      updatedAt: new Date(data.order.updatedAt),
    });

    // Call optional callback
    if (onOrderRejected) {
      const order: Order = {
        id: data.order.id,
        symbol: data.order.symbol,
        side: data.order.side,
        type: data.order.type,
        size: data.order.size,
        price: data.order.price,
        status: 'rejected',
        filledSize: 0,
        averagePrice: data.order.averagePrice,
        createdAt: new Date(data.order.createdAt),
        updatedAt: new Date(data.order.updatedAt),
        error: data.order.error,
      };
      onOrderRejected(order);
    }
  }, [updateOrder, onOrderRejected]);

  /**
   * Handle position opened event
   */
  const handlePositionOpened = useCallback((data: any) => {
    console.log('[Trading Events] Position opened:', data.position);
    
    const position: Position = {
      id: data.position.id,
      symbol: data.position.symbol,
      side: data.position.side,
      size: data.position.size,
      entryPrice: data.position.entryPrice,
      currentPrice: data.position.currentPrice,
      unrealizedPnl: data.position.unrealizedPnl,
      unrealizedPnlPercent: data.position.unrealizedPnlPercent,
      realizedPnl: data.position.realizedPnl || 0,
      stopLoss: data.position.stopLoss,
      takeProfit: data.position.takeProfit,
      createdAt: new Date(data.position.createdAt),
      updatedAt: new Date(data.position.updatedAt),
    };

    updatePosition(data.position.id, position);

    // Call optional callback
    if (onPositionOpened) {
      onPositionOpened(position);
    }
  }, [updatePosition, onPositionOpened]);

  /**
   * Handle position updated event (P&L changes)
   */
  const handlePositionUpdated = useCallback((data: any) => {
    console.log('[Trading Events] Position updated:', data.position);
    
    updatePosition(data.position.id, {
      currentPrice: data.position.currentPrice,
      unrealizedPnl: data.position.unrealizedPnl,
      unrealizedPnlPercent: data.position.unrealizedPnlPercent,
      updatedAt: new Date(data.position.updatedAt),
    });
  }, [updatePosition]);

  /**
   * Handle position closed event
   */
  const handlePositionClosed = useCallback((data: any) => {
    console.log('[Trading Events] Position closed:', data.position);
    
    removePosition(data.position.id);

    // Call optional callback
    if (onPositionClosed) {
      const position: Position = {
        id: data.position.id,
        symbol: data.position.symbol,
        side: data.position.side,
        size: data.position.size,
        entryPrice: data.position.entryPrice,
        currentPrice: data.position.currentPrice,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        realizedPnl: data.position.realizedPnl,
        stopLoss: data.position.stopLoss,
        takeProfit: data.position.takeProfit,
        createdAt: new Date(data.position.createdAt),
        updatedAt: new Date(data.position.updatedAt),
      };
      onPositionClosed(position);
    }
  }, [removePosition, onPositionClosed]);

  /**
   * Handle trade executed event
   */
  const handleTradeExecuted = useCallback((data: any) => {
    console.log('[Trading Events] Trade executed:', data.trade);
    // Trade events are informational, order/position events handle state updates
  }, []);

  /**
   * Handle balance updated event
   */
  const handleBalanceUpdated = useCallback((data: any) => {
    console.log('[Trading Events] Balance updated:', data.balances);
    
    const balances: Balance[] = data.balances.map((b: any) => ({
      currency: b.currency,
      available: b.available,
      reserved: b.reserved,
      total: b.total,
    }));

    setBalances(balances);

    // Call optional callback for first balance
    if (onBalanceUpdated && balances.length > 0) {
      onBalanceUpdated(balances[0]);
    }
  }, [setBalances, onBalanceUpdated]);

  /**
   * Subscribe to trading events
   */
  const subscribe = useCallback(() => {
    console.log('[Trading Events] Subscribing to trading channel');
    wsSubscribe('trading');
  }, [wsSubscribe]);

  /**
   * Unsubscribe from trading events
   */
  const unsubscribe = useCallback(() => {
    console.log('[Trading Events] Unsubscribing from trading channel');
    wsUnsubscribe('trading');
  }, [wsUnsubscribe]);

  /**
   * Setup WebSocket event listeners
   */
  useEffect(() => {
    // Register event handlers for all trading events
    on('order:created', handleOrderCreated);
    on('order:submitted', handleOrderSubmitted);
    on('order:filled', handleOrderFilled);
    on('order:cancelled', handleOrderCancelled);
    on('order:rejected', handleOrderRejected);
    on('position:opened', handlePositionOpened);
    on('position:updated', handlePositionUpdated);
    on('position:closed', handlePositionClosed);
    on('trade:executed', handleTradeExecuted);
    on('balance:updated', handleBalanceUpdated);

    return () => {
      // Cleanup event handlers
      off('order:created', handleOrderCreated);
      off('order:submitted', handleOrderSubmitted);
      off('order:filled', handleOrderFilled);
      off('order:cancelled', handleOrderCancelled);
      off('order:rejected', handleOrderRejected);
      off('position:opened', handlePositionOpened);
      off('position:updated', handlePositionUpdated);
      off('position:closed', handlePositionClosed);
      off('trade:executed', handleTradeExecuted);
      off('balance:updated', handleBalanceUpdated);
    };
  }, [
    on,
    off,
    handleOrderCreated,
    handleOrderSubmitted,
    handleOrderFilled,
    handleOrderCancelled,
    handleOrderRejected,
    handlePositionOpened,
    handlePositionUpdated,
    handlePositionClosed,
    handleTradeExecuted,
    handleBalanceUpdated,
  ]);

  /**
   * Update error in store
   */
  useEffect(() => {
    if (error) {
      setError(error);
    }
  }, [error, setError]);

  /**
   * Auto-subscribe on mount if enabled
   */
  useEffect(() => {
    if (autoSubscribe && status === 'connected') {
      subscribe();
    }
  }, [autoSubscribe, status]); // Only subscribe when connection status changes

  return {
    isConnected: status === 'connected',
    error,
    subscribe,
    unsubscribe,
  };
}
