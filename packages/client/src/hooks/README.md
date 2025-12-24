# WebSocket Hooks

Custom React hooks for real-time WebSocket communication in the TradeWithAI application.

## Overview

These hooks provide a clean, React-friendly interface for WebSocket connectivity using Socket.IO. They handle connection management, auto-reconnection, event subscriptions, and automatic state updates via Zustand stores.

## Available Hooks

### 1. `useWebSocket`
Base WebSocket hook for connection management.

**Features:**
- Socket.IO client integration
- JWT authentication
- Auto-reconnection with exponential backoff
- Connection status tracking
- Event emission and listening
- Channel subscription management

**Usage:**
```typescript
import { useWebSocket } from '@/hooks';

function MyComponent() {
  const { 
    socket, 
    status, 
    error, 
    connect, 
    disconnect,
    emit,
    on,
    off,
    subscribe,
    unsubscribe
  } = useWebSocket({
    url: 'http://localhost:3000',
    autoConnect: true,
    reconnectionAttempts: 5,
  });

  useEffect(() => {
    if (status === 'connected') {
      subscribe('trading');
    }
  }, [status]);

  return <div>Status: {status}</div>;
}
```

### 2. `useMarketData`
Hook for real-time market data streaming (prices, order books).

**Features:**
- Subscribe to ticker updates
- Subscribe to order book depth
- Dynamic symbol management
- Throttling for high-frequency updates
- Automatic Zustand store updates

**Usage:**
```typescript
import { useMarketData } from '@/hooks';

function PriceDisplay() {
  const { 
    isConnected,
    subscribe,
    unsubscribe,
    getTicker,
    getOrderBook
  } = useMarketData({
    autoSubscribe: true,
    symbols: ['BTC/USD', 'ETH/USD'],
    throttleMs: 100,
  });

  const btcPrice = getTicker('BTC/USD');
  const btcOrderBook = getOrderBook('BTC/USD');

  return (
    <div>
      {btcPrice && <p>BTC: ${btcPrice.price}</p>}
      {btcOrderBook && <p>Spread: ${btcOrderBook.spread}</p>}
    </div>
  );
}
```

### 3. `useTradingEvents`
Hook for trading event notifications (orders, positions, balances).

**Features:**
- Listen to order lifecycle events
- Listen to position updates
- Listen to balance changes
- Optional callbacks for custom handling
- Automatic Zustand store updates

**Usage:**
```typescript
import { useTradingEvents } from '@/hooks';
import { toast } from 'sonner';

function TradingNotifications() {
  const { isConnected } = useTradingEvents({
    autoSubscribe: true,
    onOrderFilled: (order) => {
      toast.success(`Order filled: ${order.symbol}`);
    },
    onOrderRejected: (order) => {
      toast.error(`Order rejected: ${order.error}`);
    },
    onPositionOpened: (position) => {
      toast.info(`Position opened: ${position.symbol}`);
    },
    onPositionClosed: (position) => {
      const color = position.realizedPnl >= 0 ? 'success' : 'error';
      toast[color](`P&L: $${position.realizedPnl.toFixed(2)}`);
    },
    onBalanceUpdated: (balance) => {
      console.log('Balance updated:', balance);
    },
  });

  return null;
}
```

### 4. `useLLMStream`
Hook for streaming LLM responses token by token.

**Features:**
- Stream LLM responses in real-time
- Support for multiple providers
- Stream cancellation
- Session management
- Automatic message store updates

**Usage:**
```typescript
import { useLLMStream } from '@/hooks';

function ChatBox() {
  const { 
    isConnected,
    isStreaming,
    streamingContent,
    sendMessage,
    cancelStream
  } = useLLMStream({
    autoSubscribe: true,
    onStreamStart: (sessionId) => {
      console.log('Stream started:', sessionId);
    },
    onStreamToken: (token) => {
      // Optional: handle each token
    },
    onStreamDone: (fullResponse) => {
      console.log('Stream complete:', fullResponse);
    },
    onStreamError: (error) => {
      console.error('Stream error:', error);
    },
  });

  return (
    <div>
      <button 
        onClick={() => sendMessage('What is Bitcoin?', 'openai')}
        disabled={isStreaming}
      >
        Send Message
      </button>
      
      {isStreaming && (
        <>
          <p>{streamingContent}</p>
          <button onClick={cancelStream}>Cancel</button>
        </>
      )}
    </div>
  );
}
```

## Connection Status

All hooks expose connection status via `isConnected` or `status`:

- `disconnected`: Not connected to server
- `connecting`: Attempting to connect
- `connected`: Connected and ready
- `error`: Connection error occurred

## Auto-Reconnection

The `useWebSocket` hook implements automatic reconnection with exponential backoff:

- Initial delay: 1000ms (1 second)
- Max delay: 5000ms (5 seconds)
- Default attempts: 5
- Formula: `delay = min(1000 * 2^attempt, 5000)`

Example progression:
1. Attempt 1: 1000ms delay
2. Attempt 2: 2000ms delay
3. Attempt 3: 4000ms delay
4. Attempt 4+: 5000ms delay (capped)

## Error Handling

All hooks handle errors gracefully:

```typescript
const { error } = useWebSocket();

useEffect(() => {
  if (error) {
    console.error('WebSocket error:', error);
    // Handle error (show notification, etc.)
  }
}, [error]);
```

## Cleanup

All hooks automatically clean up on unmount:
- Event listeners are removed
- WebSocket connections are closed
- Timers are cleared
- Active streams are cancelled

No manual cleanup needed!

## Best Practices

### 1. Use `autoSubscribe` for permanent subscriptions
```typescript
// Good: Component always needs this data
const { isConnected } = useMarketData({
  autoSubscribe: true,
  symbols: ['BTC/USD'],
});
```

### 2. Manual subscription for conditional data
```typescript
// Good: Only subscribe when user selects a symbol
const { subscribe, unsubscribe } = useMarketData();

useEffect(() => {
  if (selectedSymbol) {
    subscribe([selectedSymbol]);
  }
  return () => unsubscribe([selectedSymbol]);
}, [selectedSymbol]);
```

### 3. Use callbacks for side effects
```typescript
// Good: Toast notifications without extra components
useTradingEvents({
  autoSubscribe: true,
  onOrderFilled: (order) => toast.success('Order filled!'),
});
```

### 4. Combine hooks for complex features
```typescript
function TradingDashboard() {
  // WebSocket connection
  const { status } = useWebSocket({ autoConnect: true });
  
  // Market data
  const { getTicker } = useMarketData({
    autoSubscribe: true,
    symbols: ['BTC/USD'],
  });
  
  // Trading events
  useTradingEvents({
    autoSubscribe: true,
    onOrderFilled: (order) => toast.success('Order filled!'),
  });

  // LLM chat
  const { sendMessage } = useLLMStream({ autoSubscribe: true });

  return <div>Status: {status}</div>;
}
```

### 5. Handle loading states
```typescript
function PriceDisplay() {
  const { isConnected, getTicker } = useMarketData({
    autoSubscribe: true,
    symbols: ['BTC/USD'],
  });

  const price = getTicker('BTC/USD');

  if (!isConnected) return <div>Connecting...</div>;
  if (!price) return <div>Loading price...</div>;
  
  return <div>BTC: ${price.price}</div>;
}
```

## Troubleshooting

### Connection fails repeatedly
- Check WebSocket server is running
- Verify `VITE_WS_URL` environment variable
- Check JWT token is valid (stored in `useAuthStore`)
- Check network connectivity

### Data not updating
- Ensure `autoSubscribe` is true OR manually call `subscribe()`
- Check you're subscribed to the correct channel
- Verify WebSocket server is sending events
- Check browser console for errors

### Memory leaks
- Ensure you're not creating multiple hook instances unnecessarily
- Hooks automatically cleanup - don't manually manage connections
- Use `React.memo` or `useMemo` for expensive computations

### TypeScript errors
- Import types from `@/types/store.types`
- Use proper type annotations for callbacks
- Check Socket.IO types are installed

## Environment Variables

Set in `.env.local`:

```bash
VITE_WS_URL=http://localhost:3000
```

For production:
```bash
VITE_WS_URL=wss://api.tradewithai.com
```

## Dependencies

- `socket.io-client@^4.7.0`
- `zustand@^4.5.7`
- `react@^18.2.0`

## Related Documentation

- [WebSocket Gateway](../../../server/src/modules/websocket/README.md)
- [Zustand Stores](../stores/README.md)
- [Trading Events](../../../server/src/modules/trading/INTEGRATION_GUIDE.md)
- [Market Data Events](../../../server/src/modules/market-data/INTEGRATION_GUIDE.md)

## Testing

### Unit Tests (to be implemented)
```typescript
// Example test structure
describe('useWebSocket', () => {
  it('should connect on mount when autoConnect is true', () => {
    // Test implementation
  });

  it('should reconnect with exponential backoff', () => {
    // Test implementation
  });
});
```

### Integration Tests (to be implemented)
Test hooks with real WebSocket server in test environment.

## License

MIT
