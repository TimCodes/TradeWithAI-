import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters, UseGuards, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsExceptionFilter } from './ws-exception.filter';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { MarketDataEventsHandler } from './events/market-data.events';
import { LLMEventsHandler } from './events/llm.events';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

interface SubscribePayload {
  channel: string;
  symbols?: string[];
}

/**
 * WebSocket Gateway for Real-Time Communication
 * 
 * Provides bidirectional communication between client and server using Socket.IO.
 * Features:
 * - JWT authentication for connections
 * - Room-based subscription system
 * - Heartbeat/ping-pong for connection health
 * - Rate limiting per connection
 * - Graceful reconnection handling
 * 
 * Events:
 * - connection: Client connects
 * - disconnect: Client disconnects
 * - subscribe: Subscribe to data channels
 * - unsubscribe: Unsubscribe from channels
 * - ping: Heartbeat check
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
@UseFilters(WsExceptionFilter)
export class WebSocketGatewayService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayService.name);
  
  // Track connected clients
  private connectedClients = new Map<string, AuthenticatedSocket>();
  
  // Track client subscriptions
  private clientSubscriptions = new Map<string, Set<string>>();
  
  // Rate limiting: Track message counts per client
  private messageRateLimits = new Map<string, { count: number; resetTime: number }>();
  private readonly maxMessagesPerMinute = 60;
  
  // Heartbeat interval (30 seconds)
  private heartbeatInterval: NodeJS.Timeout;
  private readonly heartbeatIntervalMs = 30000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly marketDataEventsHandler: MarketDataEventsHandler,
    private readonly llmEventsHandler: LLMEventsHandler,
  ) {}

  /**
   * Initialize gateway after server starts
   */
  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // Start heartbeat mechanism
    this.startHeartbeat();
    
    // Configure Socket.IO middleware for authentication
    server.use(async (socket: AuthenticatedSocket, next) => {
      try {
        // Extract token from handshake auth or query
        const token = 
          socket.handshake.auth?.token || 
          socket.handshake.query?.token;

        if (!token) {
          // For development: allow unauthenticated connections with test user
          if (process.env.NODE_ENV === 'development') {
            socket.userId = 'test-user-id';
            socket.email = 'test@example.com';
            this.logger.warn(`Development mode: Allowing unauthenticated connection`);
            return next();
          }
          
          return next(new Error('Authentication token missing'));
        }

        // Verify JWT token
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        });

        // Attach user info to socket
        socket.userId = payload.sub || payload.userId;
        socket.email = payload.email;

        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Authentication failed: ${errorMessage}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Module initialization
   * Start market data streaming
   */
  onModuleInit() {
    this.logger.log('WebSocket module initialized - Starting market data streaming');
    this.marketDataEventsHandler.startStreaming();
    
    // Set gateway reference for LLM events handler
    this.llmEventsHandler.setWebSocketGateway(this);
  }

  /**
   * Module cleanup
   * Stop market data streaming and heartbeat
   */
  onModuleDestroy() {
    this.logger.log('WebSocket module shutting down - Stopping market data streaming');
    this.marketDataEventsHandler.stopStreaming();
    this.llmEventsHandler.cancelAllStreams();
    this.stopHeartbeat();
  }

  /**
   * Handle client connection
   */
  async handleConnection(client: AuthenticatedSocket) {
    const clientId = client.id;
    const userId = client.userId;

    this.logger.log(`Client connected: ${clientId} (User: ${userId})`);

    // Store client reference
    this.connectedClients.set(clientId, client);
    
    // Initialize subscriptions for this client
    this.clientSubscriptions.set(clientId, new Set());

    // Join user-specific room for targeted messages
    if (userId) {
      client.join(`user:${userId}`);
      this.logger.debug(`Client ${clientId} joined room: user:${userId}`);
    }

    // Send welcome message
    client.emit('connected', {
      message: 'Connected to TradeWithAI WebSocket',
      clientId,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Emit connection count to all clients
    this.broadcastConnectionCount();
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    const clientId = client.id;
    const userId = client.userId;

    this.logger.log(`Client disconnected: ${clientId} (User: ${userId})`);

    // Clean up client data
    this.connectedClients.delete(clientId);
    this.clientSubscriptions.delete(clientId);
    this.messageRateLimits.delete(clientId);

    // Emit connection count to remaining clients
    this.broadcastConnectionCount();
  }

  /**
   * Handle subscription to data channels
   * Clients can subscribe to: trading, market-data, llm
   */
  @SubscribeMessage('subscribe')
  @UseGuards(WsJwtGuard)
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SubscribePayload,
  ) {
    if (!this.checkRateLimit(client.id)) {
      client.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { channel, symbols } = payload;
    
    if (!channel) {
      client.emit('error', { message: 'Channel name required' });
      return;
    }

    // Validate channel
    const validChannels = ['trading', 'market-data', 'llm'];
    if (!validChannels.includes(channel)) {
      client.emit('error', { 
        message: `Invalid channel. Valid channels: ${validChannels.join(', ')}` 
      });
      return;
    }

    // Handle market data subscriptions with dynamic symbol subscription
    if (channel === 'market-data' && symbols && symbols.length > 0) {
      this.marketDataEventsHandler.handleSymbolSubscription(symbols);
      
      // Join room for each symbol
      symbols.forEach((symbol) => {
        const symbolRoom = `market-data:${symbol}`;
        client.join(symbolRoom);
        
        // Track subscription
        const clientSubs = this.clientSubscriptions.get(client.id);
        if (clientSubs) {
          clientSubs.add(symbolRoom);
        }
      });
      
      this.logger.debug(`Client ${client.id} subscribed to market-data for symbols: ${symbols.join(', ')}`);
      
      client.emit('subscribed', {
        channel,
        symbols,
        rooms: symbols.map((s) => `market-data:${s}`),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Join channel room
    const roomName = symbols && symbols.length > 0
      ? `${channel}:${symbols.join(',')}`
      : channel;
    
    client.join(roomName);
    
    // Track subscription
    const clientSubs = this.clientSubscriptions.get(client.id);
    if (clientSubs) {
      clientSubs.add(roomName);
    }

    this.logger.debug(`Client ${client.id} subscribed to: ${roomName}`);

    client.emit('subscribed', {
      channel,
      symbols,
      room: roomName,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle unsubscription from data channels
   */
  @SubscribeMessage('unsubscribe')
  @UseGuards(WsJwtGuard)
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SubscribePayload,
  ) {
    if (!this.checkRateLimit(client.id)) {
      client.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { channel, symbols } = payload;

    if (!channel) {
      client.emit('error', { message: 'Channel name required' });
      return;
    }

    // Handle market data unsubscriptions
    if (channel === 'market-data' && symbols && symbols.length > 0) {
      // Leave room for each symbol
      symbols.forEach((symbol) => {
        const symbolRoom = `market-data:${symbol}`;
        client.leave(symbolRoom);
        
        // Update subscriptions
        const clientSubs = this.clientSubscriptions.get(client.id);
        if (clientSubs) {
          clientSubs.delete(symbolRoom);
        }
      });
      
      // Check if we should unsubscribe from Kraken
      this.marketDataEventsHandler.handleSymbolUnsubscription(symbols);
      
      this.logger.debug(`Client ${client.id} unsubscribed from market-data for symbols: ${symbols.join(', ')}`);
      
      client.emit('unsubscribed', {
        channel,
        symbols,
        rooms: symbols.map((s) => `market-data:${s}`),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Leave channel room
    const roomName = symbols && symbols.length > 0
      ? `${channel}:${symbols.join(',')}`
      : channel;
    
    client.leave(roomName);
    
    // Update subscriptions
    const clientSubs = this.clientSubscriptions.get(client.id);
    if (clientSubs) {
      clientSubs.delete(roomName);
    }

    this.logger.debug(`Client ${client.id} unsubscribed from: ${roomName}`);

    client.emit('unsubscribed', {
      channel,
      symbols,
      room: roomName,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle ping/pong for connection health
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * Handle LLM chat stream request
   */
  @SubscribeMessage('llm:chat:stream')
  @UseGuards(WsJwtGuard)
  async handleLLMChatStream(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: {
      sessionId: string;
      provider: string;
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    },
  ) {
    if (!this.checkRateLimit(client.id)) {
      client.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { sessionId, provider, messages } = payload;

    if (!sessionId || !provider || !messages) {
      client.emit('error', { 
        message: 'sessionId, provider, and messages are required' 
      });
      return;
    }

    // Start streaming (non-blocking)
    this.llmEventsHandler
      .streamChatResponse(client.id, sessionId, provider, messages)
      .catch((error) => {
        this.logger.error(`LLM stream failed: ${error.message}`);
      });

    // Acknowledge request
    client.emit('llm:chat:stream:acknowledged', {
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle LLM stream cancellation
   */
  @SubscribeMessage('llm:stream:cancel')
  @UseGuards(WsJwtGuard)
  handleLLMStreamCancel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { sessionId: string },
  ) {
    if (!this.checkRateLimit(client.id)) {
      client.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { sessionId } = payload;

    if (!sessionId) {
      client.emit('error', { message: 'sessionId is required' });
      return;
    }

    const cancelled = this.llmEventsHandler.cancelStream(sessionId);
    
    client.emit('llm:stream:cancel:acknowledged', {
      sessionId,
      cancelled,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get list of active subscriptions for a client
   */
  @SubscribeMessage('get-subscriptions')
  @UseGuards(WsJwtGuard)
  handleGetSubscriptions(@ConnectedSocket() client: AuthenticatedSocket) {
    const subscriptions = Array.from(
      this.clientSubscriptions.get(client.id) || []
    );

    client.emit('subscriptions', {
      subscriptions,
      count: subscriptions.length,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast message to specific room
   */
  broadcastToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send message to specific client by socket ID
   */
  sendToClient(clientId: string, event: string, data: any) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.logger.warn(`Attempted to send to non-existent client: ${clientId}`);
    }
  }

  /**
   * Broadcast connection count to all clients
   */
  private broadcastConnectionCount() {
    const count = this.connectedClients.size;
    this.server.emit('connection-count', {
      count,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start heartbeat mechanism
   * Pings all connected clients every 30 seconds
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const count = this.connectedClients.size;
      this.logger.debug(`Heartbeat: ${count} clients connected`);
      
      // Send ping to all clients
      this.server.emit('heartbeat', {
        timestamp: new Date().toISOString(),
      });
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat mechanism (called on shutdown)
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  /**
   * Rate limiting check
   * Limits clients to maxMessagesPerMinute per minute
   */
  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const limit = this.messageRateLimits.get(clientId);

    if (!limit || now > limit.resetTime) {
      // Reset counter
      this.messageRateLimits.set(clientId, {
        count: 1,
        resetTime: now + 60000, // 1 minute from now
      });
      return true;
    }

    if (limit.count >= this.maxMessagesPerMinute) {
      this.logger.warn(`Rate limit exceeded for client: ${clientId}`);
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      totalSubscriptions: Array.from(this.clientSubscriptions.values())
        .reduce((sum, subs) => sum + subs.size, 0),
      clients: Array.from(this.connectedClients.values()).map(client => ({
        id: client.id,
        userId: client.userId,
        email: client.email,
        subscriptions: Array.from(this.clientSubscriptions.get(client.id) || []),
      })),
      marketDataStreaming: this.marketDataEventsHandler.getStats(),
      activeLLMStreams: this.llmEventsHandler.getActiveStreamCount(),
    };
  }
}
