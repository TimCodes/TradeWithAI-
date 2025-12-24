import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useMarketDataStore } from '../stores/useMarketDataStore';
import type { TickerData, OrderBook } from '../types/store.types';

interface UseMarketDataOptions {
  autoSubscribe?: boolean;
  symbols?: string[];
  throttleMs?: number;
}

interface UseMarketDataReturn {
  isConnected: boolean;
  error: string | null;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getTicker: (symbol: string) => TickerData | undefined;
  getOrderBook: (symbol: string) => OrderBook | undefined;
}

/**
 * React Hook for Market Data WebSocket Streaming
 * 
 * Features:
 * - Subscribe to real-time price updates
 * - Subscribe to order book depth updates
 * - Automatic store updates
 * - Throttling for high-frequency updates
 * - Dynamic symbol subscription/unsubscription
 * 
 * @example
 * ```tsx
 * const { isConnected, subscribe, getTicker } = useMarketData({
 *   autoSubscribe: true,
 *   symbols: ['BTC/USD', 'ETH/USD'],
 * });
 * 
 * const btcPrice = getTicker('BTC/USD');
 * ```
 */
export function useMarketData(options: UseMarketDataOptions = {}): UseMarketDataReturn {
  const {
    autoSubscribe = false,
    symbols: initialSymbols = [],
    throttleMs = 100,
  } = options;

  const { status, error, on, off, subscribe: wsSubscribe, unsubscribe: wsUnsubscribe } = useWebSocket();
  
  const {
    setTicker,
    setOrderBook,
    subscribe: storeSubscribe,
    unsubscribe: storeUnsubscribe,
    setConnected,
    setError,
    tickers,
    orderBooks,
  } = useMarketDataStore();

  // Throttle map for high-frequency updates
  const throttleMap = new Map<string, number>();

  /**
   * Check if event should be throttled
   */
  const shouldThrottle = useCallback((key: string): boolean => {
    const now = Date.now();
    const lastUpdate = throttleMap.get(key);
    
    if (!lastUpdate || now - lastUpdate >= throttleMs) {
      throttleMap.set(key, now);
      return false;
    }
    
    return true;
  }, [throttleMs]);

  /**
   * Handle ticker update from WebSocket
   */
  const handleTickerUpdate = useCallback((data: any) => {
    if (shouldThrottle(`ticker:${data.symbol}`)) {
      return;
    }

    const ticker: TickerData = {
      symbol: data.symbol,
      price: data.price,
      bid: data.bid,
      ask: data.ask,
      volume24h: data.volume24h,
      change24h: data.change24h,
      change24hPercent: data.change24hPercent,
      high24h: data.high24h,
      low24h: data.low24h,
      timestamp: new Date(data.timestamp),
    };

    setTicker(data.symbol, ticker);
  }, [setTicker, shouldThrottle]);

  /**
   * Handle order book update from WebSocket
   */
  const handleOrderBookUpdate = useCallback((data: any) => {
    if (shouldThrottle(`orderbook:${data.symbol}`)) {
      return;
    }

    const orderBook: OrderBook = {
      symbol: data.symbol,
      bids: data.bids.map((level: any) => ({
        price: level.price,
        size: level.size,
        total: level.total,
      })),
      asks: data.asks.map((level: any) => ({
        price: level.price,
        size: level.size,
        total: level.total,
      })),
      spread: data.spread,
      spreadPercent: data.spreadPercent,
      timestamp: new Date(data.timestamp),
    };

    setOrderBook(data.symbol, orderBook);
  }, [setOrderBook, shouldThrottle]);

  /**
   * Handle subscription confirmation
   */
  const handleSubscribed = useCallback((data: any) => {
    console.log('[Market Data] Subscribed:', data);
  }, []);

  /**
   * Handle unsubscription confirmation
   */
  const handleUnsubscribed = useCallback((data: any) => {
    console.log('[Market Data] Unsubscribed:', data);
  }, []);

  /**
   * Subscribe to market data for symbols
   */
  const subscribe = useCallback((symbols: string[]) => {
    if (symbols.length === 0) return;
    
    console.log('[Market Data] Subscribing to symbols:', symbols);
    wsSubscribe('market-data', symbols);
    
    // Update store subscriptions
    symbols.forEach((symbol) => storeSubscribe(symbol));
  }, [wsSubscribe, storeSubscribe]);

  /**
   * Unsubscribe from market data for symbols
   */
  const unsubscribe = useCallback((symbols: string[]) => {
    if (symbols.length === 0) return;
    
    console.log('[Market Data] Unsubscribing from symbols:', symbols);
    wsUnsubscribe('market-data', symbols);
    
    // Update store subscriptions
    symbols.forEach((symbol) => storeUnsubscribe(symbol));
  }, [wsUnsubscribe, storeUnsubscribe]);

  /**
   * Get ticker data for a symbol
   */
  const getTicker = useCallback((symbol: string): TickerData | undefined => {
    return tickers[symbol];
  }, [tickers]);

  /**
   * Get order book for a symbol
   */
  const getOrderBook = useCallback((symbol: string): OrderBook | undefined => {
    return orderBooks[symbol];
  }, [orderBooks]);

  /**
   * Setup WebSocket event listeners
   */
  useEffect(() => {
    // Register event handlers
    on('market:ticker', handleTickerUpdate);
    on('market:orderbook', handleOrderBookUpdate);
    on('subscribed', handleSubscribed);
    on('unsubscribed', handleUnsubscribed);

    return () => {
      // Cleanup event handlers
      off('market:ticker', handleTickerUpdate);
      off('market:orderbook', handleOrderBookUpdate);
      off('subscribed', handleSubscribed);
      off('unsubscribed', handleUnsubscribed);
    };
  }, [on, off, handleTickerUpdate, handleOrderBookUpdate, handleSubscribed, handleUnsubscribed]);

  /**
   * Update connection status in store
   */
  useEffect(() => {
    setConnected(status === 'connected');
    
    if (status === 'error' && error) {
      setError(error);
    } else if (status === 'connected') {
      setError(null);
    }
  }, [status, error, setConnected, setError]);

  /**
   * Auto-subscribe on mount if enabled
   */
  useEffect(() => {
    if (autoSubscribe && initialSymbols.length > 0 && status === 'connected') {
      subscribe(initialSymbols);
    }
  }, [autoSubscribe, status]); // Only subscribe when connection status changes

  return {
    isConnected: status === 'connected',
    error,
    subscribe,
    unsubscribe,
    getTicker,
    getOrderBook,
  };
}
