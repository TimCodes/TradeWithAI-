import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGatewayService } from '../websocket.gateway';
import { MarketDataService } from '../../market-data/services/market-data.service';
import { TickerDataDto, OrderBookDto } from '../../market-data/dto/market-data.dto';

/**
 * Market Data Events Handler for WebSocket Broadcasting
 * 
 * Streams real-time market data from Kraken WebSocket to connected clients.
 * Implements throttling to prevent overwhelming clients with high-frequency updates.
 * 
 * Features:
 * - Ticker updates streaming (price, volume, bid/ask)
 * - Order book depth streaming (bids/asks)
 * - Dynamic symbol subscription/unsubscription
 * - Throttled updates (configurable per data type)
 * - Automatic cleanup on module destroy
 * 
 * Client subscription:
 * ```typescript
 * // Subscribe to specific symbols
 * socket.emit('subscribe', {
 *   channel: 'market-data',
 *   symbols: ['BTC/USD', 'ETH/USD']
 * });
 * 
 * // Listen for ticker updates
 * socket.on('ticker:update', (data) => {
 *   console.log('Price update:', data.ticker);
 * });
 * 
 * // Listen for order book updates
 * socket.on('orderbook:update', (data) => {
 *   console.log('Order book:', data.orderBook);
 * });
 * ```
 */
@Injectable()
export class MarketDataEventsHandler {
  private readonly logger = new Logger(MarketDataEventsHandler.name);
  
  // Streaming intervals
  private tickerInterval: NodeJS.Timeout | null = null;
  private orderBookInterval: NodeJS.Timeout | null = null;
  
  // Throttling configuration (in milliseconds)
  private readonly tickerUpdateInterval = 1000; // 1 second
  private readonly orderBookUpdateInterval = 500; // 500ms
  
  // Track active symbol subscriptions across all clients
  private subscribedSymbols = new Set<string>();
  
  // Last sent data to prevent duplicate sends
  private lastTickerData = new Map<string, { data: TickerDataDto; timestamp: number }>();
  private lastOrderBookData = new Map<string, { data: OrderBookDto; timestamp: number }>();

  constructor(
    private readonly wsGateway: WebSocketGatewayService,
    private readonly marketDataService: MarketDataService,
  ) {}

  /**
   * Start streaming market data
   * Called when module initializes
   */
  startStreaming() {
    this.logger.log('Starting market data streaming...');
    
    // Start ticker streaming
    this.tickerInterval = setInterval(() => {
      this.streamTickerUpdates();
    }, this.tickerUpdateInterval);
    
    // Start order book streaming
    this.orderBookInterval = setInterval(() => {
      this.streamOrderBookUpdates();
    }, this.orderBookUpdateInterval);
    
    this.logger.log('Market data streaming started');
  }

  /**
   * Stop streaming market data
   * Called when module is destroyed
   */
  stopStreaming() {
    this.logger.log('Stopping market data streaming...');
    
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
    
    if (this.orderBookInterval) {
      clearInterval(this.orderBookInterval);
      this.orderBookInterval = null;
    }
    
    this.logger.log('Market data streaming stopped');
  }

  /**
   * Stream ticker updates to subscribed clients
   */
  private streamTickerUpdates() {
    try {
      // Get all tickers from cache
      const tickers = this.marketDataService.getAllTickers();
      
      if (tickers.length === 0) {
        return;
      }
      
      tickers.forEach((ticker) => {
        // Check if data has changed since last send
        const lastSent = this.lastTickerData.get(ticker.symbol);
        if (lastSent && this.isTickerDataEqual(lastSent.data, ticker)) {
          return; // No change, skip
        }
        
        // Broadcast to all clients subscribed to this symbol
        const room = `market-data:${ticker.symbol}`;
        this.wsGateway.broadcastToRoom(room, 'ticker:update', {
          ticker: this.serializeTicker(ticker),
        });
        
        // Also broadcast to general market-data room
        this.wsGateway.broadcastToRoom('market-data', 'ticker:update', {
          ticker: this.serializeTicker(ticker),
        });
        
        // Update last sent data
        this.lastTickerData.set(ticker.symbol, {
          data: ticker,
          timestamp: Date.now(),
        });
        
        this.logger.debug(`Streamed ticker update for ${ticker.symbol}: $${ticker.price}`);
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error streaming ticker updates: ${err.message}`, err.stack);
    }
  }

  /**
   * Stream order book updates to subscribed clients
   */
  private streamOrderBookUpdates() {
    try {
      // Stream order books for subscribed symbols
      this.subscribedSymbols.forEach((symbol) => {
        const orderBook = this.marketDataService.getOrderBook(symbol);
        
        if (!orderBook) {
          return;
        }
        
        // Check if data has changed since last send
        const lastSent = this.lastOrderBookData.get(symbol);
        if (lastSent && this.isOrderBookDataEqual(lastSent.data, orderBook)) {
          return; // No change, skip
        }
        
        // Broadcast to clients subscribed to this symbol
        const room = `market-data:${symbol}`;
        this.wsGateway.broadcastToRoom(room, 'orderbook:update', {
          orderBook: this.serializeOrderBook(orderBook),
        });
        
        // Also broadcast to general market-data room
        this.wsGateway.broadcastToRoom('market-data', 'orderbook:update', {
          orderBook: this.serializeOrderBook(orderBook),
        });
        
        // Update last sent data
        this.lastOrderBookData.set(symbol, {
          data: orderBook,
          timestamp: Date.now(),
        });
        
        this.logger.debug(`Streamed order book update for ${symbol}`);
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error streaming order book updates: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle dynamic symbol subscription
   * Called when a client subscribes to market data for specific symbols
   */
  handleSymbolSubscription(symbols: string[]) {
    symbols.forEach((symbol) => {
      if (!this.subscribedSymbols.has(symbol)) {
        this.logger.log(`New subscription for ${symbol}, subscribing to Kraken...`);
        
        // Subscribe to Kraken WebSocket for this symbol
        this.marketDataService.subscribeTicker(symbol);
        this.marketDataService.subscribeOrderBook(symbol);
        
        this.subscribedSymbols.add(symbol);
      }
    });
  }

  /**
   * Handle dynamic symbol unsubscription
   * Called when a client unsubscribes from market data
   */
  handleSymbolUnsubscription(symbols: string[]) {
    symbols.forEach((symbol) => {
      // Check if any other clients are still subscribed
      const room = `market-data:${symbol}`;
      const clientsInRoom = this.wsGateway.server.sockets.adapter.rooms.get(room);
      
      if (!clientsInRoom || clientsInRoom.size === 0) {
        this.logger.log(`No more subscribers for ${symbol}, unsubscribing from Kraken...`);
        
        // Unsubscribe from Kraken WebSocket
        this.marketDataService.unsubscribeTicker(symbol);
        this.marketDataService.unsubscribeOrderBook(symbol);
        
        this.subscribedSymbols.delete(symbol);
        this.lastTickerData.delete(symbol);
        this.lastOrderBookData.delete(symbol);
      }
    });
  }

  /**
   * Compare ticker data to check for changes
   */
  private isTickerDataEqual(a: TickerDataDto, b: TickerDataDto): boolean {
    return (
      a.price === b.price &&
      a.bid === b.bid &&
      a.ask === b.ask &&
      a.volume24h === b.volume24h
    );
  }

  /**
   * Compare order book data to check for changes
   */
  private isOrderBookDataEqual(a: OrderBookDto, b: OrderBookDto): boolean {
    // Compare top 3 bids and asks (shallow comparison for performance)
    if (a.bids.length !== b.bids.length || a.asks.length !== b.asks.length) {
      return false;
    }
    
    for (let i = 0; i < Math.min(3, a.bids.length); i++) {
      if (
        a.bids[i].price !== b.bids[i].price ||
        a.bids[i].size !== b.bids[i].size
      ) {
        return false;
      }
    }
    
    for (let i = 0; i < Math.min(3, a.asks.length); i++) {
      if (
        a.asks[i].price !== b.asks[i].price ||
        a.asks[i].size !== b.asks[i].size
      ) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Serialize ticker data for transmission
   */
  private serializeTicker(ticker: TickerDataDto) {
    return {
      symbol: ticker.symbol,
      price: ticker.price,
      bid: ticker.bid,
      ask: ticker.ask,
      volume24h: ticker.volume24h,
      change24h: ticker.change24h,
      high24h: ticker.high24h,
      low24h: ticker.low24h,
      timestamp: ticker.timestamp.toISOString(),
    };
  }

  /**
   * Serialize order book data for transmission
   */
  private serializeOrderBook(orderBook: OrderBookDto) {
    return {
      symbol: orderBook.symbol,
      bids: orderBook.bids.map((bid) => ({
        price: bid.price,
        size: bid.size,
        total: bid.total,
      })),
      asks: orderBook.asks.map((ask) => ({
        price: ask.price,
        size: ask.size,
        total: ask.total,
      })),
      timestamp: orderBook.timestamp.toISOString(),
    };
  }

  /**
   * Get streaming statistics
   */
  getStats() {
    return {
      subscribedSymbols: Array.from(this.subscribedSymbols),
      subscribedSymbolsCount: this.subscribedSymbols.size,
      cachedTickers: this.lastTickerData.size,
      cachedOrderBooks: this.lastOrderBookData.size,
      tickerUpdateInterval: this.tickerUpdateInterval,
      orderBookUpdateInterval: this.orderBookUpdateInterval,
    };
  }
}
