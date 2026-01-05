import { useEffect } from 'react';
import { usePortfolioStore, Timeframe } from '../stores/usePortfolioStore';
import { EquityCurve } from '../components/EquityCurve';
import { AssetAllocation } from '../components/AssetAllocation';
import { PortfolioMetrics } from '../components/PortfolioMetrics';
import { Button } from '../components/ui/button';
import { RefreshCw } from 'lucide-react';

export function Portfolio() {
  const { selectedTimeframe, setTimeframe, fetchAll, error, clearError } = usePortfolioStore();

  useEffect(() => {
    // Fetch all portfolio data on mount
    fetchAll();
  }, [fetchAll]);

  const handleTimeframeChange = (timeframe: Timeframe) => {
    setTimeframe(timeframe);
  };

  const handleRefresh = () => {
    fetchAll(selectedTimeframe);
  };

  const timeframes: { value: Timeframe; label: string }[] = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-slate-400">Track your trading performance over time</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Timeframe Selector */}
          <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => handleTimeframeChange(tf.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTimeframe === tf.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Portfolio Metrics Summary */}
      <PortfolioMetrics />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve */}
        <div className="lg:col-span-2">
          <EquityCurve />
        </div>

        {/* Asset Allocation */}
        <div className="lg:col-span-2">
          <AssetAllocation />
        </div>
      </div>
    </div>
  );
}
