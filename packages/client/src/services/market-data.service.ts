import { apiClient, handleAPIError, buildQueryString } from './api';

/**
 * Market Data Types
 */
export interface Ticker {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  change24h: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  timestamp: Date;
}

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Market Data Query Types
 */
export interface GetHistoricalDataQuery {
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  from?: string; // ISO date string
  to?: string;   // ISO date string
  limit?: number;
}

export interface BackfillDataRequest {
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  from: string; // ISO date string
  to: string;   // ISO date string
}

/**
 * Market Data Service
 * 
 * Provides methods for interacting with market data endpoints:
 * - Get current ticker data
 * - Get order book depth
 * - Get historical OHLCV data
 * - Backfill historical data
 * - Get supported symbols
 */
export class MarketDataService {
  /**
   * Get current ticker for a symbol
   */
  static async getTicker(symbol: string): Promise<Ticker> {
    try {
      const response = await apiClient.get<Ticker>(`/market-data/ticker/${symbol}`);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get tickers for all symbols
   */
  static async getAllTickers(): Promise<Record<string, Ticker>> {
    try {
      const response = await apiClient.get<Record<string, Ticker>>('/market-data/tickers');
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get order book for a symbol
   */
  static async getOrderBook(symbol: string, depth: number = 15): Promise<OrderBookData> {
    try {
      const response = await apiClient.get<OrderBookData>(
        `/market-data/orderbook/${symbol}?depth=${depth}`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get historical OHLCV data
   */
  static async getHistoricalData(query: GetHistoricalDataQuery): Promise<OHLCV[]> {
    try {
      const { symbol, ...params } = query;
      const queryString = buildQueryString(params);
      const response = await apiClient.get<OHLCV[]>(
        `/market-data/historical/${symbol}?${queryString}`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Backfill historical data from exchange
   */
  static async backfillData(request: BackfillDataRequest): Promise<{ message: string; count: number }> {
    try {
      const response = await apiClient.post<{ message: string; count: number }>(
        '/market-data/backfill',
        request
      );
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get list of supported trading symbols
   */
  static async getSymbols(): Promise<string[]> {
    try {
      const response = await apiClient.get<string[]>('/market-data/symbols');
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get market summary for all symbols
   */
  static async getMarketSummary(): Promise<any> {
    try {
      const response = await apiClient.get('/market-data/summary');
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Health check for market data service
   */
  static async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      const response = await apiClient.get<{ status: string; timestamp: Date }>(
        '/market-data/health'
      );
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }
}

export default MarketDataService;
