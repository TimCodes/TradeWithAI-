# WebSocket Module

Real-time bidirectional communication infrastructure using Socket.IO for the TradeWithAI platform.

## 📋 Overview

The WebSocket module provides production-ready real-time communication capabilities between the server and clients. It enables instant updates for trading events, market data streaming, and LLM responses without polling or page refreshes.

## 🎯 Features

- **JWT Authentication**: Secure WebSocket connections with token validation
- **Room-Based Subscriptions**: Subscribe to specific data channels (trading, market-data, llm)
- **Heartbeat Mechanism**: Automatic connection health monitoring (30s intervals)
- **Rate Limiting**: 60 messages per minute per client to prevent abuse
- **Graceful Error Handling**: Errors don't disconnect clients
- **Broadcasting Utilities**: Send to specific users or rooms
- **Connection Statistics**: Track connected clients and subscriptions
- **Auto-Reconnection Support**: Client-side reconnection handling

## 🏗️ Architecture

```
WebSocketModule
├── websocket.gateway.ts      # Main gateway with Socket.IO server
├── websocket.module.ts        # Module configuration
├── guards/
│   └── ws-jwt.guard.ts       # JWT authentication guard
└── ws-exception.filter.ts    # Error handling filter
```

## 🔌 Client Connection

### Socket.IO Client Setup

**Installation**:
```bash
npm install socket.io-client
```

**React Hook Example**:
```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return { socket, connected };
}
```

### Subscribe to Channels

```typescript
// Subscribe to trading events
socket.emit('subscribe', {
  channel: 'trading'
});

// Subscribe to market data for specific symbols
socket.emit('subscribe', {
  channel: 'market-data',
  symbols: ['BTC/USD', 'ETH/USD']
});

// Subscribe to LLM responses
socket.emit('subscribe', {
  channel: 'llm'
});

// Listen for subscription confirmation
socket.on('subscribed', (data) => {
  console.log('Subscribed to:', data.channel);
});
```

### Listen for Events

```typescript
// Trading events
socket.on('order:filled', (order) => {
  console.log('Order filled:', order);
});

socket.on('position:updated', (position) => {
  console.log('Position updated:', position);
});

socket.on('balance:updated', (balance) => {
  console.log('Balance updated:', balance);
});

// Market data events
socket.on('ticker:update', (data) => {
  console.log('Ticker update:', data);
});

socket.on('orderbook:update', (data) => {
  console.log('Order book update:', data);
});

// LLM events
socket.on('llm:stream', (data) => {
  console.log('LLM chunk:', data);
});
```

### Unsubscribe from Channels

```typescript
socket.emit('unsubscribe', {
  channel: 'market-data',
  symbols: ['BTC/USD']
});
```

## 🔧 Server-Side Usage

### Import the Module

```typescript
import { WebsocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    WebsocketModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### Inject and Use the Gateway

```typescript
import { Injectable } from '@nestjs/common';
import { WebSocketGatewayService } from '../websocket/websocket.gateway';

@Injectable()
export class TradingService {
  constructor(
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  async notifyOrderFilled(userId: string, order: Order) {
    // Send to specific user
    this.wsGateway.sendToUser(userId, 'order:filled', order);
    
    // Broadcast to all trading subscribers
    this.wsGateway.broadcastToRoom('trading', 'order:filled', order);
  }

  async broadcastPriceUpdate(symbol: string, price: number) {
    this.wsGateway.broadcastToRoom(
      `market-data:${symbol}`,
      'ticker:update',
      { symbol, price }
    );
  }
}
```

## 📡 Available Channels

| Channel | Description | Example Room |
|---------|-------------|--------------|
| `user:{userId}` | User-specific messages | `user:123` |
| `trading` | All trading events | `trading` |
| `market-data` | All market data | `market-data` |
| `market-data:{symbols}` | Symbol-specific data | `market-data:BTC/USD,ETH/USD` |
| `llm` | LLM streaming | `llm` |

## 🔐 Authentication

### JWT Token

Clients must provide a valid JWT token when connecting:

```typescript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

### Development Mode

In development, connections without tokens are allowed (uses `test-user-id`):

```typescript
// No token required in development
const socket = io('http://localhost:3000');
```

## ⚡ Events Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe` | `{ channel, symbols? }` | Subscribe to channel |
| `unsubscribe` | `{ channel, symbols? }` | Unsubscribe from channel |
| `ping` | none | Health check |
| `get-subscriptions` | none | Get active subscriptions |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ message, clientId, userId, timestamp }` | Welcome message |
| `subscribed` | `{ channel, symbols, room, timestamp }` | Subscription confirmed |
| `unsubscribed` | `{ channel, symbols, room, timestamp }` | Unsubscription confirmed |
| `pong` | `{ timestamp }` | Health check response |
| `heartbeat` | `{ timestamp }` | Connection health (30s) |
| `error` | `{ message, code, timestamp }` | Error message |
| `connection-count` | `{ count, timestamp }` | Connected clients count |
| `subscriptions` | `{ subscriptions, count, timestamp }` | List of subscriptions |

## 📊 Rate Limiting

- **Limit**: 60 messages per minute per client
- **Window**: Rolling 1-minute window
- **Behavior**: Excess messages are rejected with error event
- **Reset**: Counter resets after 60 seconds

## 🔍 Monitoring

### Get Connection Statistics

```typescript
const stats = this.wsGateway.getStats();
console.log(stats);
// {
//   connectedClients: 5,
//   totalSubscriptions: 12,
//   clients: [
//     {
//       id: 'socket-id-1',
//       userId: 'user-123',
//       email: 'user@example.com',
//       subscriptions: ['trading', 'market-data:BTC/USD']
//     }
//   ]
// }
```

## 🧪 Testing

### Manual Testing with Node.js

```javascript
const { io } = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Subscribe to trading
  socket.emit('subscribe', { channel: 'trading' });
});

socket.on('subscribed', (data) => {
  console.log('Subscribed:', data);
});

socket.on('order:filled', (order) => {
  console.log('Order filled:', order);
});

// Test heartbeat
socket.on('heartbeat', (data) => {
  console.log('Heartbeat:', data);
});

// Test ping/pong
socket.emit('ping');
socket.on('pong', (data) => {
  console.log('Pong:', data);
});
```

## 🚀 Production Deployment

### Environment Variables

```bash
CLIENT_URL=https://your-frontend.com
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
```

### Checklist

- [ ] Enable WSS (wss://) with SSL certificate
- [ ] Update CORS to production CLIENT_URL
- [ ] Set strong JWT_SECRET
- [ ] Configure load balancer for sticky sessions
- [ ] Set up Redis adapter for multi-instance scaling
- [ ] Monitor connection counts and errors
- [ ] Set up alerts for high disconnect rates

### Redis Adapter (Multi-Instance Scaling)

For horizontal scaling:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## 📚 Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [NestJS WebSocket Guide](https://docs.nestjs.com/websockets/gateways)
- [WebSocket Security Best Practices](https://owasp.org/www-community/vulnerabilities/WebSocket_Security)

## 📄 License

Part of the TradeWithAI project. See main project README for license information.
