import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type Timeframe = '24h' | '7d' | '30d' | 'all';

export interface EquityPoint {
  timestamp: string;
  value: number;
  totalPnl: number;
}

export interface AssetAllocation {
  symbol: string;
  value: number;
  percentage: number;
  unrealizedPnl: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  roi: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  timeframe: Timeframe;
}

interface PortfolioState {
  // State
  equityCurve: EquityPoint[];
  allocations: AssetAllocation[];
  metrics: PortfolioMetrics | null;
  selectedTimeframe: Timeframe;
  isLoadingEquity: boolean;
  isLoadingAllocation: boolean;
  isLoadingMetrics: boolean;
  error: string | null;

  // Actions
  setTimeframe: (timeframe: Timeframe) => void;
  fetchEquityCurve: (timeframe?: Timeframe) => Promise<void>;
  fetchAssetAllocation: () => Promise<void>;
  fetchPortfolioMetrics: (timeframe?: Timeframe) => Promise<void>;
  fetchAll: (timeframe?: Timeframe) => Promise<void>;
  clearError: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    (set, get) => ({
      // Initial State
      equityCurve: [],
      allocations: [],
      metrics: null,
      selectedTimeframe: 'all',
      isLoadingEquity: false,
      isLoadingAllocation: false,
      isLoadingMetrics: false,
      error: null,

      // Actions
      setTimeframe: (timeframe: Timeframe) => {
        set({ selectedTimeframe: timeframe });
        // Automatically fetch data for new timeframe
        get().fetchEquityCurve(timeframe);
        get().fetchPortfolioMetrics(timeframe);
      },

      fetchEquityCurve: async (timeframe?: Timeframe) => {
        const tf = timeframe || get().selectedTimeframe;
        set({ isLoadingEquity: true, error: null });

        try {
          const response = await fetch(
            `${API_BASE_URL}/trading/portfolio/equity-curve?timeframe=${tf}`,
            {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch equity curve: ${response.statusText}`);
          }

          const data = await response.json();
          set({
            equityCurve: data.data || [],
            isLoadingEquity: false,
          });
        } catch (error) {
          console.error('Error fetching equity curve:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch equity curve',
            isLoadingEquity: false,
            equityCurve: [],
          });
        }
      },

      fetchAssetAllocation: async () => {
        set({ isLoadingAllocation: true, error: null });

        try {
          const response = await fetch(
            `${API_BASE_URL}/trading/portfolio/allocation`,
            {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch asset allocation: ${response.statusText}`);
          }

          const data = await response.json();
          set({
            allocations: data.allocations || [],
            isLoadingAllocation: false,
          });
        } catch (error) {
          console.error('Error fetching asset allocation:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch asset allocation',
            isLoadingAllocation: false,
            allocations: [],
          });
        }
      },

      fetchPortfolioMetrics: async (timeframe?: Timeframe) => {
        const tf = timeframe || get().selectedTimeframe;
        set({ isLoadingMetrics: true, error: null });

        try {
          const response = await fetch(
            `${API_BASE_URL}/trading/portfolio/metrics?timeframe=${tf}`,
            {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch portfolio metrics: ${response.statusText}`);
          }

          const data = await response.json();
          set({
            metrics: data,
            isLoadingMetrics: false,
          });
        } catch (error) {
          console.error('Error fetching portfolio metrics:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch portfolio metrics',
            isLoadingMetrics: false,
            metrics: null,
          });
        }
      },

      fetchAll: async (timeframe?: Timeframe) => {
        const tf = timeframe || get().selectedTimeframe;
        await Promise.all([
          get().fetchEquityCurve(tf),
          get().fetchAssetAllocation(),
          get().fetchPortfolioMetrics(tf),
        ]);
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'PortfolioStore' }
  )
);
