# PositionsList Component - Quick Reference

## 📦 Files Created

### 1. Component (294 lines)
`packages/client/src/components/PositionsList.tsx`
- Main `PositionsList` component with filters and sorting
- `PositionRow` sub-component for individual positions
- Real-time P&L calculations based on live prices
- Close position functionality with confirmation

### 2. Styling (412 lines)
`packages/client/src/components/PositionsList.css`
- Responsive table layout
- Color-coded P&L (green profit, red loss)
- Side badges (long/short)
- P&L pulse animation
- Mobile-optimized (hides columns on small screens)
- Dark mode support

### 3. Documentation (497 lines)
`packages/client/src/components/STORY_5.3_COMPLETE.md`
- Complete acceptance criteria checklist
- Implementation details
- Usage examples
- Data flow diagrams
- Testing scenarios

### 4. Examples (376 lines)
`packages/client/src/components/PositionsList.examples.tsx`
- 10 practical usage examples
- Mock data generators
- Integration patterns
- Error handling examples

## 🚀 Quick Start

```tsx
import { PositionsList } from './components/PositionsList';

function MyDashboard() {
  return <PositionsList maxHeight={600} />;
}
```

## ✨ Key Features

1. **Real-time P&L Updates** - Uses live ticker prices to recalculate P&L
2. **Color Coding** - Green for profit, red for loss
3. **Sort & Filter** - By symbol, side, size, prices, P&L
4. **Close Position** - With confirmation dialog
5. **Responsive Design** - Works on mobile, tablet, desktop
6. **Dark Mode** - Automatic theme support
7. **Accessibility** - Focus states, high contrast support

## 📊 Data Sources

- **Positions**: `useTradingStore().positions`
- **Live Prices**: `useMarketDataStore().tickers`
- **Updates**: Automatic via WebSocket hooks

## 🎨 Component Props

```typescript
interface PositionsListProps {
  showClosed?: boolean;  // Future: Show closed positions (default: false)
  maxHeight?: number;    // Max height in pixels (default: 600)
}
```

## 🔧 Integration Example

```tsx
import { PositionsList } from '../components/PositionsList';
import { useTradingEvents } from '../hooks/useTradingEvents';

function TradingDashboard() {
  // Enable real-time updates
  useTradingEvents({
    onPositionOpened: (pos) => console.log('Opened:', pos),
    onPositionClosed: (pos) => console.log('Closed:', pos),
  });

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <PositionsList maxHeight={400} />
      </div>
    </div>
  );
}
```

## 📱 Responsive Behavior

| Screen Size | Columns Shown |
|-------------|---------------|
| Desktop (>1024px) | All columns |
| Tablet (768-1024px) | Hide realized P&L |
| Mobile (<768px) | Hide realized P&L, entry price |
| Small (<480px) | Hide SL/TP levels too |

## 🎯 Story 5.3 Status

✅ **COMPLETE** - All 7 acceptance criteria met:
1. ✅ Display positions table
2. ✅ Show symbol, side, size, prices
3. ✅ Color code P&L
4. ✅ Close position button
5. ✅ Real-time P&L updates
6. ✅ Unrealized vs realized P&L
7. ✅ Sort/filter functionality

## 📈 Epic 5 Progress

- ✅ Story 5.1: TradingChart Component (8 points)
- ✅ Story 5.2: OrderBook Component (5 points)
- ✅ Story 5.3: PositionsList Component (5 points)
- ⏳ Story 5.4: OrderForm Component (8 points) - NEXT
- ⏳ Story 5.5: Update TradingDashboard (5 points) - FINAL

**Progress**: 18/31 points (58%) complete

## 🔗 Related Files

- **Stores**: `stores/useTradingStore.ts`, `stores/useMarketDataStore.ts`
- **Types**: `types/store.types.ts`
- **Hooks**: `hooks/useTradingEvents.ts`
- **UI Components**: `components/ui/button.tsx`, `components/ui/card.tsx`

## 📝 Notes

- CSS `@apply` warnings are expected (Tailwind directive)
- Close position needs API integration (Story 4.2)
- `showClosed` prop reserved for future feature
- Performance optimized with `useMemo` for calculations

---

**Ready for Story 5.4!** 🎉
