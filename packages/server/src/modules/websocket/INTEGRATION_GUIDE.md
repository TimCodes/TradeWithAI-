# WebSocket Module Integration Guide

This guide shows how to integrate the WebSocket module with other modules in the TradeWithAI platform.

## 📦 Module Structure

```
packages/server/src/modules/websocket/
├── websocket.gateway.ts         # Main Socket.IO gateway
├── websocket.module.ts          # Module configuration
├── guards/
│   └── ws-jwt.guard.ts         # JWT authentication guard
├── ws-exception.filter.ts      # Error handling
├── README.md                   # Usage documentation
├── INTEGRATION_GUIDE.md        # This file
└── STORY_3.1_COMPLETE.md       # Implementation notes
```

## 🔌 Integration Steps

### 1. Import WebsocketModule

Add WebsocketModule to any module that needs to send WebSocket messages:

```typescript
import { Module } from '@nestjs/common';
import { WebsocketModule } from '../websocket/websocket.module';
import { TradingService } from './trading.service';

@Module({
  imports: [
    WebsocketModule,  // ← Add this
  ],
  providers: [TradingService],
  exports: [TradingService],
})
export class TradingModule {}
```

### 2. Inject WebSocketGatewayService

Inject the gateway service into your service:

```typescript
import { Injectable } from '@nestjs/common';
import { WebSocketGatewayService } from '../websocket/websocket.gateway';

@Injectable()
export class TradingService {
  constructor(
    private readonly wsGateway: WebSocketGatewayService,
  ) {}
  
  // Use wsGateway methods here
}
```

## 📡 Integration Examples

### Trading Module Integration

**File**: `packages/server/src/modules/trading/services/trading.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { WebSocketGatewayService } from '../../websocket/websocket.gateway';
import { Order } from '../entities/order.entity';
import { Position } from '../entities/position.entity';

@Injectable()
export class TradingService {
  constructor(
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  async notifyOrderCreated(userId: string, order: Order) {
    // Send to specific user
    this.wsGateway.sendToUser(userId, 'order:created', {
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      price: order.price,
      size: order.size,
      status: order.status,
    });
  }

  async notifyOrderFilled(userId: string, order: Order) {
    // Send to user
    this.wsGateway.sendToUser(userId, 'order:filled', {
      orderId: order.id,
      symbol: order.symbol,
      filledPrice: order.filledPrice,
      filledAt: order.filledAt,
    });
    
    // Broadcast to all trading subscribers
    this.wsGateway.broadcastToRoom('trading', 'order:filled', {
      symbol: order.symbol,
      side: order.side,
      price: order.filledPrice,
    });
  }

  async notifyPositionUpdated(userId: string, position: Position) {
    this.wsGateway.sendToUser(userId, 'position:updated', {
      positionId: position.id,
      symbol: position.symbol,
      unrealizedPnl: position.unrealizedPnl,
      realizedPnl: position.realizedPnl,
      currentPrice: position.currentPrice,
    });
  }

  async notifyBalanceUpdated(userId: string, balance: number) {
    this.wsGateway.sendToUser(userId, 'balance:updated', {
      balance,
      currency: 'USD',
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Market Data Module Integration

**File**: `packages/server/src/modules/market-data/services/market-data.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocketGatewayService } from '../../websocket/websocket.gateway';
import WebSocket from 'ws';

@Injectable()
export class MarketDataService implements OnModuleInit {
  private wsGateway: WebSocketGatewayService;

  constructor() {}

  // Inject gateway after module initialization to avoid circular dependency
  onModuleInit() {
    // This will be properly injected in Story 3.3
  }

  private handleTickerUpdate(symbol: string, ticker: any) {
    if (!this.wsGateway) return;

    // Broadcast to all market-data subscribers
    this.wsGateway.broadcastToRoom('market-data', 'ticker:update', {
      symbol,
      last: ticker.last,
      bid: ticker.bid,
      ask: ticker.ask,
      volume: ticker.volume,
      timestamp: new Date().toISOString(),
    });
    
    // Broadcast to symbol-specific subscribers
    this.wsGateway.broadcastToRoom(
      `market-data:${symbol}`,
      'ticker:update',
      { symbol, ticker }
    );
  }

  private handleOrderBookUpdate(symbol: string, orderBook: any) {
    if (!this.wsGateway) return;

    this.wsGateway.broadcastToRoom(
      `market-data:${symbol}`,
      'orderbook:update',
      { symbol, orderBook }
    );
  }
}
```

### LLM Module Integration

**File**: `packages/server/src/modules/llm/llm.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { WebSocketGatewayService } from '../websocket/websocket.gateway';

@Injectable()
export class LLMService {
  constructor(
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  async streamResponse(
    userId: string,
    provider: string,
    prompt: string,
  ) {
    try {
      // Start stream
      this.wsGateway.sendToUser(userId, 'llm:stream:start', {
        provider,
        prompt,
      });

      // Get streaming response from provider
      const stream = await this.getProviderStream(provider, prompt);
      
      let fullResponse = '';
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        
        // Stream each chunk
        this.wsGateway.sendToUser(userId, 'llm:stream', {
          provider,
          chunk,
          fullResponse,
          done: false,
        });
      }

      // Stream complete
      this.wsGateway.sendToUser(userId, 'llm:stream', {
        provider,
        chunk: null,
        fullResponse,
        done: true,
      });
      
      return fullResponse;
    } catch (error) {
      this.wsGateway.sendToUser(userId, 'llm:stream:error', {
        provider,
        error: error.message,
      });
      throw error;
    }
  }

  private async getProviderStream(provider: string, prompt: string) {
    // Implementation depends on provider
    // Return async generator/stream
  }
}
```

## 🎯 Event Naming Conventions

Use consistent event names across the platform:

### Trading Events
- `order:created` - New order placed
- `order:submitted` - Order sent to exchange
- `order:filled` - Order fully filled
- `order:partially-filled` - Order partially filled
- `order:cancelled` - Order cancelled
- `order:rejected` - Order rejected by exchange
- `position:opened` - New position opened
- `position:updated` - Position updated (P&L change)
- `position:closed` - Position closed
- `balance:updated` - Account balance changed

### Market Data Events
- `ticker:update` - Price/ticker update
- `orderbook:update` - Order book depth update
- `trade:executed` - Trade execution (public)
- `candle:update` - OHLCV candle update

### LLM Events
- `llm:stream:start` - LLM response started
- `llm:stream` - LLM token/chunk
- `llm:stream:error` - LLM error occurred
- `llm:response:complete` - Full response received

## 🔄 Broadcasting Strategies

### 1. User-Specific Messages

For personal notifications (order fills, balance updates):

```typescript
this.wsGateway.sendToUser(userId, 'order:filled', data);
```

### 2. Room-Based Broadcasting

For public data (market prices, global events):

```typescript
this.wsGateway.broadcastToRoom('market-data', 'ticker:update', data);
```

### 3. Symbol-Specific Broadcasting

For users subscribed to specific symbols:

```typescript
this.wsGateway.broadcastToRoom(
  `market-data:${symbol}`,
  'ticker:update',
  data
);
```

### 4. Combined Approach

Send to both user and public channels:

```typescript
// Private notification
this.wsGateway.sendToUser(userId, 'order:filled', detailedData);

// Public notification (anonymized)
this.wsGateway.broadcastToRoom('trading', 'order:filled', {
  symbol: data.symbol,
  side: data.side,
  price: data.price,
  // Exclude user-specific data
});
```

## 🧪 Testing Integration

### Mock WebSocket Gateway for Unit Tests

```typescript
// test/mocks/websocket-gateway.mock.ts
export class MockWebSocketGateway {
  sendToUser = jest.fn();
  broadcastToRoom = jest.fn();
  getStats = jest.fn().mockReturnValue({
    connectedClients: 0,
    totalSubscriptions: 0,
    clients: [],
  });
}
```

### Use Mock in Tests

```typescript
import { Test } from '@nestjs/testing';
import { TradingService } from './trading.service';
import { WebSocketGatewayService } from '../websocket/websocket.gateway';
import { MockWebSocketGateway } from '../../test/mocks/websocket-gateway.mock';

describe('TradingService', () => {
  let service: TradingService;
  let wsGateway: MockWebSocketGateway;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TradingService,
        {
          provide: WebSocketGatewayService,
          useClass: MockWebSocketGateway,
        },
      ],
    }).compile();

    service = module.get<TradingService>(TradingService);
    wsGateway = module.get(WebSocketGatewayService);
  });

  it('should notify order filled', async () => {
    const userId = 'user-123';
    const order = { id: 'order-1', symbol: 'BTC/USD' };

    await service.notifyOrderFilled(userId, order);

    expect(wsGateway.sendToUser).toHaveBeenCalledWith(
      userId,
      'order:filled',
      expect.objectContaining({ orderId: 'order-1' })
    );
  });
});
```

## 🚀 Best Practices

### 1. Error Handling

Always wrap WebSocket calls in try-catch:

```typescript
try {
  this.wsGateway.sendToUser(userId, 'order:filled', data);
} catch (error) {
  this.logger.error('Failed to send WebSocket message', error);
  // Don't fail the operation if WebSocket fails
}
```

### 2. Data Sanitization

Never send sensitive data in broadcasts:

```typescript
// ❌ Bad - exposes API keys
this.wsGateway.broadcastToRoom('trading', 'order:filled', order);

// ✅ Good - only public data
this.wsGateway.broadcastToRoom('trading', 'order:filled', {
  symbol: order.symbol,
  side: order.side,
  price: order.filledPrice,
  // No user info, no API keys
});
```

### 3. Throttling High-Frequency Updates

For very frequent updates (order book ticks), throttle:

```typescript
import { throttle } from 'lodash';

class MarketDataService {
  private broadcastThrottled = throttle(
    (room, event, data) => this.wsGateway.broadcastToRoom(room, event, data),
    100, // Max once per 100ms
    { trailing: true }
  );

  private handleOrderBookUpdate(symbol: string, orderBook: any) {
    this.broadcastThrottled(
      `market-data:${symbol}`,
      'orderbook:update',
      { symbol, orderBook }
    );
  }
}
```

### 4. Graceful Degradation

Services should work even if WebSocket gateway is unavailable:

```typescript
async notifyOrderFilled(userId: string, order: Order) {
  // Always persist to database first
  await this.orderRepository.save(order);
  
  // Then try to send WebSocket notification
  try {
    if (this.wsGateway) {
      this.wsGateway.sendToUser(userId, 'order:filled', order);
    }
  } catch (error) {
    this.logger.warn('Failed to send WebSocket notification', error);
    // Don't throw - operation succeeded even without notification
  }
}
```

## 📚 Next Steps

### Story 3.2 - Trading Event Broadcasting
Integrate WebSocket gateway with TradingService to broadcast order and position updates.

### Story 3.3 - Market Data Streaming
Integrate WebSocket gateway with MarketDataService to stream ticker and order book updates.

### Story 3.4 - LLM Response Streaming
Integrate WebSocket gateway with LLMService to stream chat responses.

## 📖 Resources

- [WebSocket Module README](./README.md)
- [Story 3.1 Implementation Notes](./STORY_3.1_COMPLETE.md)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [NestJS WebSocket Guide](https://docs.nestjs.com/websockets/gateways)
