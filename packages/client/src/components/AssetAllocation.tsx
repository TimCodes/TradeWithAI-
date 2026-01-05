import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePortfolioStore } from '../stores/usePortfolioStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

// Color palette for pie chart
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      symbol: string;
      value: number;
      percentage: number;
      unrealizedPnl: number;
    };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-slate-100 font-medium mb-1">{data.symbol}</p>
        <p className="text-slate-300 text-sm">
          Value: ${data.value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="text-slate-300 text-sm">
          Allocation: {data.percentage.toFixed(2)}%
        </p>
        <p
          className={`text-sm font-medium ${
            data.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'
          }`}
        >
          P&L: {data.unrealizedPnl >= 0 ? '+' : ''}$
          {data.unrealizedPnl.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
    );
  }

  return null;
};

export function AssetAllocation() {
  const { allocations, isLoadingAllocation } = usePortfolioStore();

  // Transform data for recharts
  const chartData = useMemo(() => {
    return allocations.map((allocation) => ({
      symbol: allocation.symbol.replace('XXBTZUSD', 'BTC').replace('XETHZUSD', 'ETH'),
      value: allocation.value,
      percentage: allocation.percentage,
      unrealizedPnl: allocation.unrealizedPnl,
    }));
  }, [allocations]);

  const totalValue = useMemo(() => {
    return allocations.reduce((sum, a) => sum + a.value, 0);
  }, [allocations]);

  const renderLabel = (entry: any) => {
    return `${entry.symbol} (${entry.percentage.toFixed(1)}%)`;
  };

  if (isLoadingAllocation) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
          <CardDescription>Portfolio distribution by asset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-slate-400">Loading allocation data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allocations.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
          <CardDescription>Portfolio distribution by asset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-slate-400">No open positions</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Portfolio distribution by asset</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-slate-300">Total Value</div>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Pie Chart */}
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with details */}
          <div className="flex-1 w-full space-y-3">
            {chartData.map((item, index) => (
              <div
                key={item.symbol}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <div className="font-medium text-slate-100">{item.symbol}</div>
                    <div className="text-sm text-slate-400">
                      {item.percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-slate-100">
                    ${item.value.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      item.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {item.unrealizedPnl >= 0 ? '+' : ''}$
                    {item.unrealizedPnl.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
