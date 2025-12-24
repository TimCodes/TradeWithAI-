import { TradingChart } from '../components/TradingChart';
import { OrderBook } from '../components/OrderBook';

/**
 * Updated TradingDashboard Example
 * 
 * Now includes both TradingChart and OrderBook components
 */
export function TradingDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trading Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Total Balance</h3>
          <p className="text-2xl font-bold text-green-400">$10,000.00</p>
        </div>
        
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Daily P&L</h3>
          <p className="text-2xl font-bold text-red-400">-$150.00</p>
        </div>
        
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Open Positions</h3>
          <p className="text-2xl font-bold text-blue-400">3</p>
        </div>
        
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400">Win Rate</h3>
          <p className="text-2xl font-bold text-purple-400">68%</p>
        </div>
      </div>

      {/* Main Trading Area: Chart + OrderBook */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart takes 2 columns */}
        <div className="lg:col-span-2">
          <TradingChart 
            symbol="BTC/USD" 
            initialTimeframe="15m"
            height={600}
            showVolume={true}
            showTradeMarkers={true}
          />
        </div>

        {/* OrderBook takes 1 column */}
        <div className="lg:col-span-1">
          <OrderBook 
            symbol="BTC/USD"
            depth={15}
            height={600}
            showSpread={true}
          />
        </div>
      </div>

      {/* Additional Content Below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Positions List - Coming in Story 5.3 */}
        <div className="bg-slate-900 rounded-lg border border-slate-800">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Open Positions</h3>
            <div className="h-64 bg-slate-800 rounded flex items-center justify-center">
              <p className="text-slate-400">PositionsList Component (Story 5.3)</p>
            </div>
          </div>
        </div>

        {/* Order Form - Coming in Story 5.4 */}
        <div className="bg-slate-900 rounded-lg border border-slate-800">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Place Order</h3>
            <div className="h-64 bg-slate-800 rounded flex items-center justify-center">
              <p className="text-slate-400">OrderForm Component (Story 5.4)</p>
            </div>
          </div>
        </div>
      </div>

      {/* LLM Chat - Coming in Epic 6 */}
      <div className="bg-slate-900 rounded-lg border border-slate-800">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">AI Trading Assistant</h3>
          <div className="h-96 bg-slate-800 rounded flex items-center justify-center">
            <p className="text-slate-400">LLM Chat Component (Epic 6)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Alternative Layout: Side-by-Side Equal Width
 */
export function TradingDashboardAlternative() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trading Dashboard</h1>
      
      {/* Chart and OrderBook side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TradingChart 
          symbol="BTC/USD" 
          initialTimeframe="15m"
          height={700}
        />
        <OrderBook 
          symbol="BTC/USD"
          depth={20}
          height={700}
        />
      </div>
    </div>
  );
}

/**
 * Mobile-Friendly Layout: Stacked
 */
export function TradingDashboardMobile() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Trading Dashboard</h1>
      
      {/* Chart */}
      <TradingChart 
        symbol="BTC/USD" 
        initialTimeframe="15m"
        height={400}
      />
      
      {/* OrderBook */}
      <OrderBook 
        symbol="BTC/USD"
        depth={10}
        height={400}
      />
    </div>
  );
}
