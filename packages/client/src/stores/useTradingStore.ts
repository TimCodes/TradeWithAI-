import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TradingState, Position, Order, Balance, TradingStats } from '../types/store.types';

const initialState = {
  positions: [],
  orders: [],
  balances: [],
  stats: null,
  isLoading: false,
  error: null,
};

export const useTradingStore = create<TradingState>()(
  devtools(
    (set) => ({
      ...initialState,

      // Position actions
      setPositions: (positions: Position[]) =>
        set({ positions }, false, 'setPositions'),

      updatePosition: (id: string, updates: Partial<Position>) =>
        set(
          (state) => ({
            positions: state.positions.map((pos) =>
              pos.id === id ? { ...pos, ...updates, updatedAt: new Date() } : pos
            ),
          }),
          false,
          'updatePosition'
        ),

      removePosition: (id: string) =>
        set(
          (state) => ({
            positions: state.positions.filter((pos) => pos.id !== id),
          }),
          false,
          'removePosition'
        ),

      // Order actions
      setOrders: (orders: Order[]) =>
        set({ orders }, false, 'setOrders'),

      addOrder: (order: Order) =>
        set(
          (state) => ({
            orders: [order, ...state.orders],
          }),
          false,
          'addOrder'
        ),

      updateOrder: (id: string, updates: Partial<Order>) =>
        set(
          (state) => ({
            orders: state.orders.map((order) =>
              order.id === id ? { ...order, ...updates, updatedAt: new Date() } : order
            ),
          }),
          false,
          'updateOrder'
        ),

      removeOrder: (id: string) =>
        set(
          (state) => ({
            orders: state.orders.filter((order) => order.id !== id),
          }),
          false,
          'removeOrder'
        ),

      // Balance actions
      setBalances: (balances: Balance[]) =>
        set({ balances }, false, 'setBalances'),

      // Stats actions
      setStats: (stats: TradingStats) =>
        set({ stats }, false, 'setStats'),

      // UI state actions
      setLoading: (isLoading: boolean) =>
        set({ isLoading }, false, 'setLoading'),

      setError: (error: string | null) =>
        set({ error }, false, 'setError'),

      // Reset
      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'trading-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for common queries
export const selectPositionBySymbol = (state: TradingState, symbol: string) =>
  state.positions.find((pos) => pos.symbol === symbol);

export const selectOrdersByStatus = (state: TradingState, status: Order['status']) =>
  state.orders.filter((order) => order.status === status);

export const selectBalanceByCurrency = (state: TradingState, currency: string) =>
  state.balances.find((bal) => bal.currency === currency);

export const selectTotalPnl = (state: TradingState) =>
  state.positions.reduce((total, pos) => total + pos.unrealizedPnl, 0);

export const selectOpenOrdersCount = (state: TradingState) =>
  state.orders.filter((order) => order.status === 'pending').length;
