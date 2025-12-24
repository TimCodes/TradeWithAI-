# OrderBook Component - Quick Start Guide

## 🚀 Getting Started

### Basic Usage

```tsx
import { OrderBook } from './components/OrderBook';

function App() {
  return (
    <OrderBook symbol="BTC/USD" />
  );
}
```

### With Configuration

```tsx
<OrderBook 
  symbol="BTC/USD" 
  depth={20}
  height={800}
  showSpread={true}
/>
```

---

## 📋 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `symbol` | `string` | required | Trading pair (e.g., 'BTC/USD') |
| `depth` | `number` | `15` | Number of bid/ask levels to display |
| `height` | `number` | `600` | Component height in pixels |
| `showSpread` | `boolean` | `true` | Show spread section in middle |

---

## 🎨 Features

### Visual Features
- **Depth Bars**: Gradient backgrounds showing cumulative volume
- **Color Coding**: Green for bids, red for asks
- **Spread Display**: Shows absolute spread, percentage, and mid-price
- **Scrollable Sections**: Independent scrolling for bids and asks
- **Best Bid/Ask**: Footer displays best prices

### Data Features
- **Real-time Updates**: WebSocket integration for live data
- **Cumulative Totals**: Shows running total at each price level
- **Mid-Price**: Calculated from best bid and ask
- **Connection Status**: Live indicator in header

---

## 🔧 Development Setup

### Prerequisites
Ensure WebSocket connection is configured:
```tsx
// The OrderBook automatically subscribes via useOrderBook hook
// Requires useMarketDataStore and useMarketData hook
```

### Running the Example

```tsx
import { OrderBook } from '../components/OrderBook';
import { TradingChart } from '../components/TradingChart';

function TradingDashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Chart takes 2 columns */}
      <div className="col-span-2">
        <TradingChart symbol="BTC/USD" />
      </div>
      
      {/* OrderBook takes 1 column */}
      <div>
        <OrderBook symbol="BTC/USD" depth={15} />
      </div>
    </div>
  );
}
```

---

## 📊 Layout Variations

### Side-by-Side Equal Width
```tsx
<div className="grid grid-cols-2 gap-4">
  <TradingChart symbol="BTC/USD" height={700} />
  <OrderBook symbol="BTC/USD" depth={20} height={700} />
</div>
```

### Stacked (Mobile)
```tsx
<div className="space-y-4">
  <TradingChart symbol="BTC/USD" height={400} />
  <OrderBook symbol="BTC/USD" depth={10} height={400} />
</div>
```

### Full Width
```tsx
<OrderBook symbol="BTC/USD" depth={25} height={900} />
```

---

## 🎨 Customization

### Changing Colors

Edit `OrderBook.css`:

```css
.orderbook-row-bid .orderbook-price {
  @apply text-green-500;  /* Change bid color */
}

.orderbook-row-ask .orderbook-price {
  @apply text-red-500;    /* Change ask color */
}

.orderbook-depth-bid {
  @apply bg-green-500/10; /* Change bid depth bar */
}

.orderbook-depth-ask {
  @apply bg-red-500/10;   /* Change ask depth bar */
}
```

### Changing Depth Bar Transparency

```css
.orderbook-depth-bid {
  @apply bg-green-500/20; /* 20% opacity */
}

.orderbook-depth-ask {
  @apply bg-red-500/30;   /* 30% opacity */
}
```

### Changing Spread Display

```tsx
// Hide spread section
<OrderBook symbol="BTC/USD" showSpread={false} />

// Or customize in CSS
.orderbook-spread {
  /* Your custom styles */
}
```

---

## 🧪 Testing

### Manual Testing Checklist

1. **Display**
   - [ ] Order book renders without errors
   - [ ] Bids displayed in green
   - [ ] Asks displayed in red
   - [ ] Depth bars visible
   - [ ] Spread section shows correct values

2. **Real-time Updates**
   - [ ] Connection status shows "Live"
   - [ ] Prices update in real-time
   - [ ] Depth bars adjust on updates
   - [ ] Scroll position maintains

3. **Interactivity**
   - [ ] Rows highlight on hover
   - [ ] Bids section scrolls independently
   - [ ] Asks section scrolls independently
   - [ ] Spread section stays sticky

4. **Responsive**
   - [ ] Desktop view (>1024px)
   - [ ] Tablet view (768px-1024px)
   - [ ] Mobile view (<768px)

5. **Edge Cases**
   - [ ] No data (loading state)
   - [ ] WebSocket disconnected
   - [ ] Error handling

---

## 🐛 Troubleshooting

### Order Book Not Displaying
**Issue**: Component shows loading forever  
**Solution**:
1. Check WebSocket connection is established
2. Verify symbol is correct (e.g., 'BTC/USD')
3. Check browser console for errors
4. Ensure backend WebSocket is running

### Depth Bars Not Showing
**Issue**: No visual depth bars behind rows  
**Solution**:
1. Check that `total` values are present in data
2. Verify CSS is loading correctly
3. Check browser console for CSS errors

### Spread Not Updating
**Issue**: Spread shows 0 or stale data  
**Solution**:
1. Verify `showSpread={true}` prop
2. Check order book has both bids and asks
3. Verify WebSocket is sending spread data

### Scroll Not Working
**Issue**: Can't scroll bids or asks  
**Solution**:
1. Increase `depth` prop to show more levels
2. Check `height` prop is large enough
3. Verify CSS overflow properties

---

## 📚 Resources

### Related Components
- `TradingChart` - Candlestick chart component
- `PositionsList` - Open positions display (Story 5.3)
- `OrderForm` - Place orders (Story 5.4)

### Related Hooks
- `useOrderBook` - Order book data hook
- `useMarketData` - Market data WebSocket
- `useMarketDataStore` - Market data state

### Documentation
- `packages/client/src/components/STORY_5.2_COMPLETE.md`
- `PROJECT_ROADMAP.md` (Story 5.2)

---

## 💡 Tips

1. **Performance**: Component is optimized for frequent updates with memoization
2. **Data**: Order book data comes from WebSocket, ensure connection is stable
3. **Depth**: Default depth of 15 is good for most use cases
4. **Height**: Match height with adjacent components for visual balance
5. **Mobile**: Reduce depth (e.g., 10) for mobile views

---

## 🎯 Common Use Cases

### Trading Dashboard
```tsx
// Chart (2/3 width) + OrderBook (1/3 width)
<div className="grid grid-cols-3 gap-4">
  <div className="col-span-2">
    <TradingChart symbol="BTC/USD" />
  </div>
  <OrderBook symbol="BTC/USD" />
</div>
```

### Full Market Depth View
```tsx
// Large order book with more depth
<OrderBook 
  symbol="BTC/USD" 
  depth={30} 
  height={1000}
/>
```

### Multi-Symbol Monitoring
```tsx
// Multiple order books side by side
<div className="grid grid-cols-2 gap-4">
  <OrderBook symbol="BTC/USD" depth={10} height={500} />
  <OrderBook symbol="ETH/USD" depth={10} height={500} />
</div>
```

---

**Questions?** Check the detailed documentation in `STORY_5.2_COMPLETE.md`
