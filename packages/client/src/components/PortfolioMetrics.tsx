import { usePortfolioStore } from '../stores/usePortfolioStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, Award } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

function MetricCard({ title, value, subtitle, icon, trend, className = '' }: MetricCardProps) {
  const trendColor = trend === 'up' 
    ? 'text-green-500' 
    : trend === 'down' 
    ? 'text-red-500' 
    : 'text-slate-400';

  return (
    <div className={`bg-slate-700/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-slate-400 text-sm font-medium">{title}</div>
        <div className={`${trendColor}`}>{icon}</div>
      </div>
      <div className={`text-2xl font-bold mb-1 ${trendColor}`}>{value}</div>
      {subtitle && <div className="text-slate-400 text-xs">{subtitle}</div>}
    </div>
  );
}

export function PortfolioMetrics() {
  const { metrics, isLoadingMetrics } = usePortfolioStore();

  if (isLoadingMetrics) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Portfolio Metrics</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-slate-400">Loading metrics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Portfolio Metrics</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-slate-400">No metrics available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format values
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const totalPnlTrend = metrics.totalPnl >= 0 ? 'up' : 'down';
  const roiTrend = metrics.roi >= 0 ? 'up' : 'down';

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle>Portfolio Metrics</CardTitle>
        <CardDescription>
          Key performance indicators for {metrics.timeframe === 'all' ? 'all time' : `the last ${metrics.timeframe}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Value */}
          <MetricCard
            title="Total Portfolio Value"
            value={formatCurrency(metrics.totalValue)}
            icon={<DollarSign className="w-5 h-5" />}
            trend="neutral"
          />

          {/* Total P&L */}
          <MetricCard
            title="Total P&L"
            value={formatCurrency(metrics.totalPnl)}
            subtitle={`Realized: ${formatCurrency(metrics.realizedPnl)} | Unrealized: ${formatCurrency(metrics.unrealizedPnl)}`}
            icon={totalPnlTrend === 'up' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            trend={totalPnlTrend}
          />

          {/* ROI */}
          <MetricCard
            title="Return on Investment (ROI)"
            value={formatPercentage(metrics.roi)}
            icon={roiTrend === 'up' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            trend={roiTrend}
          />

          {/* Max Drawdown */}
          <MetricCard
            title="Maximum Drawdown"
            value={`${metrics.maxDrawdown.toFixed(2)}%`}
            subtitle="Peak to trough decline"
            icon={<Activity className="w-5 h-5" />}
            trend="down"
          />

          {/* Sharpe Ratio */}
          <MetricCard
            title="Sharpe Ratio"
            value={metrics.sharpeRatio.toFixed(2)}
            subtitle="Risk-adjusted return"
            icon={<Award className="w-5 h-5" />}
            trend={metrics.sharpeRatio > 1 ? 'up' : metrics.sharpeRatio > 0 ? 'neutral' : 'down'}
          />

          {/* Win Rate */}
          <MetricCard
            title="Win Rate"
            value={`${metrics.winRate.toFixed(1)}%`}
            subtitle={`${metrics.totalTrades} total trades`}
            icon={<Target className="w-5 h-5" />}
            trend={metrics.winRate >= 50 ? 'up' : 'down'}
          />
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-slate-400 text-sm mb-1">Realized P&L</div>
              <div className={`font-semibold ${metrics.realizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(metrics.realizedPnl)}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">Unrealized P&L</div>
              <div className={`font-semibold ${metrics.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(metrics.unrealizedPnl)}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">Total Trades</div>
              <div className="font-semibold text-slate-100">{metrics.totalTrades}</div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">Winning Trades</div>
              <div className="font-semibold text-green-500">
                {Math.round((metrics.winRate / 100) * metrics.totalTrades)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
