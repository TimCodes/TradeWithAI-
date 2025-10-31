import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebSocketGatewayService } from './websocket.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { WebSocketHealthController } from './controllers/health.controller';
import { TradingEventsHandler } from './events/trading.events';

/**
 * WebSocket Module
 * 
 * Provides real-time bidirectional communication using Socket.IO.
 * 
 * Features:
 * - JWT authentication for WebSocket connections
 * - Room-based subscription system for targeted broadcasts
 * - Heartbeat mechanism for connection health monitoring
 * - Rate limiting per connection
 * - Graceful error handling
 * 
 * Usage in other modules:
 * 
 * 1. Import WebSocketModule
 * 2. Inject WebSocketGatewayService
 * 3. Use broadcastToRoom() or sendToUser() methods
 * 
 * Example:
 * ```typescript
 * @Injectable()
 * export class TradingService {
 *   constructor(private wsGateway: WebSocketGatewayService) {}
 * 
 *   async notifyOrderFilled(userId: string, order: Order) {
 *     this.wsGateway.sendToUser(userId, 'order:filled', order);
 *   }
 * 
 *   async broadcastPriceUpdate(symbol: string, price: number) {
 *     this.wsGateway.broadcastToRoom(
 *       `market-data:${symbol}`,
 *       'price:update',
 *       { symbol, price }
 *     );
 *   }
 * }
 * ```
 * 
 * Available Rooms/Channels:
 * - `user:{userId}` - User-specific messages
 * - `trading` - All trading events
 * - `market-data` - All market data updates
 * - `market-data:{symbol}` - Symbol-specific market data
 * - `llm` - LLM streaming responses
 * 
 * Client Connection:
 * ```typescript
 * import { io } from 'socket.io-client';
 * 
 * const socket = io('http://localhost:3000', {
 *   auth: {
 *     token: 'your-jwt-token'
 *   }
 * });
 * 
 * // Subscribe to market data
 * socket.emit('subscribe', {
 *   channel: 'market-data',
 *   symbols: ['BTC/USD', 'ETH/USD']
 * });
 * 
 * // Listen for price updates
 * socket.on('price:update', (data) => {
 *   console.log('Price update:', data);
 * });
 * ```
 */
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use this instance for WebSocket events
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'your-super-secret-jwt-key-change-in-production',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WebSocketHealthController],
  providers: [
    WebSocketGatewayService,
    WsJwtGuard,
    TradingEventsHandler,
  ],
  exports: [WebSocketGatewayService],
})
export class WebsocketModule {}
