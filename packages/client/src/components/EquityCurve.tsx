import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { usePortfolioStore } from '../stores/usePortfolioStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const date = new Date(label || '').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-slate-300 text-sm mb-2">{date}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.dataKey === 'value' ? 'Portfolio Value' : 'Total P&L'}: $
            {entry.value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export function EquityCurve() {
  const { equityCurve, isLoadingEquity } = usePortfolioStore();

  // Transform data for recharts
  const chartData = useMemo(() => {
    return equityCurve.map((point) => ({
      date: new Date(point.timestamp).getTime(),
      value: point.value,
      totalPnl: point.totalPnl,
    }));
  }, [equityCurve]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        startValue: 0,
        endValue: 0,
        change: 0,
        changePercent: 0,
      };
    }

    const startValue = chartData[0].value;
    const endValue = chartData[chartData.length - 1].value;
    const change = endValue - startValue;
    const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;

    return {
      startValue,
      endValue,
      change,
      changePercent,
    };
  }, [chartData]);

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (isLoadingEquity) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>Portfolio value over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-slate-400">Loading equity curve...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>Portfolio value over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-slate-400">No trading history available</div>
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
            <CardTitle>Equity Curve</CardTitle>
            <CardDescription>Portfolio value over time</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              ${stats.endValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div
              className={`text-sm font-medium ${
                stats.change >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {stats.change >= 0 ? '+' : ''}
              ${stats.change.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ({stats.changePercent >= 0 ? '+' : ''}
              {stats.changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Portfolio Value"
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="totalPnl"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Total P&L"
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
