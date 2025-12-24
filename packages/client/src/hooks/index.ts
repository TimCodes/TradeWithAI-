/**
 * WebSocket Hooks Export
 * 
 * All custom hooks for WebSocket connectivity and real-time data streaming.
 */

export { useWebSocket } from './useWebSocket';
export type { ConnectionStatus } from './useWebSocket';

export { useMarketData } from './useMarketData';
export { useTradingEvents } from './useTradingEvents';
export { useLLMStream } from './useLLMStream';

/**
 * Chart Data Hook Export
 * 
 * Hook for managing chart data, OHLCV candles, and trade markers.
 */
export { useChartData } from './useChartData';
export type { Timeframe, TradeMarker } from './useChartData';

/**
 * Order Book Hook Export
 * 
 * Hook for managing real-time order book data.
 */
export { useOrderBook } from './useOrderBook';
export type { UseOrderBookOptions, UseOrderBookReturn } from './useOrderBook';
