# Zustand Stores

Centralized state management for the TradeWithAI frontend using Zustand.

## 📦 Stores Overview

### 🔹 useTradingStore
Manages trading operations, positions, orders, and balances.

```typescript
import { useTradingStore } from '@/stores';

// Get state
const positions = useTradingStore(state => state.positions);
const orders = useTradingStore(state => state.orders);

// Use actions
const { addOrder, updatePosition, setBalances } = useTradingStore();
```

**Key Features:**
- Position tracking with real-time P&L
- Order management (market/limit)
- Multi-currency balance tracking
- Trading statistics and metrics

---

### 🔹 useLLMStore
Manages LLM chat interactions, providers, and streaming responses.

```typescript
import { useLLMStore } from '@/stores';

// Get state
const messages = useLLMStore(state => state.messages);
const currentProvider = useLLMStore(state => state.currentProvider);

// Use actions
const { addMessage, setStreaming, setCurrentProvider } = useLLMStore();
```

**Key Features:**
- Chat message history
- 7 LLM providers (OpenAI, Claude, DeepSeek, etc.)
- Streaming response support
- Trade signal extraction
- Response time tracking

---

### 🔹 useMarketDataStore
Manages real-time market data, prices, and order books.

```typescript
import { useMarketDataStore, selectLatestPrice } from '@/stores';

// Get state with selector
const btcPrice = useMarketDataStore(state => 
  selectLatestPrice(state, 'BTC/USD')
);

// Use actions
const { setTicker, setOrderBook, subscribe } = useMarketDataStore();
```

**Key Features:**
- Real-time ticker data (price, volume, 24h change)
- Order book depth tracking
- OHLCV candlestick data
- Symbol subscription management
- WebSocket connection status

---

### 🔹 useAuthStore
Manages authentication, user session, and preferences (with persistence).

```typescript
import { useAuthStore } from '@/stores';

// Get state
const user = useAuthStore(state => state.user);
const isAuthenticated = useAuthStore(state => state.isAuthenticated);
const theme = useAuthStore(state => state.preferences.theme);

// Use actions
const { setTokens, setPreferences, logout } = useAuthStore();
```

**Key Features:**
- JWT token management (with refresh)
- User profile storage
- API key status tracking (Kraken, LLMs)
- User preferences (theme, notifications, defaults)
- **Persistent storage** via localStorage

---

## 🎯 Usage Patterns

### Basic Usage
```typescript
// Import the store
import { useTradingStore } from '@/stores';

function MyComponent() {
  // Subscribe to specific state
  const positions = useTradingStore(state => state.positions);
  
  // Get actions
  const addOrder = useTradingStore(state => state.addOrder);
  
  // Use in component
  return <div>{positions.length} positions</div>;
}
```

### Using Selectors (Optimized)
```typescript
import { useTradingStore, selectTotalPnl } from '@/stores';

function PnLDisplay() {
  // Only re-renders when total P&L changes
  const totalPnl = useTradingStore(selectTotalPnl);
  
  return <div>Total P&L: ${totalPnl}</div>;
}
```

### Multiple State Properties
```typescript
function TradingDashboard() {
  // Get multiple properties at once
  const { positions, orders, balances, stats } = useTradingStore();
  
  // Or use a selector for derived state
  const openOrdersCount = useTradingStore(selectOpenOrdersCount);
}
```

### Calling Actions
```typescript
function OrderForm() {
  const addOrder = useTradingStore(state => state.addOrder);
  
  const handleSubmit = () => {
    addOrder({
      id: crypto.randomUUID(),
      symbol: 'BTC/USD',
      side: 'buy',
      type: 'market',
      size: 0.1,
      status: 'pending',
      filledSize: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };
}
```

---

## 🛠️ Advanced Features

### DevTools Integration
All stores support Redux DevTools in development mode:
1. Install Redux DevTools browser extension
2. Open DevTools → Redux tab
3. See all state changes with time-travel debugging

### Persistence (Auth Store Only)
The auth store automatically persists to localStorage:
- Token and refresh token
- User profile
- User preferences
- Authentication state

Persisted data is automatically rehydrated on page load.

### Custom Selectors
Create your own selectors for derived state:

```typescript
// In your component file
const selectProfitablePositions = (state: TradingState) =>
  state.positions.filter(pos => pos.unrealizedPnl > 0);

// Use in component
function ProfitablePositionsList() {
  const profitable = useTradingStore(selectProfitablePositions);
  return <List items={profitable} />;
}
```

---

## 📁 File Structure

```
packages/client/src/
├── stores/
│   ├── useTradingStore.ts       # Trading operations
│   ├── useLLMStore.ts           # LLM chat & providers
│   ├── useMarketDataStore.ts    # Market data & prices
│   ├── useAuthStore.ts          # Auth & preferences
│   ├── index.ts                 # Central exports
│   ├── README.md                # This file
│   └── STORY_4.1_COMPLETE.md    # Implementation docs
└── types/
    └── store.types.ts           # TypeScript interfaces
```

---

## 🔗 Integration with Other Systems

### WebSocket Updates (Story 3.x)
```typescript
// In your WebSocket hook
socket.on('orderUpdate', (data) => {
  useTradingStore.getState().updateOrder(data.id, data);
});

socket.on('ticker', (data) => {
  useMarketDataStore.getState().setTicker(data.symbol, data);
});
```

### API Calls (Story 4.2)
```typescript
// In your API service
async function fetchPositions() {
  const response = await api.get('/positions');
  useTradingStore.getState().setPositions(response.data);
}
```

---

## 🧪 Testing

### Example Test
```typescript
import { renderHook, act } from '@testing-library/react';
import { useTradingStore } from './useTradingStore';

describe('useTradingStore', () => {
  it('should add an order', () => {
    const { result } = renderHook(() => useTradingStore());
    
    act(() => {
      result.current.addOrder({
        id: '1',
        symbol: 'BTC/USD',
        // ... other fields
      });
    });
    
    expect(result.current.orders).toHaveLength(1);
  });
});
```

---

## 📚 Learn More

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TypeScript with Zustand](https://github.com/pmndrs/zustand#typescript)
- [Zustand Best Practices](https://github.com/pmndrs/zustand/wiki/Best-Practices)

---

**Last Updated**: October 31, 2025  
**Story**: 4.1 Zustand Store Setup ✅  
**Next**: Story 4.2 API Service Layer
