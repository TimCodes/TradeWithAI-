# TradingChart Component - Quick Start Guide

## 🚀 Getting Started

### Basic Usage

```tsx
import { TradingChart } from './components/TradingChart';

function App() {
  return (
    <TradingChart symbol="BTC/USD" />
  );
}
```

### With Configuration

```tsx
<TradingChart 
  symbol="BTC/USD" 
  initialTimeframe="15m"
  height={600}
  showVolume={true}
  showTradeMarkers={true}
/>
```

---

## 📋 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `symbol` | `string` | required | Trading pair (e.g., 'BTC/USD') |
| `initialTimeframe` | `Timeframe` | `'15m'` | Initial chart timeframe |
| `height` | `number` | `600` | Chart height in pixels |
| `showVolume` | `boolean` | `true` | Show volume histogram |
| `showTradeMarkers` | `boolean` | `true` | Show trade entry markers |

### Timeframe Options
- `'1m'` - 1 minute
- `'5m'` - 5 minutes
- `'15m'` - 15 minutes
- `'1h'` - 1 hour
- `'4h'` - 4 hours
- `'1d'` - 1 day

---

## 🔧 Development Setup

### Prerequisites
The component requires these stores to be set up:
- `useMarketDataStore` - For ticker data and OHLCV
- `useTradingStore` - For position/trade markers

### Mock Data
In development, the component automatically uses mock data if the API fails. This allows you to develop without a backend connection.

### Running the Example

1. **Update TradingDashboard.tsx**:
```tsx
import { TradingChart } from '../components/TradingChart';

export function TradingDashboard() {
  return (
    <div className="space-y-6">
      <TradingChart 
        symbol="BTC/USD" 
        initialTimeframe="15m"
      />
    </div>
  );
}
```

2. **Start the dev server**:
```bash
npm run dev
```

3. **Navigate to the Trading Dashboard**

---

## 🎨 Customization

### Changing Chart Colors

Edit `TradingChart.tsx` in the `createChart()` call:

```tsx
const chart = createChart(chartContainerRef.current, {
  layout: {
    background: { color: '#0a0a0a' }, // Background color
    textColor: '#d1d5db',              // Text color
  },
  grid: {
    vertLines: { color: '#1f2937' },   // Vertical grid lines
    horzLines: { color: '#1f2937' },   // Horizontal grid lines
  },
});

const candlestickSeries = chart.addCandlestickSeries({
  upColor: '#22c55e',        // Bullish candle color
  downColor: '#ef4444',      // Bearish candle color
  borderUpColor: '#22c55e',  // Bullish border
  borderDownColor: '#ef4444', // Bearish border
  wickUpColor: '#22c55e',    // Bullish wick
  wickDownColor: '#ef4444',  // Bearish wick
});
```

### Changing Auto-Update Intervals

Edit `useChartData.ts` in the `useEffect` with `autoUpdate`:

```tsx
const updateIntervals: Record<Timeframe, number> = {
  '1m': 60 * 1000,       // 1 minute
  '5m': 5 * 60 * 1000,   // 5 minutes
  // ... etc
};
```

### Changing Data Range

Edit `useChartData.ts` in the `fetchOHLCVData` function:

```tsx
const timeRanges: Record<Timeframe, number> = {
  '1m': 24 * 60 * 60 * 1000,  // 1 day
  '5m': 3 * 24 * 60 * 60 * 1000,  // 3 days
  // ... etc
};
```

---

## 🧪 Testing

### Manual Testing Checklist

1. **Chart Rendering**
   - [ ] Chart displays without errors
   - [ ] Candlesticks render correctly
   - [ ] Volume histogram displays below chart
   - [ ] All UI elements visible

2. **Timeframe Switching**
   - [ ] All 6 timeframes selectable
   - [ ] Data refreshes on timeframe change
   - [ ] Active timeframe highlighted

3. **Real-time Updates**
   - [ ] Current price line displays
   - [ ] Price line updates with new data
   - [ ] Trade markers appear for positions

4. **Interactivity**
   - [ ] Crosshair shows on hover
   - [ ] Tooltip displays OHLC data
   - [ ] Zoom works (mouse wheel)
   - [ ] Pan works (click and drag)
   - [ ] Refresh button works

5. **Responsive Design**
   - [ ] Desktop view (>768px)
   - [ ] Tablet view (480px-768px)
   - [ ] Mobile view (<480px)

6. **Error Handling**
   - [ ] Error message displays on API failure
   - [ ] Retry button works
   - [ ] Mock data loads in development

### Unit Test Suggestions

```tsx
// TradingChart.test.tsx
describe('TradingChart', () => {
  it('renders without crashing', () => {
    render(<TradingChart symbol="BTC/USD" />);
  });

  it('displays the correct symbol', () => {
    const { getByText } = render(<TradingChart symbol="BTC/USD" />);
    expect(getByText('BTC/USD')).toBeInTheDocument();
  });

  it('changes timeframe on button click', () => {
    const { getByText } = render(<TradingChart symbol="BTC/USD" />);
    const button = getByText('1h');
    fireEvent.click(button);
    expect(button).toHaveClass('active');
  });

  it('displays volume when enabled', () => {
    const { container } = render(
      <TradingChart symbol="BTC/USD" showVolume={true} />
    );
    // Check for volume series
  });
});
```

---

## 🐛 Troubleshooting

### Chart Not Displaying
**Issue**: Blank chart area  
**Solution**: Check browser console for errors. Ensure `lightweight-charts` is installed.

### No Data Showing
**Issue**: Chart empty or loading forever  
**Solution**: 
1. Check API endpoint is correct
2. Verify WebSocket connection
3. Check browser network tab for failed requests
4. In development, mock data should load automatically

### Trade Markers Not Showing
**Issue**: No markers on chart despite having positions  
**Solution**:
1. Verify `showTradeMarkers={true}` prop
2. Check `useTradingStore` has positions
3. Ensure position timestamps are valid

### Timeframe Not Changing
**Issue**: Clicking timeframe buttons does nothing  
**Solution**:
1. Check for console errors
2. Verify `useChartData` hook is working
3. Check API endpoint returns data for that timeframe

### Chart Not Responsive
**Issue**: Chart doesn't resize with window  
**Solution**: Ensure the chart container has proper width. Check for CSS conflicts.

---

## 📚 Resources

### Lightweight Charts Documentation
- [Official Docs](https://tradingview.github.io/lightweight-charts/)
- [API Reference](https://tradingview.github.io/lightweight-charts/docs/api)
- [Examples](https://tradingview.github.io/lightweight-charts/tutorials)

### Related Files
- `packages/client/src/stores/useMarketDataStore.ts`
- `packages/client/src/hooks/useMarketData.ts`
- `packages/client/src/types/store.types.ts`

### Documentation
- `packages/client/src/components/STORY_5.1_COMPLETE.md`
- `PROJECT_ROADMAP.md` (Story 5.1)

---

## 🎯 Next Steps

After integrating the TradingChart, you should:

1. **Complete Story 4.2** - API Service Layer
   - Replace mock data with real API calls
   - Add proper error handling
   - Implement data caching

2. **Complete Story 5.2** - OrderBook Component
   - Display live bid/ask depth
   - Integrate with market data WebSocket

3. **Complete Story 5.3** - PositionsList Component
   - Show open positions with P&L
   - Real-time updates

4. **Complete Story 5.4** - OrderForm Component
   - Place trades from the UI
   - Risk validation

5. **Integrate All Components** - Story 5.5
   - Update TradingDashboard with all components
   - Create cohesive layout

---

## 💡 Tips

1. **Performance**: The chart is optimized for performance with throttling and efficient re-renders
2. **Data Management**: Use the Zustand stores for all state management
3. **Customization**: Most visual aspects can be customized via props or CSS
4. **Testing**: Test on multiple screen sizes and browsers
5. **Production**: Remember to replace mock data with real API calls

---

**Questions?** Check the detailed documentation in `STORY_5.1_COMPLETE.md`
