export function TradingDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trading Dashboard</h1>
      
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-lg border border-slate-800">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Market Overview</h3>
            <div className="h-64 bg-slate-800 rounded flex items-center justify-center">
              <p className="text-slate-400">Chart Component Placeholder</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">LLM Chat</h3>
            <div className="h-64 bg-slate-800 rounded flex items-center justify-center">
              <p className="text-slate-400">Chat Component Placeholder</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}