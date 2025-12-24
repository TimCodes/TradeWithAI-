import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { TradingService, PlaceOrderRequest, CancelOrderRequest, ClosePositionRequest, GetOrdersQuery, GetPositionsQuery } from '../services/trading.service';
import { MarketDataService, GetHistoricalDataQuery, BackfillDataRequest } from '../services/market-data.service';
import { LLMService, SendMessageRequest, CompareProvidersRequest } from '../services/llm.service';
import type { Order, Position, Balance, TradingStats, ChatMessage } from '../types/store.types';
import type { Ticker, OrderBookData, OHLCV } from '../services/market-data.service';

/**
 * Query Keys for React Query
 */
export const queryKeys = {
  // Trading
  orders: (query?: GetOrdersQuery) => ['orders', query],
  order: (id: string) => ['order', id],
  positions: (query?: GetPositionsQuery) => ['positions', query],
  position: (id: string) => ['position', id],
  balance: () => ['balance'],
  stats: () => ['stats'],
  tradeHistory: () => ['tradeHistory'],

  // Market Data
  ticker: (symbol: string) => ['ticker', symbol],
  allTickers: () => ['allTickers'],
  orderBook: (symbol: string, depth?: number) => ['orderBook', symbol, depth],
  historicalData: (query: GetHistoricalDataQuery) => ['historicalData', query],
  symbols: () => ['symbols'],
  marketSummary: () => ['marketSummary'],

  // LLM
  chatHistory: (sessionId?: string) => ['chatHistory', sessionId],
  providers: () => ['providers'],
  models: (provider: string) => ['models', provider],
  usageStats: () => ['usageStats'],
  tradingContext: () => ['tradingContext'],
};

// ========== TRADING HOOKS ==========

/**
 * Get all orders
 */
export const useOrders = (query?: GetOrdersQuery, options?: UseQueryOptions<Order[], Error>) => {
  return useQuery<Order[], Error>({
    queryKey: queryKeys.orders(query),
    queryFn: () => TradingService.getOrders(query),
    ...options,
  });
};

/**
 * Get a specific order
 */
export const useOrder = (orderId: string, options?: UseQueryOptions<Order, Error>) => {
  return useQuery<Order, Error>({
    queryKey: queryKeys.order(orderId),
    queryFn: () => TradingService.getOrder(orderId),
    enabled: !!orderId,
    ...options,
  });
};

/**
 * Get all positions
 */
export const usePositions = (query?: GetPositionsQuery, options?: UseQueryOptions<Position[], Error>) => {
  return useQuery<Position[], Error>({
    queryKey: queryKeys.positions(query),
    queryFn: () => TradingService.getPositions(query),
    ...options,
  });
};

/**
 * Get account balance
 */
export const useBalance = (options?: UseQueryOptions<Balance[], Error>) => {
  return useQuery<Balance[], Error>({
    queryKey: queryKeys.balance(),
    queryFn: () => TradingService.getBalance(),
    ...options,
  });
};

/**
 * Get trading statistics
 */
export const useStats = (options?: UseQueryOptions<TradingStats, Error>) => {
  return useQuery<TradingStats, Error>({
    queryKey: queryKeys.stats(),
    queryFn: () => TradingService.getStats(),
    ...options,
  });
};

/**
 * Place an order (mutation)
 */
export const usePlaceOrder = (options?: UseMutationOptions<any, Error, PlaceOrderRequest>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, PlaceOrderRequest>({
    mutationFn: (request) => TradingService.placeOrder(request),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
    },
    ...options,
  });
};

/**
 * Cancel an order (mutation)
 */
export const useCancelOrder = (options?: UseMutationOptions<any, Error, CancelOrderRequest>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, CancelOrderRequest>({
    mutationFn: (request) => TradingService.cancelOrder(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
    },
    ...options,
  });
};

/**
 * Close a position (mutation)
 */
export const useClosePosition = (options?: UseMutationOptions<any, Error, ClosePositionRequest>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, ClosePositionRequest>({
    mutationFn: (request) => TradingService.closePosition(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
    },
    ...options,
  });
};

// ========== MARKET DATA HOOKS ==========

/**
 * Get ticker for a symbol
 */
export const useTicker = (symbol: string, options?: UseQueryOptions<Ticker, Error>) => {
  return useQuery<Ticker, Error>({
    queryKey: queryKeys.ticker(symbol),
    queryFn: () => MarketDataService.getTicker(symbol),
    enabled: !!symbol,
    staleTime: 5000, // 5 seconds
    ...options,
  });
};

/**
 * Get all tickers
 */
export const useAllTickers = (options?: UseQueryOptions<Record<string, Ticker>, Error>) => {
  return useQuery<Record<string, Ticker>, Error>({
    queryKey: queryKeys.allTickers(),
    queryFn: () => MarketDataService.getAllTickers(),
    staleTime: 5000, // 5 seconds
    ...options,
  });
};

/**
 * Get order book
 */
export const useOrderBook = (symbol: string, depth: number = 15, options?: UseQueryOptions<OrderBookData, Error>) => {
  return useQuery<OrderBookData, Error>({
    queryKey: queryKeys.orderBook(symbol, depth),
    queryFn: () => MarketDataService.getOrderBook(symbol, depth),
    enabled: !!symbol,
    staleTime: 1000, // 1 second
    ...options,
  });
};

/**
 * Get historical data
 */
export const useHistoricalData = (query: GetHistoricalDataQuery, options?: UseQueryOptions<OHLCV[], Error>) => {
  return useQuery<OHLCV[], Error>({
    queryKey: queryKeys.historicalData(query),
    queryFn: () => MarketDataService.getHistoricalData(query),
    enabled: !!query.symbol && !!query.timeframe,
    staleTime: 60000, // 1 minute
    ...options,
  });
};

/**
 * Get supported symbols
 */
export const useSymbols = (options?: UseQueryOptions<string[], Error>) => {
  return useQuery<string[], Error>({
    queryKey: queryKeys.symbols(),
    queryFn: () => MarketDataService.getSymbols(),
    staleTime: 300000, // 5 minutes
    ...options,
  });
};

/**
 * Backfill historical data (mutation)
 */
export const useBackfillData = (options?: UseMutationOptions<any, Error, BackfillDataRequest>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, BackfillDataRequest>({
    mutationFn: (request) => MarketDataService.backfillData(request),
    onSuccess: (_, variables) => {
      // Invalidate historical data for this symbol
      queryClient.invalidateQueries({
        queryKey: queryKeys.historicalData({
          symbol: variables.symbol,
          timeframe: variables.timeframe,
        }),
      });
    },
    ...options,
  });
};

// ========== LLM HOOKS ==========

/**
 * Get chat history
 */
export const useChatHistory = (sessionId?: string, options?: UseQueryOptions<ChatMessage[], Error>) => {
  return useQuery<ChatMessage[], Error>({
    queryKey: queryKeys.chatHistory(sessionId),
    queryFn: () => LLMService.getChatHistory(sessionId),
    ...options,
  });
};

/**
 * Get LLM providers
 */
export const useProviders = (options?: UseQueryOptions<any[], Error>) => {
  return useQuery<any[], Error>({
    queryKey: queryKeys.providers(),
    queryFn: () => LLMService.getProviders(),
    staleTime: 60000, // 1 minute
    ...options,
  });
};

/**
 * Get models for a provider
 */
export const useModels = (provider: string, options?: UseQueryOptions<string[], Error>) => {
  return useQuery<string[], Error>({
    queryKey: queryKeys.models(provider),
    queryFn: () => LLMService.getModels(provider),
    enabled: !!provider,
    staleTime: 60000, // 1 minute
    ...options,
  });
};

/**
 * Get trading context
 */
export const useTradingContext = (options?: UseQueryOptions<any, Error>) => {
  return useQuery<any, Error>({
    queryKey: queryKeys.tradingContext(),
    queryFn: () => LLMService.getTradingContext(),
    ...options,
  });
};

/**
 * Send message to LLM (mutation)
 */
export const useSendMessage = (options?: UseMutationOptions<any, Error, SendMessageRequest>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, SendMessageRequest>({
    mutationFn: (request) => LLMService.sendMessage(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory() });
    },
    ...options,
  });
};

/**
 * Compare providers (mutation)
 */
export const useCompareProviders = (options?: UseMutationOptions<any, Error, CompareProvidersRequest>) => {
  return useMutation<any, Error, CompareProvidersRequest>({
    mutationFn: (request) => LLMService.compareProviders(request),
    ...options,
  });
};

/**
 * Clear chat history (mutation)
 */
export const useClearHistory = (options?: UseMutationOptions<any, Error, string | undefined>) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string | undefined>({
    mutationFn: (sessionId) => LLMService.clearHistory(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory() });
    },
    ...options,
  });
};
