import { useState, useEffect, useCallback, useRef } from 'react';
import { useMarketDataStore } from '../stores/useMarketDataStore';
import { useTradingStore } from '../stores/useTradingStore';
import type { OHLCVData } from '../types/store.types';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

interface UseChartDataOptions {
  symbol: string;
  timeframe: Timeframe;
  autoUpdate?: boolean;
}

interface UseChartDataReturn {
  data: OHLCVData[];
  isLoading: boolean;
  error: string | null;
  trades: TradeMarker[];
  currentPrice: number | null;
  changeTimeframe: (timeframe: Timeframe) => void;
  refresh: () => Promise<void>;
}

export interface TradeMarker {
  time: number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown';
  text: string;
  size: number;
  price: number;
}

/**
 * React Hook for Chart Data Management
 * 
 * Features:
 * - Fetches and manages OHLCV data
 * - Real-time price updates
 * - Trade markers on chart
 * - Timeframe switching
 * - Auto-refresh support
 * 
 * @example
 * ```tsx
 * const { data, trades, currentPrice, changeTimeframe } = useChartData({
 *   symbol: 'BTC/USD',
 *   timeframe: '15m',
 *   autoUpdate: true,
 * });
 * ```
 */
export function useChartData(options: UseChartDataOptions): UseChartDataReturn {
  const { symbol, timeframe, autoUpdate = true } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>(timeframe);
  
  const { ohlcvData, tickers, setOHLCVData } = useMarketDataStore();
  const { positions } = useTradingStore();
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const data = ohlcvData[symbol] || [];
  const currentPrice = tickers[symbol]?.price || null;

  /**
   * Convert positions to trade markers for chart
   */
  const trades: TradeMarker[] = positions
    .filter((position) => position.symbol === symbol)
    .map((position) => ({
      time: Math.floor(position.createdAt.getTime() / 1000),
      position: position.side === 'long' ? 'belowBar' : 'aboveBar',
      color: position.side === 'long' ? '#22c55e' : '#ef4444',
      shape: position.side === 'long' ? 'arrowUp' : 'arrowDown',
      text: `${position.side.toUpperCase()} ${position.size}`,
      size: 1,
      price: position.entryPrice,
    })) as TradeMarker[];

  /**
   * Fetch historical OHLCV data from API
   */
  const fetchOHLCVData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Calculate time range based on timeframe
      const now = Date.now();
      const timeRanges: Record<Timeframe, number> = {
        '1m': 24 * 60 * 60 * 1000, // 1 day
        '5m': 3 * 24 * 60 * 60 * 1000, // 3 days
        '15m': 7 * 24 * 60 * 60 * 1000, // 7 days
        '1h': 30 * 24 * 60 * 60 * 1000, // 30 days
        '4h': 90 * 24 * 60 * 60 * 1000, // 90 days
        '1d': 365 * 24 * 60 * 60 * 1000, // 1 year
      };
      
      const startTime = now - timeRanges[currentTimeframe];
      
      // TODO: Replace with actual API call when Story 4.2 is complete
      // For now, we'll use mock data or data from the store
      const response = await fetch(
        `/api/market-data/historical/${symbol}?timeframe=${currentTimeframe}&start=${startTime}&end=${now}`,
        { signal: abortControllerRef.current.signal }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      
      // Convert to OHLCVData format
      const formattedData: OHLCVData[] = rawData.map((item: any) => ({
        timestamp: new Date(item.timestamp),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }));
      
      setOHLCVData(symbol, formattedData);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Ignore abort errors
        return;
      }
      
      console.error('Error fetching OHLCV data:', err);
      setError(err.message || 'Failed to fetch chart data');
      
      // Fallback to mock data for development
      if (process.env.NODE_ENV === 'development') {
        const mockData = generateMockOHLCVData(currentTimeframe);
        setOHLCVData(symbol, mockData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [symbol, currentTimeframe, setOHLCVData]);

  /**
   * Change timeframe and refresh data
   */
  const changeTimeframe = useCallback((newTimeframe: Timeframe) => {
    setCurrentTimeframe(newTimeframe);
  }, []);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchOHLCVData();
  }, [fetchOHLCVData]);

  /**
   * Initial data fetch and timeframe change handler
   */
  useEffect(() => {
    fetchOHLCVData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchOHLCVData]);

  /**
   * Auto-update data periodically
   */
  useEffect(() => {
    if (!autoUpdate) return;
    
    const updateIntervals: Record<Timeframe, number> = {
      '1m': 60 * 1000, // 1 minute
      '5m': 5 * 60 * 1000, // 5 minutes
      '15m': 15 * 60 * 1000, // 15 minutes
      '1h': 60 * 60 * 1000, // 1 hour
      '4h': 4 * 60 * 60 * 1000, // 4 hours
      '1d': 24 * 60 * 60 * 1000, // 1 day
    };
    
    const interval = setInterval(() => {
      fetchOHLCVData();
    }, updateIntervals[currentTimeframe]);
    
    return () => clearInterval(interval);
  }, [autoUpdate, currentTimeframe, fetchOHLCVData]);

  return {
    data,
    isLoading,
    error,
    trades,
    currentPrice,
    changeTimeframe,
    refresh,
  };
}

/**
 * Generate mock OHLCV data for development
 */
function generateMockOHLCVData(timeframe: Timeframe): OHLCVData[] {
  const now = Date.now();
  const data: OHLCVData[] = [];
  
  const intervals: Record<Timeframe, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  
  const counts: Record<Timeframe, number> = {
    '1m': 1440, // 1 day
    '5m': 864, // 3 days
    '15m': 672, // 7 days
    '1h': 720, // 30 days
    '4h': 540, // 90 days
    '1d': 365, // 1 year
  };
  
  const interval = intervals[timeframe];
  const count = counts[timeframe];
  
  let price = 45000; // Starting BTC price
  
  for (let i = count; i > 0; i--) {
    const timestamp = new Date(now - i * interval);
    const change = (Math.random() - 0.5) * 1000;
    price += change;
    
    const high = price + Math.random() * 500;
    const low = price - Math.random() * 500;
    const open = price + (Math.random() - 0.5) * 300;
    const close = price + (Math.random() - 0.5) * 300;
    const volume = Math.random() * 100;
    
    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });
  }
  
  return data;
}
