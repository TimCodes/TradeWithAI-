import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Calendar } from 'lucide-react';

interface ModelPerformanceStats {
  provider: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  averagePnl: number;
  averageConfidence: number;
  confidenceCorrelation: number;
  bestTrade: number;
  worstTrade: number;
  lastTradeDate: string | null;
}

interface DateRange {
  startDate?: string;
  endDate?: string;
}

interface ModelPerformanceStatsProps {
  className?: string;
}

const DATE_PRESETS = [
  { label: '24H', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
];

export const ModelPerformanceStats: React.FC<ModelPerformanceStatsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<ModelPerformanceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('All');

  const fetchStats = async (range: DateRange = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (range.startDate) params.append('startDate', range.startDate);
      if (range.endDate) params.append('endDate', range.endDate);

      const response = await fetch(`http://localhost:3001/llm/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setStats(data.stats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(dateRange);
  }, []);

  const handlePresetClick = (preset: { label: string; days: number | null }) => {
    setSelectedPreset(preset.label);
    
    if (preset.days === null) {
      // All time
      setDateRange({});
      fetchStats({});
    } else {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - preset.days);
      
      const range = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      setDateRange(range);
      fetchStats(range);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCorrelationLabel = (correlation: number): string => {
    if (correlation > 0.7) return 'Strong Positive';
    if (correlation > 0.3) return 'Moderate Positive';
    if (correlation > -0.3) return 'Weak/None';
    if (correlation > -0.7) return 'Moderate Negative';
    return 'Strong Negative';
  };

  const getCorrelationColor = (correlation: number): string => {
    if (correlation > 0.5) return 'text-green-600';
    if (correlation > 0) return 'text-green-400';
    if (correlation > -0.5) return 'text-gray-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Model Performance Leaderboard</CardTitle>
          <CardDescription>Loading analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Model Performance Leaderboard</CardTitle>
          <CardDescription>Error loading analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 p-4 bg-red-50 rounded-md">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Model Performance Leaderboard</CardTitle>
          <CardDescription>Track which AI models give the best trading advice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-400" />
            <p>No LLM-attributed trades found.</p>
            <p className="text-sm mt-2">Execute trades with LLM recommendations to see performance stats.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Model Performance Leaderboard</CardTitle>
            <CardDescription>Track which AI models give the best trading advice</CardDescription>
          </div>
          <div className="flex gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant={selectedPreset === preset.label ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((model, index) => (
            <div
              key={model.provider}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{model.provider}</h3>
                    <p className="text-xs text-gray-500">
                      Last trade: {formatDate(model.lastTradeDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${model.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(model.totalPnl)}
                  </div>
                  <div className="text-xs text-gray-500">Total P&L</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Win Rate</div>
                  <div className={`text-lg font-semibold ${model.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(model.winRate)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {model.winningTrades}W / {model.losingTrades}L
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Avg P&L</div>
                  <div className={`text-lg font-semibold ${model.averagePnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(model.averagePnl)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {model.totalTrades} trades
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Confidence</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatPercent(model.averageConfidence)}
                  </div>
                  <div className={`text-xs ${getCorrelationColor(model.confidenceCorrelation)}`}>
                    {getCorrelationLabel(model.confidenceCorrelation)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Best / Worst</div>
                  <div className="text-sm">
                    <span className="text-green-600 font-semibold">
                      {formatCurrency(model.bestTrade)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-red-600 font-semibold">
                      {formatCurrency(model.worstTrade)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confidence Correlation Info */}
              {model.confidenceCorrelation !== 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>💡</span>
                    <span>
                      Confidence correlation: {model.confidenceCorrelation.toFixed(2)} 
                      {model.confidenceCorrelation > 0.3 
                        ? ' (Higher confidence → Better results)' 
                        : model.confidenceCorrelation < -0.3 
                        ? ' (Higher confidence → Worse results)' 
                        : ' (Confidence not predictive)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        {stats.length > 1 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3">Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Total Models</div>
                <div className="text-2xl font-bold text-gray-900">{stats.length}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Total Trades</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.reduce((sum, m) => sum + m.totalTrades, 0)}
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Total P&L</div>
                <div className={`text-2xl font-bold ${stats.reduce((sum, m) => sum + m.totalPnl, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.reduce((sum, m) => sum + m.totalPnl, 0))}
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Avg Win Rate</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercent(stats.reduce((sum, m) => sum + m.winRate, 0) / stats.length)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelPerformanceStats;
