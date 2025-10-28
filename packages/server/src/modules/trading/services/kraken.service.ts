import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as crypto from 'crypto';

/**
 * Kraken API Service
 * Implements connection to Kraken exchange for trading operations
 * API Documentation: https://docs.kraken.com/rest/
 */
@Injectable()
export class KrakenService {
  private readonly logger = new Logger(KrakenService.name);
  private readonly apiUrl = 'https://api.kraken.com';
  private apiKey: string;
  private apiSecret: string;
  private readonly httpClient: AxiosInstance;
  
  // Rate limiting: Kraken allows 15 calls/sec for tier 2, we'll be conservative
  private requestCount = 0;
  private requestWindow = Date.now();
  private readonly maxRequestsPerSecond = 15;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('KRAKEN_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('KRAKEN_API_SECRET') || '';
    
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Alpha-Arena/1.0',
      },
    });

    // Request interceptor for rate limiting
    this.httpClient.interceptors.request.use(async (config) => {
      await this.enforceRateLimit();
      return config;
    });

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => this.handleApiError(error),
    );

    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Kraken API credentials not configured');
    }
  }

  /**
   * Enforce rate limiting to stay within Kraken's limits
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 1000; // 1 second

    // Reset counter if we're in a new window
    if (now - this.requestWindow >= windowDuration) {
      this.requestCount = 0;
      this.requestWindow = now;
    }

    // If we've hit the limit, wait until the next window
    if (this.requestCount >= this.maxRequestsPerSecond) {
      const waitTime = windowDuration - (now - this.requestWindow);
      this.logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.requestWindow = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Handle Kraken API errors
   */
  private handleApiError(error: AxiosError): never {
    if (error.response) {
      const krakenError = error.response.data as any;
      const errorMessage = krakenError?.error?.join(', ') || 'Unknown Kraken API error';
      
      this.logger.error(`Kraken API Error: ${errorMessage}`, error.stack);
      
      throw new HttpException(
        {
          statusCode: error.response.status,
          message: errorMessage,
          error: 'Kraken API Error',
        },
        error.response.status,
      );
    } else if (error.request) {
      this.logger.error('No response from Kraken API', error.stack);
      throw new HttpException(
        'Unable to connect to Kraken API',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      this.logger.error(`Request setup error: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to setup Kraken API request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate authentication signature for private API calls
   * @param path API endpoint path
   * @param data Request data
   * @param nonce Unique nonce for the request
   */
  private getMessageSignature(path: string, data: Record<string, any>, nonce: string): string {
    const message = new URLSearchParams(data).toString();
    const secret = Buffer.from(this.apiSecret, 'base64');
    const hash = crypto.createHash('sha256').update(nonce + message).digest();
    const hmac = crypto.createHmac('sha512', secret);
    const signatureHash = hmac.update(path + hash.toString('binary'), 'binary').digest('base64');
    
    return signatureHash;
  }

  /**
   * Make a public API call (no authentication required)
   */
  private async publicRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response = await this.httpClient.get(`/0/public/${endpoint}`, { params });
      
      if (response.data.error && response.data.error.length > 0) {
        throw new Error(response.data.error.join(', '));
      }
      
      return response.data.result as T;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make a private API call (authentication required)
   */
  private async privateRequest<T>(endpoint: string, data: Record<string, any> = {}): Promise<T> {
    if (!this.apiKey || !this.apiSecret) {
      throw new HttpException(
        'Kraken API credentials not configured',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const nonce = Date.now().toString();
    const path = `/0/private/${endpoint}`;
    const postData = { ...data, nonce };
    
    const signature = this.getMessageSignature(path, postData, nonce);

    try {
      const response = await this.httpClient.post(
        path,
        new URLSearchParams(postData),
        {
          headers: {
            'API-Key': this.apiKey,
            'API-Sign': signature,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      if (response.data.error && response.data.error.length > 0) {
        throw new Error(response.data.error.join(', '));
      }

      return response.data.result as T;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get account balance
   * Returns available balance for all assets
   */
  async getBalance(): Promise<Record<string, string>> {
    this.logger.debug('Fetching account balance');
    return await this.privateRequest<Record<string, string>>('Balance');
  }

  /**
   * Get ticker information for a trading pair
   * @param pair Trading pair (e.g., 'XBTUSD', 'ETHUSD')
   */
  async getTicker(pair: string): Promise<any> {
    this.logger.debug(`Fetching ticker for ${pair}`);
    const result = await this.publicRequest<Record<string, any>>('Ticker', { pair });
    return result[pair];
  }

  /**
   * Get order book depth
   * @param pair Trading pair (e.g., 'XBTUSD', 'ETHUSD')
   * @param count Number of orders to retrieve (default: 100)
   */
  async getOrderBook(pair: string, count: number = 100): Promise<{
    asks: Array<[string, string, number]>;
    bids: Array<[string, string, number]>;
  }> {
    this.logger.debug(`Fetching order book for ${pair}`);
    const result = await this.publicRequest<Record<string, any>>('Depth', { 
      pair, 
      count 
    });
    return result[pair];
  }

  /**
   * Place a new order
   * @param params Order parameters
   */
  async placeOrder(params: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: 'market' | 'limit';
    volume: string;
    price?: string;
    leverage?: string;
    oflags?: string;
    starttm?: string;
    expiretm?: string;
    userref?: string;
    validate?: boolean;
  }): Promise<{
    descr: { order: string };
    txid: string[];
  }> {
    this.logger.debug(`Placing ${params.type} order for ${params.pair}`);
    
    // Validate required parameters
    if (!params.pair || !params.type || !params.ordertype || !params.volume) {
      throw new HttpException(
        'Missing required order parameters',
        HttpStatus.BAD_REQUEST,
      );
    }

    // For limit orders, price is required
    if (params.ordertype === 'limit' && !params.price) {
      throw new HttpException(
        'Price is required for limit orders',
        HttpStatus.BAD_REQUEST,
      );
    }

    const orderData: Record<string, any> = {
      pair: params.pair,
      type: params.type,
      ordertype: params.ordertype,
      volume: params.volume,
    };

    // Add optional parameters
    if (params.price) orderData.price = params.price;
    if (params.leverage) orderData.leverage = params.leverage;
    if (params.oflags) orderData.oflags = params.oflags;
    if (params.starttm) orderData.starttm = params.starttm;
    if (params.expiretm) orderData.expiretm = params.expiretm;
    if (params.userref) orderData.userref = params.userref;
    if (params.validate !== undefined) orderData.validate = params.validate;

    return await this.privateRequest<{
      descr: { order: string };
      txid: string[];
    }>('AddOrder', orderData);
  }

  /**
   * Cancel an open order
   * @param txid Transaction ID of the order to cancel
   */
  async cancelOrder(txid: string): Promise<{
    count: number;
    pending?: boolean;
  }> {
    this.logger.debug(`Canceling order ${txid}`);
    
    if (!txid) {
      throw new HttpException(
        'Transaction ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.privateRequest<{
      count: number;
      pending?: boolean;
    }>('CancelOrder', { txid });
  }

  /**
   * Get open orders
   * @param trades Whether to include trades in output (default: false)
   * @param userref Filter by user reference ID
   */
  async getOpenOrders(trades: boolean = false, userref?: string): Promise<{
    open: Record<string, any>;
  }> {
    this.logger.debug('Fetching open orders');
    
    const params: Record<string, any> = { trades };
    if (userref) params.userref = userref;

    return await this.privateRequest<{
      open: Record<string, any>;
    }>('OpenOrders', params);
  }

  /**
   * Get closed orders
   * @param trades Whether to include trades in output
   * @param userref Filter by user reference ID
   * @param start Starting timestamp
   * @param end Ending timestamp
   * @param ofs Result offset
   * @param closetime Which time to use (default: 'both')
   */
  async getClosedOrders(
    trades: boolean = false,
    userref?: string,
    start?: number,
    end?: number,
    ofs?: number,
    closetime: 'open' | 'close' | 'both' = 'both',
  ): Promise<{
    closed: Record<string, any>;
    count: number;
  }> {
    this.logger.debug('Fetching closed orders');
    
    const params: Record<string, any> = { trades, closetime };
    if (userref) params.userref = userref;
    if (start) params.start = start;
    if (end) params.end = end;
    if (ofs) params.ofs = ofs;

    return await this.privateRequest<{
      closed: Record<string, any>;
      count: number;
    }>('ClosedOrders', params);
  }

  /**
   * Get OHLC (candlestick) data
   * @param pair Trading pair
   * @param interval Time frame interval in minutes (1, 5, 15, 30, 60, 240, 1440, 10080, 21600)
   * @param since Return data since this timestamp
   */
  async getOHLC(
    pair: string,
    interval: 1 | 5 | 15 | 30 | 60 | 240 | 1440 | 10080 | 21600 = 60,
    since?: number,
  ): Promise<any> {
    this.logger.debug(`Fetching OHLC data for ${pair}`);
    
    const params: Record<string, any> = { pair, interval };
    if (since) params.since = since;

    return await this.publicRequest<any>('OHLC', params);
  }

  /**
   * Get recent trades
   * @param pair Trading pair
   * @param since Return trades since this timestamp
   */
  async getRecentTrades(pair: string, since?: number): Promise<any> {
    this.logger.debug(`Fetching recent trades for ${pair}`);
    
    const params: Record<string, any> = { pair };
    if (since) params.since = since;

    return await this.publicRequest<any>('Trades', params);
  }

  /**
   * Get server time (useful for checking connectivity)
   */
  async getServerTime(): Promise<{
    unixtime: number;
    rfc1123: string;
  }> {
    this.logger.debug('Fetching server time');
    return await this.publicRequest<{
      unixtime: number;
      rfc1123: string;
    }>('Time');
  }

  /**
   * Get tradable asset pairs
   */
  async getAssetPairs(): Promise<Record<string, any>> {
    this.logger.debug('Fetching asset pairs');
    return await this.publicRequest<Record<string, any>>('AssetPairs');
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getServerTime();
      return true;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }
}
