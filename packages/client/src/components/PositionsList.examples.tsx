/**
 * PositionsList Component - Usage Examples
 * 
 * This file demonstrates various ways to use the PositionsList component
 * in your trading dashboard.
 */

import React from 'react';
import { PositionsList } from './PositionsList';
import { useTradingEvents } from '../hooks/useTradingEvents';
import { useTradingStore } from '../stores/useTradingStore';
import { useMarketDataStore } from '../stores/useMarketDataStore';

/* =============================================================================
   EXAMPLE 1: Basic Usage
   ============================================================================= */

export function Example1_BasicUsage() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Positions</h2>
      <PositionsList />
    </div>
  );
}

/* =============================================================================
   EXAMPLE 2: With Custom Height
   ============================================================================= */

export function Example2_CustomHeight() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Positions (Tall View)</h2>
      <PositionsList maxHeight={800} />
    </div>
  );
}

/* =============================================================================
   EXAMPLE 3: Full Height Dashboard Panel
   ============================================================================= */

export function Example3_FullHeightPanel() {
  // Calculate available height
  const availableHeight = window.innerHeight - 200; // Subtract header/padding

  return (
    <div className="h-screen flex flex-col p-4">
      <h2 className="text-2xl font-bold mb-4">Trading Dashboard</h2>
      <div className="flex-1">
        <PositionsList maxHeight={availableHeight} />
      </div>
    </div>
  );
}

/* =============================================================================
   EXAMPLE 4: With WebSocket Real-time Updates
   ============================================================================= */

export function Example4_WithWebSocket() {
  // Hook handles real-time position updates automatically
  useTradingEvents({
    onPositionOpened: (position) => {
      console.log('[Dashboard] Position opened:', position);
      // Optional: Show toast notification
    },
    onPositionClosed: (position) => {
      console.log('[Dashboard] Position closed:', position);
      // Optional: Show toast notification
    }
  });

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Live Positions</h2>
      <PositionsList />
    </div>
  );
}

/* =============================================================================
   EXAMPLE 5: With Summary Statistics
   ============================================================================= */

export function Example5_WithSummary() {
  const { positions } = useTradingStore();

  // Calculate summary stats
  const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
  const totalRealizedPnl = positions.reduce((sum, pos) => sum + pos.realizedPnl, 0);
  const longPositions = positions.filter((pos) => pos.side === 'long').length;
  const shortPositions = positions.filter((pos) => pos.side === 'short').length;

  return (
    <div className="p-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Positions</div>
          <div className="text-2xl font-bold">{positions.length}</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">Long / Short</div>
          <div className="text-2xl font-bold">
            <span className="text-green-600">{longPositions}</span>
            {' / '}
            <span className="text-red-600">{shortPositions}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">Unrealized P&L</div>
          <div className={`text-2xl font-bold ${totalUnrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">Realized P&L</div>
          <div className={`text-2xl font-bold ${totalRealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Positions List */}
      <PositionsList />
    </div>
  );
}

/* =============================================================================
   EXAMPLE 6: Grid Layout with Chart and OrderBook
   ============================================================================= */

export function Example6_FullTradingDashboard() {
  const [selectedSymbol, setSelectedSymbol] = React.useState('BTCUSDT');

  useTradingEvents(); // Enable real-time updates

  return (
    <div className="h-screen p-4">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Left Column: Chart */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Symbol Selector */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded"
            >
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
            </select>
          </div>

          {/* Chart Placeholder */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-96">
            <div className="text-center py-20 text-gray-500">
              TradingChart Component ({selectedSymbol})
            </div>
          </div>

          {/* Positions List */}
          <PositionsList maxHeight={300} />
        </div>

        {/* Right Column: OrderBook and OrderForm */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* OrderBook Placeholder */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-96">
            <div className="text-center py-20 text-gray-500">
              OrderBook Component
            </div>
          </div>

          {/* OrderForm Placeholder */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-center py-10 text-gray-500">
              OrderForm Component
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   EXAMPLE 7: Mobile-Optimized Layout
   ============================================================================= */

export function Example7_MobileOptimized() {
  useTradingEvents();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile Header */}
      <header className="bg-white dark:bg-gray-800 p-4 shadow sticky top-0 z-20">
        <h1 className="text-xl font-bold">My Positions</h1>
      </header>

      {/* Positions List - Full Width Mobile */}
      <div className="p-2 sm:p-4">
        <PositionsList maxHeight={window.innerHeight - 120} />
      </div>
    </div>
  );
}

/* =============================================================================
   EXAMPLE 8: With Mock Data for Development
   ============================================================================= */

export function Example8_WithMockData() {
  const { setPositions } = useTradingStore();
  const { setTicker } = useMarketDataStore();

  // Load mock data on mount
  React.useEffect(() => {
    const mockPositions = [
      {
        id: '1',
        symbol: 'BTCUSDT',
        side: 'long' as const,
        size: 0.5,
        entryPrice: 42000,
        currentPrice: 43500,
        unrealizedPnl: 750,
        unrealizedPnlPercent: 3.57,
        realizedPnl: 0,
        stopLoss: 41000,
        takeProfit: 45000,
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(),
      },
      {
        id: '2',
        symbol: 'ETHUSDT',
        side: 'short' as const,
        size: 2,
        entryPrice: 2300,
        currentPrice: 2250,
        unrealizedPnl: 100,
        unrealizedPnlPercent: 2.17,
        realizedPnl: 50,
        stopLoss: 2350,
        takeProfit: 2200,
        createdAt: new Date(Date.now() - 7200000),
        updatedAt: new Date(),
      },
      {
        id: '3',
        symbol: 'BNBUSDT',
        side: 'long' as const,
        size: 5,
        entryPrice: 310,
        currentPrice: 305,
        unrealizedPnl: -25,
        unrealizedPnlPercent: -1.61,
        realizedPnl: 0,
        createdAt: new Date(Date.now() - 1800000),
        updatedAt: new Date(),
      },
    ];

    setPositions(mockPositions);

    // Mock ticker updates
    setTicker('BTCUSDT', {
      symbol: 'BTCUSDT',
      price: 43500,
      bid: 43495,
      ask: 43505,
      change24h: 1500,
      change24hPercent: 3.5,
      volume24h: 1500000000,
      high24h: 44000,
      low24h: 41500,
      timestamp: new Date(),
    });

    setTicker('ETHUSDT', {
      symbol: 'ETHUSDT',
      price: 2250,
      bid: 2249,
      ask: 2251,
      change24h: -50,
      change24hPercent: -2.2,
      volume24h: 800000000,
      high24h: 2350,
      low24h: 2200,
      timestamp: new Date(),
    });

    setTicker('BNBUSDT', {
      symbol: 'BNBUSDT',
      price: 305,
      bid: 304.8,
      ask: 305.2,
      change24h: -5,
      change24hPercent: -1.6,
      volume24h: 200000000,
      high24h: 315,
      low24h: 300,
      timestamp: new Date(),
    });

    // Simulate price updates
    const interval = setInterval(() => {
      const btcPrice = 43500 + Math.random() * 200 - 100;
      setTicker('BTCUSDT', {
        symbol: 'BTCUSDT',
        price: btcPrice,
        bid: btcPrice - 5,
        ask: btcPrice + 5,
        change24h: btcPrice - 42000,
        change24hPercent: ((btcPrice - 42000) / 42000) * 100,
        volume24h: 1500000000,
        high24h: 44000,
        low24h: 41500,
        timestamp: new Date(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [setPositions, setTicker]);

  return (
    <div className="p-4">
      <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          📊 Development Mode: Using mock data with simulated price updates
        </p>
      </div>
      <PositionsList />
    </div>
  );
}

/* =============================================================================
   EXAMPLE 9: With Error Handling
   ============================================================================= */

export function Example9_WithErrorHandling() {
  const { error } = useTradingEvents({
    autoSubscribe: true,
  });

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}
      <PositionsList />
    </div>
  );
}

/* =============================================================================
   EXAMPLE 10: Compact View for Sidebars
   ============================================================================= */

export function Example10_CompactSidebar() {
  return (
    <div className="w-80 bg-white dark:bg-gray-800 shadow-lg h-screen overflow-y-auto">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Positions</h3>
      </div>
      <PositionsList maxHeight={window.innerHeight - 100} />
    </div>
  );
}
