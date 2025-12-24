// Store Type Definitions for Zustand Stores

// ==================== Trading Store Types ====================

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  size: number;
  price?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  filledSize: number;
  averagePrice?: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export interface Balance {
  currency: string;
  available: number;
  reserved: number;
  total: number;
}

export interface TradingStats {
  totalPnl: number;
  totalPnlPercent: number;
  winRate: number;
  totalTrades: number;
  openPositions: number;
  portfolioValue: number;
}

export interface TradingState {
  positions: Position[];
  orders: Order[];
  balances: Balance[];
  stats: TradingStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setPositions: (positions: Position[]) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  removePosition: (id: string) => void;
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  removeOrder: (id: string) => void;
  setBalances: (balances: Balance[]) => void;
  setStats: (stats: TradingStats) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ==================== LLM Store Types ====================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: {
    tradeSignal?: TradeSignal;
    confidence?: number;
    responseTime?: number;
  };
}

export interface TradeSignal {
  action: 'buy' | 'sell' | 'hold';
  symbol: string;
  price?: number;
  size?: number;
  confidence: number;
  reasoning: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface LLMProvider {
  id: string;
  name: string;
  enabled: boolean;
  responseTime?: number;
  lastUsed?: Date;
}

export interface LLMState {
  messages: ChatMessage[];
  signals: import('@alpha-arena/shared').TradeSignal[];
  currentProvider: string;
  providers: LLMProvider[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Message actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  
  // Provider actions
  setCurrentProvider: (providerId: string) => void;
  setProviders: (providers: LLMProvider[]) => void;
  updateProvider: (id: string, updates: Partial<LLMProvider>) => void;
  
  // Signal actions
  addSignal: (signal: import('@alpha-arena/shared').TradeSignal) => void;
  addSignals: (signals: import('@alpha-arena/shared').TradeSignal[]) => void;
  updateSignal: (id: string, updates: Partial<import('@alpha-arena/shared').TradeSignal>) => void;
  removeSignal: (id: string) => void;
  clearSignals: () => void;
  
  // UI state actions
  setStreaming: (isStreaming: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  reset: () => void;
}

// ==================== Market Data Store Types ====================

export interface TickerData {
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

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
  timestamp: Date;
}

export interface OHLCVData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataState {
  tickers: Record<string, TickerData>;
  orderBooks: Record<string, OrderBook>;
  ohlcvData: Record<string, OHLCVData[]>;
  subscribedSymbols: string[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTicker: (symbol: string, ticker: TickerData) => void;
  setOrderBook: (symbol: string, orderBook: OrderBook) => void;
  setOHLCVData: (symbol: string, data: OHLCVData[]) => void;
  appendOHLCV: (symbol: string, candle: OHLCVData) => void;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  setConnected: (isConnected: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ==================== Auth Store Types ====================

export interface User {
  id: string;
  email: string;
  username?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface ApiKeyStatus {
  provider: string;
  isConfigured: boolean;
  isValid: boolean;
  lastChecked?: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultSymbol: string;
  defaultTimeframe: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  autoExecuteSignals: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  apiKeyStatuses: ApiKeyStatus[];
  preferences: UserPreferences;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (token: string, refreshToken: string) => void;
  clearTokens: () => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setApiKeyStatuses: (statuses: ApiKeyStatus[]) => void;
  updateApiKeyStatus: (provider: string, status: Partial<ApiKeyStatus>) => void;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  reset: () => void;
}
