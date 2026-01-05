// User and Authentication Types
export interface User {
  id: string;
  email: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  provider: string;
  keyName: string;
  encryptedKey: string;
  encryptedSecret?: string;
  createdAt: Date;
}

// Trading Types
export interface Position {
  id: string;
  userId: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  size: number;
  price?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  llmProvider?: string;
  llmReasoning?: string;
  createdAt: Date;
  filledAt?: Date;
}

export interface Trade {
  id: string;
  userId: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  fee: number;
  timestamp: Date;
}

// Market Data Types
export interface Ticker {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
}

export interface OHLCV {
  time: Date;
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: Date;
}

// LLM Types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  provider: string;
  message: ChatMessage;
  reasoning?: string;
  confidence?: number;
  tradingSignal?: TradingSignal;
}

export interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  symbol: string;
  confidence: number;
  reasoning: string;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: Date;
}

export interface SubscriptionMessage extends WebSocketMessage {
  type: 'subscribe' | 'unsubscribe';
  data: {
    channel: string;
    symbols?: string[];
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Constants
export const TRADING_PAIRS = [
  'BTCUSD',
  'ETHUSD',
  'ADAUSD',
  'SOLUSD',
  'DOTUSD',
] as const;

export const LLM_PROVIDERS = [
  'claude',
  'openai',
  'gemini',
] as const;

export const CHART_INTERVALS = [
  '1m',
  '5m',
  '15m',
  '1h',
  '4h',
  '1d',
] as const;

export type TradingPair = typeof TRADING_PAIRS[number];
export type LLMProvider = typeof LLM_PROVIDERS[number];
export type ChartInterval = typeof CHART_INTERVALS[number];

// Trade Signal Types
export * from './types/trade-signal';