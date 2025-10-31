import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { MarketDataState, TickerData, OrderBook, OHLCVData } from '../types/store.types';

const initialState = {
  tickers: {},
  orderBooks: {},
  ohlcvData: {},
  subscribedSymbols: [],
  isConnected: false,
  isLoading: false,
  error: null,
};

export const useMarketDataStore = create<MarketDataState>()(
  devtools(
    (set) => ({
      ...initialState,

      // Ticker actions
      setTicker: (symbol: string, ticker: TickerData) =>
        set(
          (state) => ({
            tickers: {
              ...state.tickers,
              [symbol]: ticker,
            },
          }),
          false,
          'setTicker'
        ),

      // Order book actions
      setOrderBook: (symbol: string, orderBook: OrderBook) =>
        set(
          (state) => ({
            orderBooks: {
              ...state.orderBooks,
              [symbol]: orderBook,
            },
          }),
          false,
          'setOrderBook'
        ),

      // OHLCV actions
      setOHLCVData: (symbol: string, data: OHLCVData[]) =>
        set(
          (state) => ({
            ohlcvData: {
              ...state.ohlcvData,
              [symbol]: data,
            },
          }),
          false,
          'setOHLCVData'
        ),

      appendOHLCV: (symbol: string, candle: OHLCVData) =>
        set(
          (state) => {
            const existing = state.ohlcvData[symbol] || [];
            const lastCandle = existing[existing.length - 1];
            
            // Replace the last candle if it's the same timestamp, otherwise append
            if (lastCandle && lastCandle.timestamp.getTime() === candle.timestamp.getTime()) {
              return {
                ohlcvData: {
                  ...state.ohlcvData,
                  [symbol]: [...existing.slice(0, -1), candle],
                },
              };
            }
            
            return {
              ohlcvData: {
                ...state.ohlcvData,
                [symbol]: [...existing, candle],
              },
            };
          },
          false,
          'appendOHLCV'
        ),

      // Subscription actions
      subscribe: (symbol: string) =>
        set(
          (state) => ({
            subscribedSymbols: state.subscribedSymbols.includes(symbol)
              ? state.subscribedSymbols
              : [...state.subscribedSymbols, symbol],
          }),
          false,
          'subscribe'
        ),

      unsubscribe: (symbol: string) =>
        set(
          (state) => ({
            subscribedSymbols: state.subscribedSymbols.filter((s) => s !== symbol),
          }),
          false,
          'unsubscribe'
        ),

      // Connection state actions
      setConnected: (isConnected: boolean) =>
        set({ isConnected }, false, 'setConnected'),

      setLoading: (isLoading: boolean) =>
        set({ isLoading }, false, 'setLoading'),

      setError: (error: string | null) =>
        set({ error }, false, 'setError'),

      // Reset
      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'market-data-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for common queries
export const selectTickerBySymbol = (state: MarketDataState, symbol: string) =>
  state.tickers[symbol];

export const selectOrderBookBySymbol = (state: MarketDataState, symbol: string) =>
  state.orderBooks[symbol];

export const selectOHLCVBySymbol = (state: MarketDataState, symbol: string) =>
  state.ohlcvData[symbol] || [];

export const selectLatestPrice = (state: MarketDataState, symbol: string) =>
  state.tickers[symbol]?.price;

export const selectSpread = (state: MarketDataState, symbol: string) => {
  const ticker = state.tickers[symbol];
  return ticker ? ticker.ask - ticker.bid : 0;
};

export const selectSpreadPercent = (state: MarketDataState, symbol: string) => {
  const ticker = state.tickers[symbol];
  if (!ticker || ticker.price === 0) return 0;
  return ((ticker.ask - ticker.bid) / ticker.price) * 100;
};

export const selectIsSubscribed = (state: MarketDataState, symbol: string) =>
  state.subscribedSymbols.includes(symbol);

export const selectLatestCandle = (state: MarketDataState, symbol: string) => {
  const candles = state.ohlcvData[symbol];
  return candles && candles.length > 0 ? candles[candles.length - 1] : null;
};
