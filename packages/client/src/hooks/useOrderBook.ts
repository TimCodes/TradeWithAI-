import { useEffect, useState, useCallback } from 'react';
import { useMarketData } from './useMarketData';
import { useMarketDataStore } from '../stores/useMarketDataStore';
import type { OrderBook, OrderBookLevel } from '../types/store.types';

export interface UseOrderBookOptions {
  symbol: string;
  depth?: number;
  autoSubscribe?: boolean;
}

export interface UseOrderBookReturn {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
  midPrice: number | null;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

/**
 * React Hook for Order Book Data
 * 
 * Features:
 * - Real-time order book updates via WebSocket
 * - Configurable depth (top N levels)
 * - Automatic subscription management
 * - Bid/Ask spread calculations
 * - Mid-price calculation
 * 
 * @example
 * ```tsx
 * const { bids, asks, spread, midPrice } = useOrderBook({
 *   symbol: 'BTC/USD',
 *   depth: 15,
 *   autoSubscribe: true,
 * });
 * ```
 */
export function useOrderBook(options: UseOrderBookOptions): UseOrderBookReturn {
  const { symbol, depth = 15, autoSubscribe = true } = options;
  
  const [isLoading, setIsLoading] = useState(true);
  
  const { isConnected, error, subscribe, unsubscribe } = useMarketData({
    autoSubscribe: false,
  });
  
  const { orderBooks } = useMarketDataStore();
  
  const orderBook: OrderBook | undefined = orderBooks[symbol];

  /**
   * Calculate mid-price from best bid and ask
   */
  const calculateMidPrice = useCallback((): number | null => {
    if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return null;
    }
    
    const bestBid = orderBook.bids[0].price;
    const bestAsk = orderBook.asks[0].price;
    
    return (bestBid + bestAsk) / 2;
  }, [orderBook]);

  /**
   * Get top N levels from bids/asks
   */
  const getTopLevels = useCallback((
    levels: OrderBookLevel[],
    count: number
  ): OrderBookLevel[] => {
    return levels.slice(0, count);
  }, []);

  /**
   * Subscribe to symbol on mount
   */
  useEffect(() => {
    if (autoSubscribe && isConnected) {
      subscribe([symbol]);
      setIsLoading(false);
    }
    
    return () => {
      if (autoSubscribe) {
        unsubscribe([symbol]);
      }
    };
  }, [symbol, autoSubscribe, isConnected, subscribe, unsubscribe]);

  /**
   * Update loading state when data arrives
   */
  useEffect(() => {
    if (orderBook && isLoading) {
      setIsLoading(false);
    }
  }, [orderBook, isLoading]);

  const bids = orderBook ? getTopLevels(orderBook.bids, depth) : [];
  const asks = orderBook ? getTopLevels(orderBook.asks, depth) : [];
  const spread = orderBook?.spread || 0;
  const spreadPercent = orderBook?.spreadPercent || 0;
  const midPrice = calculateMidPrice();
  const lastUpdate = orderBook?.timestamp || null;

  return {
    bids,
    asks,
    spread,
    spreadPercent,
    midPrice,
    isLoading,
    isConnected,
    error,
    lastUpdate,
  };
}
