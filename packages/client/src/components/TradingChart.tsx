import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
  UTCTimestamp,
} from 'lightweight-charts';
import { useChartData, Timeframe } from '../hooks/useChartData';
import { Card } from './ui/card';
import { Button } from './ui/button';
import './TradingChart.css';

interface TradingChartProps {
  symbol: string;
  initialTimeframe?: Timeframe;
  height?: number;
  showVolume?: boolean;
  showTradeMarkers?: boolean;
}

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
];

/**
 * TradingChart Component
 * 
 * A professional candlestick chart with volume histogram,
 * real-time updates, and trade markers.
 * 
 * Features:
 * - Lightweight Charts integration
 * - Multiple timeframe support
 * - Volume histogram
 * - Trade markers
 * - Real-time price updates
 * - Responsive design
 * - Tooltips with OHLC values
 * 
 * @example
 * ```tsx
 * <TradingChart 
 *   symbol="BTC/USD" 
 *   initialTimeframe="15m"
 *   height={600}
 *   showVolume={true}
 *   showTradeMarkers={true}
 * />
 * ```
 */
export function TradingChart({
  symbol,
  initialTimeframe = '15m',
  height = 600,
  showVolume = true,
  showTradeMarkers = true,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>(initialTimeframe);
  const [tooltipData, setTooltipData] = useState<{
    time: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  } | null>(null);

  const {
    data,
    isLoading,
    error,
    trades,
    currentPrice,
    changeTimeframe,
    refresh,
  } = useChartData({
    symbol,
    timeframe: currentTimeframe,
    autoUpdate: true,
  });

  /**
   * Initialize chart
   */
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: showVolume ? height : height - 100,
      layout: {
        background: { color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.3 : 0.1,
        },
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Create volume series if enabled
    let volumeSeries: ISeriesApi<'Histogram'> | null = null;
    if (showVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: '#4b5563',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });
      
      // Adjust volume series position
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, showVolume]);

  /**
   * Update chart data
   */
  useEffect(() => {
    if (!candlestickSeriesRef.current || !data.length) return;

    // Convert OHLCV data to candlestick format
    const candlestickData: CandlestickData[] = data.map((item) => ({
      time: Math.floor(item.timestamp.getTime() / 1000) as UTCTimestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candlestickSeriesRef.current.setData(candlestickData);

    // Update volume data
    if (volumeSeriesRef.current && showVolume) {
      const volumeData: HistogramData[] = data.map((item) => ({
        time: Math.floor(item.timestamp.getTime() / 1000) as UTCTimestamp,
        value: item.volume,
        color: item.close >= item.open ? '#22c55e80' : '#ef444480',
      }));

      volumeSeriesRef.current.setData(volumeData);
    }

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data, showVolume]);

  /**
   * Update trade markers
   */
  useEffect(() => {
    if (!candlestickSeriesRef.current || !showTradeMarkers) return;

    candlestickSeriesRef.current.setMarkers(
      trades.map((trade) => ({
        time: trade.time as Time,
        position: trade.position,
        color: trade.color,
        shape: trade.shape,
        text: trade.text,
      }))
    );
  }, [trades, showTradeMarkers]);

  /**
   * Update current price line
   */
  useEffect(() => {
    if (!candlestickSeriesRef.current || currentPrice === null) return;

    // Create price line
    const priceLine = candlestickSeriesRef.current.createPriceLine({
      price: currentPrice,
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'Current',
    });

    return () => {
      candlestickSeriesRef.current?.removePriceLine(priceLine);
    };
  }, [currentPrice]);

  /**
   * Handle timeframe change
   */
  const handleTimeframeChange = (timeframe: Timeframe) => {
    setCurrentTimeframe(timeframe);
    changeTimeframe(timeframe);
  };

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    refresh();
  };

  /**
   * Subscribe to crosshair move for tooltip
   */
  useEffect(() => {
    if (!chartRef.current) return;

    const handleCrosshairMove = (param: any) => {
      if (!param.time || !param.seriesData || !candlestickSeriesRef.current) {
        setTooltipData(null);
        return;
      }

      const data = param.seriesData.get(candlestickSeriesRef.current);
      if (!data) {
        setTooltipData(null);
        return;
      }

      const volumeData = volumeSeriesRef.current
        ? param.seriesData.get(volumeSeriesRef.current)
        : null;

      setTooltipData({
        time: new Date(param.time * 1000).toLocaleString(),
        open: data.open?.toFixed(2) || '-',
        high: data.high?.toFixed(2) || '-',
        low: data.low?.toFixed(2) || '-',
        close: data.close?.toFixed(2) || '-',
        volume: volumeData?.value?.toFixed(2) || '-',
      });
    };

    chartRef.current.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chartRef.current?.unsubscribeCrosshairMove(handleCrosshairMove);
    };
  }, []);

  return (
    <Card className="trading-chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <h3>{symbol}</h3>
          {currentPrice && (
            <span className="current-price">${currentPrice.toFixed(2)}</span>
          )}
        </div>
        
        <div className="chart-controls">
          <div className="timeframe-selector">
            {TIMEFRAME_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={currentTimeframe === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTimeframeChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="chart-error">
          <p>Error loading chart data: {error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      <div className="chart-container" ref={chartContainerRef} />

      {tooltipData && (
        <div className="chart-tooltip">
          <div className="tooltip-row">
            <span className="tooltip-label">Time:</span>
            <span className="tooltip-value">{tooltipData.time}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">O:</span>
            <span className="tooltip-value">{tooltipData.open}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">H:</span>
            <span className="tooltip-value">{tooltipData.high}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">L:</span>
            <span className="tooltip-value">{tooltipData.low}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">C:</span>
            <span className="tooltip-value">{tooltipData.close}</span>
          </div>
          {showVolume && (
            <div className="tooltip-row">
              <span className="tooltip-label">V:</span>
              <span className="tooltip-value">{tooltipData.volume}</span>
            </div>
          )}
        </div>
      )}

      {isLoading && data.length === 0 && (
        <div className="chart-loading">
          <div className="loading-spinner" />
          <p>Loading chart data...</p>
        </div>
      )}
    </Card>
  );
}
