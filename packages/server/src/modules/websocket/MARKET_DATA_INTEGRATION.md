# Market Data Streaming - Integration Guide

This guide explains how to integrate market data streaming into your client application.

## 🔌 WebSocket Connection Setup

### 1. Install Socket.IO Client

```bash
npm install socket.io-client
```

### 2. Create WebSocket Service

```typescript
// src/services/websocket.service.ts
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connected', (data) => {
      console.log('Connected to WebSocket:', data);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToMarketData(symbols: string[], callback: (data: any) => void) {
    if (!this.socket) return;

    // Subscribe to market data channel
    this.socket.emit('subscribe', {
      channel: 'market-data',
      symbols,
    });

    // Listen for ticker updates
    this.socket.on('ticker:update', (data) => {
      callback({ type: 'ticker', ...data });
    });

    // Listen for order book updates
    this.socket.on('orderbook:update', (data) => {
      callback({ type: 'orderbook', ...data });
    });
  }

  unsubscribeFromMarketData(symbols: string[]) {
    if (!this.socket) return;

    this.socket.emit('unsubscribe', {
      channel: 'market-data',
      symbols,
    });
  }
}

export const wsService = new WebSocketService();
```

## 🎣 React Hook for Market Data

```typescript
// src/hooks/useMarketData.ts
import { useEffect, useState } from 'react';
import { wsService } from '../services/websocket.service';

interface TickerData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: string;
}

interface OrderBookData {
  symbol: string;
  bids: Array<{ price: number; size: number; total: number }>;
  asks: Array<{ price: number; size: number; total: number }>;
  timestamp: string;
}

export function useMarketData(symbols: string[]) {
  const [tickers, setTickers] = useState<Record<string, TickerData>>({});
  const [orderBooks, setOrderBooks] = useState<Record<string, OrderBookData>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const token = localStorage.getItem('jwt_token'); // Get your JWT token
    if (!token) return;

    const socket = wsService.connect(token);
    setIsConnected(true);

    // Subscribe to symbols
    wsService.subscribeToMarketData(symbols, (data) => {
      if (data.type === 'ticker') {
        setTickers((prev) => ({
          ...prev,
          [data.ticker.symbol]: data.ticker,
        }));
      } else if (data.type === 'orderbook') {
        setOrderBooks((prev) => ({
          ...prev,
          [data.orderBook.symbol]: data.orderBook,
        }));
      }
    });

    // Cleanup on unmount
    return () => {
      wsService.unsubscribeFromMarketData(symbols);
      wsService.disconnect();
      setIsConnected(false);
    };
  }, [symbols]);

  return { tickers, orderBooks, isConnected };
}
```

## 💻 React Component Example

```tsx
// src/components/LivePriceDisplay.tsx
import React from 'react';
import { useMarketData } from '../hooks/useMarketData';

export function LivePriceDisplay() {
  const { tickers, orderBooks, isConnected } = useMarketData([
    'BTC/USD',
    'ETH/USD',
  ]);

  if (!isConnected) {
    return <div>Connecting to live market data...</div>;
  }

  return (
    <div>
      <h2>Live Market Data</h2>
      
      {Object.values(tickers).map((ticker) => (
        <div key={ticker.symbol} className="ticker-card">
          <h3>{ticker.symbol}</h3>
          <div className="price">${ticker.price.toFixed(2)}</div>
          <div className={ticker.change24h >= 0 ? 'positive' : 'negative'}>
            {ticker.change24h >= 0 ? '+' : ''}
            {ticker.change24h.toFixed(2)}%
          </div>
          <div className="spread">
            Bid: ${ticker.bid.toFixed(2)} | Ask: ${ticker.ask.toFixed(2)}
          </div>
          <div className="volume">
            Volume: {ticker.volume24h.toFixed(2)}
          </div>
        </div>
      ))}

      <h3>Order Books</h3>
      {Object.values(orderBooks).map((orderBook) => (
        <div key={orderBook.symbol} className="orderbook">
          <h4>{orderBook.symbol}</h4>
          <div className="orderbook-grid">
            <div className="bids">
              <h5>Bids</h5>
              {orderBook.bids.slice(0, 10).map((bid, idx) => (
                <div key={idx} className="order-row">
                  <span>${bid.price.toFixed(2)}</span>
                  <span>{bid.size.toFixed(4)}</span>
                  <span>{bid.total.toFixed(4)}</span>
                </div>
              ))}
            </div>
            <div className="asks">
              <h5>Asks</h5>
              {orderBook.asks.slice(0, 10).map((ask, idx) => (
                <div key={idx} className="order-row">
                  <span>${ask.price.toFixed(2)}</span>
                  <span>{ask.size.toFixed(4)}</span>
                  <span>{ask.total.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## 🎨 Styling Example

```css
/* src/components/LivePriceDisplay.css */
.ticker-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin: 8px;
  background: #fff;
}

.price {
  font-size: 32px;
  font-weight: bold;
  margin: 8px 0;
}

.positive {
  color: #22c55e;
}

.negative {
  color: #ef4444;
}

.orderbook-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.order-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 4px;
  font-size: 12px;
}

.bids .order-row {
  background: rgba(34, 197, 94, 0.1);
}

.asks .order-row {
  background: rgba(239, 68, 68, 0.1);
}
```

## 🔄 Advanced: Zustand Store Integration

```typescript
// src/stores/useMarketDataStore.ts
import create from 'zustand';
import { wsService } from '../services/websocket.service';

interface MarketDataStore {
  tickers: Record<string, any>;
  orderBooks: Record<string, any>;
  subscribedSymbols: string[];
  isConnected: boolean;
  
  connect: (token: string) => void;
  disconnect: () => void;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
}

export const useMarketDataStore = create<MarketDataStore>((set, get) => ({
  tickers: {},
  orderBooks: {},
  subscribedSymbols: [],
  isConnected: false,

  connect: (token: string) => {
    wsService.connect(token);
    set({ isConnected: true });
  },

  disconnect: () => {
    wsService.disconnect();
    set({ isConnected: false, subscribedSymbols: [] });
  },

  subscribe: (symbols: string[]) => {
    const { subscribedSymbols } = get();
    const newSymbols = symbols.filter((s) => !subscribedSymbols.includes(s));
    
    if (newSymbols.length > 0) {
      wsService.subscribeToMarketData(newSymbols, (data) => {
        if (data.type === 'ticker') {
          set((state) => ({
            tickers: {
              ...state.tickers,
              [data.ticker.symbol]: data.ticker,
            },
          }));
        } else if (data.type === 'orderbook') {
          set((state) => ({
            orderBooks: {
              ...state.orderBooks,
              [data.orderBook.symbol]: data.orderBook,
            },
          }));
        }
      });

      set((state) => ({
        subscribedSymbols: [...state.subscribedSymbols, ...newSymbols],
      }));
    }
  },

  unsubscribe: (symbols: string[]) => {
    wsService.unsubscribeFromMarketData(symbols);
    set((state) => ({
      subscribedSymbols: state.subscribedSymbols.filter(
        (s) => !symbols.includes(s)
      ),
    }));
  },
}));
```

## 📊 Performance Tips

### 1. Throttle UI Updates

```typescript
import { throttle } from 'lodash';

const updatePrice = throttle((price) => {
  setPriceState(price);
}, 100); // Update UI max once per 100ms
```

### 2. Memoize Components

```tsx
import { memo } from 'react';

export const TickerCard = memo(({ ticker }) => {
  return <div>...</div>;
}, (prev, next) => {
  // Only re-render if price changed
  return prev.ticker.price === next.ticker.price;
});
```

### 3. Selective Subscriptions

Only subscribe to symbols you're actively displaying:

```typescript
useEffect(() => {
  if (activeTab === 'BTC/USD') {
    subscribe(['BTC/USD']);
  }
  return () => unsubscribe(['BTC/USD']);
}, [activeTab]);
```

## 🐛 Debugging

### Check Connection Status

```bash
# Get WebSocket statistics
curl http://localhost:3000/websocket/health

# Get market data streaming stats
curl http://localhost:3000/websocket/market-data/stats
```

### Browser Console

```javascript
// Check socket connection
wsService.socket.connected // true/false

// Check subscriptions
wsService.socket.emit('get-subscriptions');
wsService.socket.on('subscriptions', (data) => {
  console.log('Current subscriptions:', data);
});
```

## 🚨 Error Handling

```typescript
wsService.socket.on('error', (error) => {
  console.error('WebSocket error:', error);
  // Show user notification
  toast.error('Connection error. Reconnecting...');
});

wsService.socket.on('disconnect', (reason) => {
  console.warn('Disconnected:', reason);
  // Attempt reconnection
  if (reason === 'io server disconnect') {
    // Manual reconnect
    wsService.socket.connect();
  }
});
```

---

## 📚 Next Steps

1. Implement the React hook in your client
2. Create UI components for live prices
3. Add order book visualization
4. Implement charting with live data updates
5. Add connection status indicators
6. Handle errors gracefully

For more details, see `STORY_3.3_COMPLETE.md`.
