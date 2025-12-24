// API Client
export { apiClient, handleAPIError, isAPIError, buildQueryString } from './api';
export type { APIError } from './api';

// Trading Service
export { TradingService } from './trading.service';
export type {
  PlaceOrderRequest,
  CancelOrderRequest,
  ClosePositionRequest,
  GetOrdersQuery,
  GetPositionsQuery,
  PlaceOrderResponse,
  CancelOrderResponse,
  ClosePositionResponse,
} from './trading.service';

// Market Data Service
export { MarketDataService } from './market-data.service';
export type {
  Ticker,
  OrderBookEntry,
  OrderBookData,
  OHLCV,
  GetHistoricalDataQuery,
  BackfillDataRequest,
} from './market-data.service';

// LLM Service
export { LLMService } from './llm.service';
export type {
  SendMessageRequest,
  CompareProvidersRequest,
  SendMessageResponse,
  CompareProvidersResponse,
  ParsedTradeSignal,
  LLMProvider,
} from './llm.service';
