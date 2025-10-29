import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import WebSocket from 'ws';
import axios from 'axios';
import { OHLCVEntity } from '../entities/ohlcv.entity';
import {
  TickerDataDto,
  OrderBookDto,
  OHLCVDto,
  Timeframe,
} from '../dto/market-data.dto';

interface KrakenTickerMessage {
  c: string[]; // Close price
  a: string[]; // Ask [price, wholeLotVolume, lotVolume]
  b: string[]; // Bid [price, wholeLotVolume, lotVolume]
  v: string[]; // Volume [today, last 24 hours]
  p: string[]; // Volume weighted average price [today, last 24 hours]
  t: number[]; // Number of trades [today, last 24 hours]
  l: string[]; // Low [today, last 24 hours]
  h: string[]; // High [today, last 24 hours]
  o: string[]; // Open [today, last 24 hours]
}

interface KrakenOrderBookMessage {
  as?: string[][]; // Asks [price, volume, timestamp]
  bs?: string[][]; // Bids [price, volume, timestamp]
  a?: string[][]; // Ask updates
  b?: string[][]; // Bid updates
}

@Injectable()
export class MarketDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketDataService.name);
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 1000; // 1 second
  private readonly maxReconnectDelay = 60000; // 60 seconds
  private isConnected = false;
  private subscriptions = new Map<string, Set<string>>(); // symbol -> Set<dataType>
  
  // In-memory cache for latest data
  private tickerCache = new Map<string, TickerDataDto>();
  private orderBookCache = new Map<string, OrderBookDto>();
  
  // Cache for historical OHLCV data (key: symbol:timeframe:start:end)
  private ohlcvCache = new Map<string, { data: OHLCVDto[]; timestamp: number }>();
  private readonly cacheTTL = 60000; // 60 seconds cache TTL
  
  // Kraken REST API configuration
  private readonly krakenRestUrl = 'https://api.kraken.com/0/public';
  private readonly krakenRateLimit = 1000; // 1 request per second for public API

  constructor(
    @InjectRepository(OHLCVEntity)
    private readonly ohlcvRepository: Repository<OHLCVEntity>,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Market Data Service...');
    await this.connect();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Market Data Service...');
    this.disconnect();
  }

  /**
   * Connect to Kraken WebSocket API
   */
  private async connect(): Promise<void> {
    try {
      this.logger.log('Connecting to Kraken WebSocket...');
      
      this.ws = new WebSocket('wss://ws.kraken.com');

      this.ws.on('open', () => {
        this.logger.log('Connected to Kraken WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Set up ping interval to keep connection alive
        this.setupPingInterval();
        
        // Re-subscribe to all previous subscriptions
        this.resubscribeAll();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error: Error) => {
        this.logger.error(`WebSocket error: ${error.message}`, error.stack);
      });

      this.ws.on('close', () => {
        this.logger.warn('WebSocket connection closed');
        this.isConnected = false;
        this.clearPingInterval();
        this.handleReconnect();
      });

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to connect: ${err.message}`, err.stack);
      this.handleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  private disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.clearPingInterval();

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );

    this.reconnectAttempts++;
    this.logger.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Set up ping interval to keep connection alive
   */
  private setupPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Clear ping interval
   */
  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Re-subscribe to all previous subscriptions after reconnection
   */
  private resubscribeAll(): void {
    if (this.subscriptions.size === 0) {
      // Subscribe to default pairs if no subscriptions
      this.subscribeTicker('XBT/USD'); // Bitcoin
      this.subscribeTicker('ETH/USD'); // Ethereum
      this.subscribeOrderBook('XBT/USD');
      this.subscribeOrderBook('ETH/USD');
    } else {
      this.subscriptions.forEach((types, symbol) => {
        types.forEach((type) => {
          if (type === 'ticker') {
            this.subscribeTicker(symbol);
          } else if (type === 'orderbook') {
            this.subscribeOrderBook(symbol);
          }
        });
      });
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      // Handle system messages
      if (message.event) {
        if (message.event === 'pong') {
          // Connection is healthy
          return;
        }
        if (message.event === 'systemStatus') {
          this.logger.log(`System status: ${message.status}`);
          return;
        }
        if (message.event === 'subscriptionStatus') {
          this.logger.log(`Subscription status: ${message.status} - ${message.channelName} - ${message.pair}`);
          return;
        }
        if (message.event === 'heartbeat') {
          return;
        }
      }

      // Handle data messages (arrays)
      if (Array.isArray(message)) {
        const channelName = message[message.length - 2];
        const pair = message[message.length - 1];

        if (channelName === 'ticker') {
          this.handleTickerData(pair, message[1]);
        } else if (channelName === 'book-10' || channelName === 'book-25') {
          this.handleOrderBookData(pair, message[1]);
        }
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error parsing WebSocket message: ${err.message}`);
    }
  }

  /**
   * Handle ticker data updates
   */
  private handleTickerData(pair: string, data: KrakenTickerMessage): void {
    try {
      const symbol = this.normalizeSymbol(pair);
      
      const ticker: TickerDataDto = {
        symbol,
        price: parseFloat(data.c[0]),
        bid: parseFloat(data.b[0]),
        ask: parseFloat(data.a[0]),
        volume24h: parseFloat(data.v[1]),
        change24h: ((parseFloat(data.c[0]) - parseFloat(data.o[0])) / parseFloat(data.o[0])) * 100,
        high24h: parseFloat(data.h[1]),
        low24h: parseFloat(data.l[1]),
        timestamp: new Date(),
      };

      this.tickerCache.set(symbol, ticker);
      this.logger.debug(`Ticker update for ${symbol}: ${ticker.price}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling ticker data: ${err.message}`);
    }
  }

  /**
   * Handle order book data updates
   */
  private handleOrderBookData(pair: string, data: KrakenOrderBookMessage): void {
    try {
      const symbol = this.normalizeSymbol(pair);
      
      // Get or create order book
      let orderBook = this.orderBookCache.get(symbol);
      if (!orderBook) {
        orderBook = {
          symbol,
          bids: [],
          asks: [],
          timestamp: new Date(),
        };
      }

      // Update bids
      if (data.bs || data.b) {
        const bids = data.bs || data.b;
        orderBook.bids = bids.map((bid, index) => ({
          price: parseFloat(bid[0]),
          size: parseFloat(bid[1]),
          total: bids.slice(0, index + 1).reduce((sum, b) => sum + parseFloat(b[1]), 0),
        })).sort((a, b) => b.price - a.price).slice(0, 15);
      }

      // Update asks
      if (data.as || data.a) {
        const asks = data.as || data.a;
        orderBook.asks = asks.map((ask, index) => ({
          price: parseFloat(ask[0]),
          size: parseFloat(ask[1]),
          total: asks.slice(0, index + 1).reduce((sum, a) => sum + parseFloat(a[1]), 0),
        })).sort((a, b) => a.price - b.price).slice(0, 15);
      }

      orderBook.timestamp = new Date();
      this.orderBookCache.set(symbol, orderBook);
      this.logger.debug(`OrderBook update for ${symbol}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error handling order book data: ${err.message}`);
    }
  }

  /**
   * Subscribe to ticker data for a symbol
   */
  subscribeTicker(symbol: string): void {
    const krakenPair = this.toKrakenSymbol(symbol);
    
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set());
    }
    this.subscriptions.get(symbol).add('ticker');

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscription = {
        event: 'subscribe',
        pair: [krakenPair],
        subscription: { name: 'ticker' },
      };
      this.ws.send(JSON.stringify(subscription));
      this.logger.log(`Subscribed to ticker for ${symbol} (${krakenPair})`);
    }
  }

  /**
   * Subscribe to order book data for a symbol
   */
  subscribeOrderBook(symbol: string, depth: 10 | 25 = 10): void {
    const krakenPair = this.toKrakenSymbol(symbol);
    
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set());
    }
    this.subscriptions.get(symbol).add('orderbook');

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscription = {
        event: 'subscribe',
        pair: [krakenPair],
        subscription: { name: `book`, depth },
      };
      this.ws.send(JSON.stringify(subscription));
      this.logger.log(`Subscribed to order book (depth ${depth}) for ${symbol} (${krakenPair})`);
    }
  }

  /**
   * Unsubscribe from ticker data
   */
  unsubscribeTicker(symbol: string): void {
    const krakenPair = this.toKrakenSymbol(symbol);
    
    if (this.subscriptions.has(symbol)) {
      this.subscriptions.get(symbol).delete('ticker');
      if (this.subscriptions.get(symbol).size === 0) {
        this.subscriptions.delete(symbol);
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const unsubscription = {
        event: 'unsubscribe',
        pair: [krakenPair],
        subscription: { name: 'ticker' },
      };
      this.ws.send(JSON.stringify(unsubscription));
      this.logger.log(`Unsubscribed from ticker for ${symbol}`);
    }
  }

  /**
   * Unsubscribe from order book data
   */
  unsubscribeOrderBook(symbol: string): void {
    const krakenPair = this.toKrakenSymbol(symbol);
    
    if (this.subscriptions.has(symbol)) {
      this.subscriptions.get(symbol).delete('orderbook');
      if (this.subscriptions.get(symbol).size === 0) {
        this.subscriptions.delete(symbol);
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const unsubscription = {
        event: 'unsubscribe',
        pair: [krakenPair],
        subscription: { name: 'book' },
      };
      this.ws.send(JSON.stringify(unsubscription));
      this.logger.log(`Unsubscribed from order book for ${symbol}`);
    }
  }

  /**
   * Get latest ticker data from cache
   */
  getTicker(symbol: string): TickerDataDto | null {
    return this.tickerCache.get(symbol) || null;
  }

  /**
   * Get latest order book from cache
   */
  getOrderBook(symbol: string): OrderBookDto | null {
    return this.orderBookCache.get(symbol) || null;
  }

  /**
   * Get all cached tickers
   */
  getAllTickers(): TickerDataDto[] {
    return Array.from(this.tickerCache.values());
  }

  /**
   * Store OHLCV data in database
   */
  async storeOHLCV(
    symbol: string,
    timeframe: Timeframe,
    data: Omit<OHLCVDto, 'timestamp'> & { timestamp: Date },
  ): Promise<void> {
    try {
      const ohlcv = this.ohlcvRepository.create({
        symbol,
        timeframe,
        timestamp: data.timestamp,
        open: data.open.toString(),
        high: data.high.toString(),
        low: data.low.toString(),
        close: data.close.toString(),
        volume: data.volume.toString(),
        trades: data.trades,
      });

      await this.ohlcvRepository.save(ohlcv);
      this.logger.debug(`Stored OHLCV data for ${symbol} ${timeframe}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error storing OHLCV data: ${err.message}`);
    }
  }

  /**
   * Get historical OHLCV data with caching
   */
  async getHistoricalData(
    symbol: string,
    timeframe: Timeframe,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<OHLCVDto[]> {
    try {
      // Generate cache key
      const cacheKey = `${symbol}:${timeframe}:${startDate?.getTime() || 'null'}:${endDate?.getTime() || 'null'}:${limit}`;
      
      // Check cache
      const cached = this.ohlcvCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        this.logger.debug(`Cache hit for historical data: ${cacheKey}`);
        return cached.data;
      }

      const queryBuilder = this.ohlcvRepository
        .createQueryBuilder('ohlcv')
        .where('ohlcv.symbol = :symbol', { symbol })
        .andWhere('ohlcv.timeframe = :timeframe', { timeframe });

      if (startDate && endDate) {
        queryBuilder.andWhere('ohlcv.timestamp BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        queryBuilder.andWhere('ohlcv.timestamp >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('ohlcv.timestamp <= :endDate', { endDate });
      }

      const results = await queryBuilder
        .orderBy('ohlcv.timestamp', 'DESC')
        .limit(limit)
        .getMany();

      const data = results.map((r) => ({
        timestamp: r.timestamp,
        open: parseFloat(r.open),
        high: parseFloat(r.high),
        low: parseFloat(r.low),
        close: parseFloat(r.close),
        volume: parseFloat(r.volume),
        trades: r.trades,
      })).reverse(); // Return in chronological order
      
      // Cache the result
      this.ohlcvCache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error fetching historical data: ${err.message}`);
      return [];
    }
  }

  /**
   * Backfill historical OHLCV data from Kraken REST API
   */
  async backfillHistoricalData(
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate?: Date,
  ): Promise<{ success: boolean; candlesImported: number; message: string }> {
    const end = endDate || new Date();
    this.logger.log(`Starting backfill for ${symbol} ${timeframe} from ${startDate} to ${end}`);

    try {
      // Convert timeframe to Kraken interval (in minutes)
      const intervalMinutes = this.timeframeToMinutes(timeframe);
      
      // Kraken returns data in reverse chronological order, max 720 candles per request
      const maxCandlesPerRequest = 720;
      const krakenSymbol = this.toKrakenSymbol(symbol);
      
      let currentStart = startDate;
      let totalImported = 0;
      const batchSize = 100; // Insert in batches for better performance

      while (currentStart < end) {
        // Calculate the end timestamp for this batch
        const batchEnd = new Date(
          Math.min(
            currentStart.getTime() + maxCandlesPerRequest * intervalMinutes * 60 * 1000,
            end.getTime(),
          ),
        );

        try {
          // Fetch OHLC data from Kraken
          const response = await axios.get(`${this.krakenRestUrl}/OHLC`, {
            params: {
              pair: krakenSymbol,
              interval: intervalMinutes,
              since: Math.floor(currentStart.getTime() / 1000),
            },
            timeout: 10000,
          });

          if (response.data.error && response.data.error.length > 0) {
            throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
          }

          const resultKey = Object.keys(response.data.result).find(k => k !== 'last');
          if (!resultKey || !response.data.result[resultKey]) {
            this.logger.warn(`No data returned for ${symbol} ${timeframe}`);
            break;
          }

          const candles = response.data.result[resultKey];
          
          if (candles.length === 0) {
            this.logger.log(`No more candles available for ${symbol}`);
            break;
          }

          // Prepare entities for bulk insert
          const entities: OHLCVEntity[] = [];
          
          for (const candle of candles) {
            const timestamp = new Date(candle[0] * 1000);
            
            // Skip if timestamp is beyond our end date
            if (timestamp > end) continue;

            entities.push(
              this.ohlcvRepository.create({
                symbol,
                timeframe,
                timestamp,
                open: candle[1].toString(),
                high: candle[2].toString(),
                low: candle[3].toString(),
                close: candle[4].toString(),
                volume: candle[6].toString(),
                trades: parseInt(candle[7], 10),
              }),
            );
          }

          // Bulk insert with conflict handling (upsert)
          if (entities.length > 0) {
            for (let i = 0; i < entities.length; i += batchSize) {
              const batch = entities.slice(i, i + batchSize);
              await this.ohlcvRepository
                .createQueryBuilder()
                .insert()
                .into(OHLCVEntity)
                .values(batch)
                .orIgnore() // Skip duplicates
                .execute();
            }
            
            totalImported += entities.length;
            this.logger.log(`Imported ${entities.length} candles for ${symbol} (total: ${totalImported})`);
          }

          // Update currentStart to the last candle timestamp
          const lastCandle = candles[candles.length - 1];
          currentStart = new Date((lastCandle[0] + intervalMinutes * 60) * 1000);

          // Rate limiting - wait 1 second between requests
          await new Promise(resolve => setTimeout(resolve, this.krakenRateLimit));

        } catch (error) {
          const err = error as Error;
          this.logger.error(`Error fetching batch: ${err.message}`);
          
          // If we hit rate limit, wait longer
          if (err.message.includes('rate limit')) {
            this.logger.warn('Rate limit hit, waiting 10 seconds...');
            await new Promise(resolve => setTimeout(resolve, 10000));
          } else {
            throw error;
          }
        }
      }

      // Clear cache after backfill
      this.clearHistoricalCache(symbol, timeframe);

      const message = `Successfully imported ${totalImported} candles for ${symbol} ${timeframe}`;
      this.logger.log(message);
      
      return {
        success: true,
        candlesImported: totalImported,
        message,
      };

    } catch (error) {
      const err = error as Error;
      const message = `Backfill failed: ${err.message}`;
      this.logger.error(message, err.stack);
      
      return {
        success: false,
        candlesImported: 0,
        message,
      };
    }
  }

  /**
   * Convert timeframe to minutes for Kraken API
   */
  private timeframeToMinutes(timeframe: Timeframe): number {
    const map: Record<Timeframe, number> = {
      [Timeframe.ONE_MINUTE]: 1,
      [Timeframe.FIVE_MINUTES]: 5,
      [Timeframe.FIFTEEN_MINUTES]: 15,
      [Timeframe.ONE_HOUR]: 60,
      [Timeframe.FOUR_HOURS]: 240,
      [Timeframe.ONE_DAY]: 1440,
    };
    return map[timeframe] || 60;
  }

  /**
   * Clear historical data cache for a specific symbol and timeframe
   */
  private clearHistoricalCache(symbol?: string, timeframe?: Timeframe): void {
    if (!symbol && !timeframe) {
      // Clear all cache
      this.ohlcvCache.clear();
      this.logger.debug('Cleared all OHLCV cache');
      return;
    }

    // Clear specific cache entries
    const keysToDelete: string[] = [];
    for (const key of this.ohlcvCache.keys()) {
      const [keySymbol, keyTimeframe] = key.split(':');
      if (
        (!symbol || keySymbol === symbol) &&
        (!timeframe || keyTimeframe === timeframe)
      ) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.ohlcvCache.delete(key));
    this.logger.debug(`Cleared ${keysToDelete.length} OHLCV cache entries`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    ohlcvCacheSize: number;
    tickerCacheSize: number;
    orderBookCacheSize: number;
  } {
    return {
      ohlcvCacheSize: this.ohlcvCache.size,
      tickerCacheSize: this.tickerCache.size,
      orderBookCacheSize: this.orderBookCache.size,
    };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    subscriptions: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size,
    };
  }

  /**
   * Convert symbol to Kraken format (e.g., BTC/USD -> XBT/USD)
   */
  private toKrakenSymbol(symbol: string): string {
    return symbol.replace('BTC', 'XBT');
  }

  /**
   * Normalize symbol from Kraken format (e.g., XBT/USD -> BTC/USD)
   */
  private normalizeSymbol(krakenSymbol: string): string {
    return krakenSymbol.replace('XBT', 'BTC');
  }
}
