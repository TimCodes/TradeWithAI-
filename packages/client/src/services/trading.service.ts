import { apiClient, handleAPIError, buildQueryString } from './api';
import type { Order, Position, Balance, TradingStats } from '../types/store.types';

/**
 * Trading API Request Types
 */
export interface PlaceOrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  size: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface CancelOrderRequest {
  orderId: string;
}

export interface ClosePositionRequest {
  positionId: string;
  size?: number; // Optional: partial close
}

export interface GetOrdersQuery {
  symbol?: string;
  status?: 'pending' | 'filled' | 'cancelled' | 'rejected';
  limit?: number;
  offset?: number;
}

export interface GetPositionsQuery {
  symbol?: string;
  side?: 'long' | 'short';
}

/**
 * Trading API Response Types
 */
export interface PlaceOrderResponse {
  order: Order;
  message: string;
}

export interface CancelOrderResponse {
  orderId: string;
  message: string;
}

export interface ClosePositionResponse {
  position: Position;
  closedSize: number;
  message: string;
}

/**
 * Trading Service
 * 
 * Provides methods for interacting with trading endpoints:
 * - Place orders (market/limit)
 * - Cancel orders
 * - Get open/closed orders
 * - Get positions
 * - Close positions
 * - Get account balance
 * - Get trading statistics
 */
export class TradingService {
  /**
   * Place a new order
   */
  static async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    try {
      const response = await apiClient.post<PlaceOrderResponse>('/trading/orders', request);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Cancel an existing order
   */
  static async cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse> {
    try {
      const response = await apiClient.delete<CancelOrderResponse>(
        `/trading/orders/${request.orderId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get all orders (with optional filters)
   */
  static async getOrders(query?: GetOrdersQuery): Promise<Order[]> {
    try {
      const queryString = query ? `?${buildQueryString(query)}` : '';
      const response = await apiClient.get<Order[]>(`/trading/orders${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get a specific order by ID
   */
  static async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await apiClient.get<Order>(`/trading/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get all positions (with optional filters)
   */
  static async getPositions(query?: GetPositionsQuery): Promise<Position[]> {
    try {
      const queryString = query ? `?${buildQueryString(query)}` : '';
      const response = await apiClient.get<Position[]>(`/trading/positions${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get a specific position by ID
   */
  static async getPosition(positionId: string): Promise<Position> {
    try {
      const response = await apiClient.get<Position>(`/trading/positions/${positionId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Close a position (fully or partially)
   */
  static async closePosition(request: ClosePositionRequest): Promise<ClosePositionResponse> {
    try {
      const response = await apiClient.post<ClosePositionResponse>(
        `/trading/positions/${request.positionId}/close`,
        { size: request.size }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get account balance
   */
  static async getBalance(): Promise<Balance[]> {
    try {
      const response = await apiClient.get<Balance[]>('/trading/balance');
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get trading statistics
   */
  static async getStats(): Promise<TradingStats> {
    try {
      const response = await apiClient.get<TradingStats>('/trading/stats');
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get trade history
   */
  static async getTradeHistory(query?: { limit?: number; offset?: number }): Promise<any[]> {
    try {
      const queryString = query ? `?${buildQueryString(query)}` : '';
      const response = await apiClient.get<any[]>(`/trading/trades${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }
}

export default TradingService;
