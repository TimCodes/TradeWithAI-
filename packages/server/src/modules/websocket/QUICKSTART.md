# WebSocket Gateway - Quick Start & Testing Guide

## 🚀 What Was Implemented

Story 3.1 WebSocket Gateway Setup is now **COMPLETE**! ✅

### Files Created
- ✅ `websocket.gateway.ts` - Main Socket.IO gateway (426 lines)
- ✅ `websocket.module.ts` - Module configuration
- ✅ `guards/ws-jwt.guard.ts` - JWT authentication guard
- ✅ `ws-exception.filter.ts` - Error handling filter
- ✅ `controllers/health.controller.ts` - Health check endpoints
- ✅ `README.md` - Full documentation
- ✅ `INTEGRATION_GUIDE.md` - Integration examples
- ✅ `STORY_3.1_COMPLETE.md` - Implementation notes

### Features Implemented
- ✅ Socket.IO server with JWT authentication
- ✅ Connection/disconnection lifecycle handlers
- ✅ Room-based subscription system (trading, market-data, llm)
- ✅ Heartbeat mechanism (30s intervals)
- ✅ Rate limiting (60 messages/minute per client)
- ✅ Broadcasting utilities (sendToUser, broadcastToRoom)
- ✅ Connection statistics tracking
- ✅ Health check endpoints

## 🧪 How to Test

### 1. Start the Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### 2. Test Health Endpoints

Open your browser or use curl:

```bash
# Basic health check
curl http://localhost:3000/api/v1/health/websocket

# Connection statistics
curl http://localhost:3000/api/v1/health/websocket/stats

# Readiness probe
curl http://localhost:3000/api/v1/health/websocket/ready

# Liveness probe
curl http://localhost:3000/api/v1/health/websocket/live
```

### 3. Test WebSocket Connection

#### Option A: Using Browser Console

Open `http://localhost:3000/api/docs` (Swagger UI) in your browser, then open the browser console and paste:

```javascript
// Load Socket.IO client from CDN
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.7.0/socket.io.min.js';
script.onload = () => {
  // Connect (no token required in development)
  const socket = io('http://localhost:3000');

  socket.on('connect', () => {
    console.log('✅ Connected:', socket.id);
  });

  socket.on('connected', (data) => {
    console.log('✅ Welcome message:', data);
  });

  socket.on('heartbeat', (data) => {
    console.log('💓 Heartbeat:', data);
  });

  socket.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  // Subscribe to trading channel
  socket.emit('subscribe', { channel: 'trading' });

  socket.on('subscribed', (data) => {
    console.log('✅ Subscribed:', data);
  });

  // Test ping/pong
  socket.emit('ping');
  socket.on('pong', (data) => {
    console.log('🏓 Pong:', data);
  });

  // Get subscriptions
  socket.emit('get-subscriptions');
  socket.on('subscriptions', (data) => {
    console.log('📋 My subscriptions:', data);
  });

  // Store socket globally for testing
  window.testSocket = socket;
};
document.head.appendChild(script);
```

#### Option B: Using Node.js

Create a test file `test-websocket.js`:

```javascript
const { io } = require('socket.io-client');

const socket = io('http://localhost:3000', {
  // No token required in development
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  
  // Subscribe to channels
  socket.emit('subscribe', { channel: 'trading' });
  socket.emit('subscribe', { 
    channel: 'market-data', 
    symbols: ['BTC/USD', 'ETH/USD'] 
  });
});

socket.on('connected', (data) => {
  console.log('✅ Welcome:', data);
});

socket.on('subscribed', (data) => {
  console.log('✅ Subscribed to:', data.channel);
});

socket.on('heartbeat', (data) => {
  console.log('💓 Heartbeat at:', data.timestamp);
});

socket.on('pong', (data) => {
  console.log('🏓 Pong:', data);
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
});

// Test ping every 5 seconds
setInterval(() => {
  socket.emit('ping');
}, 5000);
```

Run it:
```bash
npm install socket.io-client
node test-websocket.js
```

### 4. Test Rate Limiting

Try sending more than 60 messages in 1 minute:

```javascript
// In browser console with testSocket
for (let i = 0; i < 70; i++) {
  testSocket.emit('ping');
}
// After 60 pings, you should see rate limit errors
```

### 5. Test Multiple Connections

Open multiple browser tabs and connect. Check the stats:

```bash
curl http://localhost:3000/api/v1/health/websocket/stats
```

You should see multiple connected clients.

## 📊 Expected Console Output

When the server starts, you should see:

```
🚀 TradeWithAI API running on http://localhost:3000
WebSocket Gateway initialized
```

When a client connects:

```
Client connected: abc123 (User: test-user-id)
Client abc123 joined room: user:test-user-id
```

Every 30 seconds (heartbeat):

```
Heartbeat: 1 clients connected
```

When a client subscribes:

```
Client abc123 subscribed to: trading
```

When a client disconnects:

```
Client disconnected: abc123 (User: test-user-id)
```

## 🔍 Verify Integration

Check that the module is loaded:

```bash
curl http://localhost:3000/api/v1/health/websocket
```

Expected response:
```json
{
  "status": "ok",
  "module": "WebSocketModule",
  "connectedClients": 0,
  "timestamp": "2025-10-29T..."
}
```

## 🎯 What's Next

### Story 3.2 - Trading Event Broadcasting
The next step is to integrate the WebSocket gateway with the Trading module to broadcast:
- Order status updates (pending → filled)
- Position P&L updates
- Balance changes
- Trade execution confirmations

### Story 3.3 - Market Data Streaming
Then integrate with Market Data module to stream:
- Ticker updates (price, volume)
- Order book changes
- Real-time market data to subscribed clients

### Story 3.4 - LLM Response Streaming
Finally, add streaming support for LLM responses:
- Token-by-token streaming
- Progress indicators
- Cancellation support

## 📚 Documentation

- **Full README**: `packages/server/src/modules/websocket/README.md`
- **Integration Guide**: `packages/server/src/modules/websocket/INTEGRATION_GUIDE.md`
- **Story Completion**: `packages/server/src/modules/websocket/STORY_3.1_COMPLETE.md`
- **Project Roadmap**: Updated with Story 3.1 completion

## 🎉 Success Criteria

All acceptance criteria from Story 3.1 are met:

- ✅ Create WebSocketGateway with Socket.IO
- ✅ Implement JWT authentication for WebSocket connections
- ✅ Add connection/disconnection event handlers
- ✅ Create room-based subscription system
- ✅ Add heartbeat/ping-pong for connection health
- ✅ Handle reconnection logic
- ✅ Add rate limiting per connection

**Story Status**: ✅ COMPLETE
**Build Status**: ✅ Compiles successfully
**Ready for**: Story 3.2 - Trading Event Broadcasting
