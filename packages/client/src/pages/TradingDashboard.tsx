import { useState, useMemo } from 'react';
import { TradingChart } from '../components/TradingChart';
import { OrderBook } from '../components/OrderBook';
import { PositionsList } from '../components/PositionsList';
import { OrderForm } from '../components/OrderForm';
import { useTradingStore, useMarketDataStore } from '../stores';
import { useWebSocket } from '../hooks';

export function TradingDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USD');
  
  // Get state from stores
  const { balances, positions, stats } = useTradingStore();
  const { tickers } = useMarketDataStore();
  
  // WebSocket connection
  const { status } = useWebSocket();
  const connected = status === 'connected';
  
  // Calculate total balance in USD
  const totalBalance = useMemo(() => {
    const usdtBalance = balances.find((b) => b.currency === 'USDT');
    if (!usdtBalance) return 0;
    
    let total = usdtBalance.total;
    
    // Add value of other currencies at current market price
    balances.forEach((balance) => {
      if (balance.currency === 'USDT') return;
      
      const symbol = `${balance.currency}/USD`;
      const ticker = tickers[symbol];
      if (ticker && ticker.price) {
        total += balance.total * ticker.price;
      }
    });
    
    return total;
  }, [balances, tickers]);
  
  // Calculate total unrealized P&L
  const totalUnrealizedPnL = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
  }, [positions]);
  
  // Calculate daily P&L (using stats if available, otherwise unrealized)
  const dailyPnL = stats?.totalPnl || totalUnrealizedPnL;
  
  // Calculate win rate from stats
  const winRate = useMemo(() => {
    if (!stats) return 0;
    return stats.winRate;
  }, [stats]);

  return (
    <div className="trading-dashboard space-y-4 p-4">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        
        {/* WebSocket connection indicator */}
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-slate-400">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Total Balance</h3>
          <p className="text-2xl font-bold text-green-400">
            ${totalBalance.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Daily P&L</h3>
          <p className={`text-2xl font-bold ${dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {dailyPnL >= 0 ? '+' : ''}${dailyPnL.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Open Positions</h3>
          <p className="text-2xl font-bold text-blue-400">{positions.length}</p>
        </div>
        
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Win Rate</h3>
          <p className="text-2xl font-bold text-purple-400">{winRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Main Trading Grid - 12 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Chart and Positions (8 columns on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Trading Chart */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Price Chart</h3>
              
              {/* Symbol Selector */}
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-slate-800 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="BTC/USD">BTC/USD</option>
                <option value="ETH/USD">ETH/USD</option>
                <option value="BNB/USD">BNB/USD</option>
                <option value="SOL/USD">SOL/USD</option>
                <option value="ADA/USD">ADA/USD</option>
              </select>
            </div>
            
            <TradingChart symbol={selectedSymbol} />
          </div>
          
          {/* Positions List */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-lg font-semibold mb-4">Open Positions</h3>
            <PositionsList />
          </div>
        </div>
        
        {/* Right Sidebar: Order Book and Order Form (4 columns on desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Order Book */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-lg font-semibold mb-4">Order Book</h3>
            <OrderBook symbol={selectedSymbol} />
          </div>
          
          {/* Order Form */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-lg font-semibold mb-4">Place Order</h3>
            <OrderForm 
              initialSymbol={selectedSymbol}
              onOrderPlaced={(order) => {
                console.log('Order placed:', order);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}