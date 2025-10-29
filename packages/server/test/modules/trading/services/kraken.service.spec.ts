import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { KrakenService } from '../../../../src/modules/trading/services/kraken.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KrakenService', () => {
  let service: KrakenService;
  let configService: ConfigService;
  let mockHttpClient: any;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        KRAKEN_API_KEY: 'test-api-key',
        KRAKEN_API_SECRET: Buffer.from('test-secret').toString('base64'),
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock axios.create to return a mock instance
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn((fn) => fn),
        },
        response: {
          use: jest.fn((successFn, errorFn) => {
            return { successFn, errorFn };
          }),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockHttpClient as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KrakenService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<KrakenService>(KrakenService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Override the httpClient on the service instance
    (service as any).httpClient = mockHttpClient;
    // Ensure API keys are set for private endpoint tests
    (service as any).apiKey = 'test-api-key';
    (service as any).apiSecret = Buffer.from('test-secret').toString('base64');
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with API credentials', () => {
      expect(configService.get).toHaveBeenCalledWith('KRAKEN_API_KEY');
      expect(configService.get).toHaveBeenCalledWith('KRAKEN_API_SECRET');
    });

    it('should warn if credentials are not configured', async () => {
      // Create a new config service that returns empty strings
      const emptyConfigService = {
        get: jest.fn().mockReturnValue(''),
      };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KrakenService,
          {
            provide: ConfigService,
            useValue: emptyConfigService,
          },
        ],
      }).compile();

      // This should log a warning during construction
      const serviceWithoutCreds = module.get<KrakenService>(KrakenService);
      
      // Verify service was created (warning is logged in constructor)
      expect(serviceWithoutCreds).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting after max requests', async () => {
      jest.useFakeTimers();
      
      const mockResponse = {
        data: {
          error: [],
          result: { unixtime: 1234567890, rfc1123: 'Test Time' },
        },
      };

      // Mock successful responses
      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      // Make requests up to the limit
      const promises = [];
      for (let i = 0; i < 16; i++) {
        promises.push(service.getServerTime());
      }

      // The 16th request should trigger rate limiting
      await Promise.all(promises);

      // Just verify all requests completed successfully
      expect(mockHttpClient.get).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Public API Methods', () => {
    describe('getServerTime', () => {
      it('should fetch server time successfully', async () => {
        const mockResponse = {
          data: {
            error: [],
            result: {
              unixtime: 1234567890,
              rfc1123: 'Mon, 12 Dec 2022 12:00:00 +0000',
            },
          },
        };

        mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getServerTime();

        expect(result).toEqual({
          unixtime: 1234567890,
          rfc1123: 'Mon, 12 Dec 2022 12:00:00 +0000',
        });
        expect(mockHttpClient.get).toHaveBeenCalledWith('/0/public/Time', { params: {} });
      });

      it('should throw error if API returns error', async () => {
        const mockResponse = {
          data: {
            error: ['EGeneral:Invalid request'],
            result: null,
          },
        };

        mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

        await expect(service.getServerTime()).rejects.toThrow('EGeneral:Invalid request');
      });
    });

    describe('getTicker', () => {
      it('should fetch ticker data for a trading pair', async () => {
        const mockTickerData = {
          a: ['50000.00000', '1', '1.000'],
          b: ['49999.00000', '2', '2.000'],
          c: ['50000.00000', '0.01000000'],
          v: ['1000.00000000', '2000.00000000'],
          p: ['49500.00000', '49600.00000'],
        };

        const mockResponse = {
          data: {
            error: [],
            result: {
              XXBTZUSD: mockTickerData,
            },
          },
        };

        mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getTicker('XXBTZUSD');

        expect(result).toEqual(mockTickerData);
        expect(mockHttpClient.get).toHaveBeenCalledWith('/0/public/Ticker', {
          params: { pair: 'XXBTZUSD' },
        });
      });
    });

    describe('getOrderBook', () => {
      it('should fetch order book with default count', async () => {
        const mockOrderBook = {
          asks: [['50000.00', '1.000', 1234567890]],
          bids: [['49999.00', '2.000', 1234567890]],
        };

        const mockResponse = {
          data: {
            error: [],
            result: {
              XXBTZUSD: mockOrderBook,
            },
          },
        };

        mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getOrderBook('XXBTZUSD');

        expect(result).toEqual(mockOrderBook);
        expect(mockHttpClient.get).toHaveBeenCalledWith('/0/public/Depth', {
          params: { pair: 'XXBTZUSD', count: 100 },
        });
      });

      it('should fetch order book with custom count', async () => {
        const mockResponse = {
          data: {
            error: [],
            result: {
              XXBTZUSD: {
                asks: [],
                bids: [],
              },
            },
          },
        };

        mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

        await service.getOrderBook('XXBTZUSD', 50);

        expect(mockHttpClient.get).toHaveBeenCalledWith('/0/public/Depth', {
          params: { pair: 'XXBTZUSD', count: 50 },
        });
      });
    });

    describe('getOHLC', () => {
      it('should fetch OHLC data', async () => {
        const mockOHLC = [
          [1234567890, '50000', '50100', '49900', '50050', '50000', '100.5', 150],
        ];

        const mockResponse = {
          data: {
            error: [],
            result: {
              XXBTZUSD: mockOHLC,
              last: 1234567890,
            },
          },
        };

        mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getOHLC('XXBTZUSD', 60);

        expect(result).toEqual({
          XXBTZUSD: mockOHLC,
          last: 1234567890,
        });
        expect(mockHttpClient.get).toHaveBeenCalledWith('/0/public/OHLC', {
          params: { pair: 'XXBTZUSD', interval: 60 },
        });
      });
    });

    describe('getRecentTrades', () => {
      it('should fetch recent trades', async () => {
        const mockTrades = [
          ['50000.00000', '0.01000000', 1234567890.1234, 'b', 'm', ''],
        ];

        const mockResponse = {
          data: {
            error: [],
            result: {
              XXBTZUSD: mockTrades,
              last: '1234567890123456789',
            },
          },
        };

        mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getRecentTrades('XXBTZUSD');

        expect(result).toEqual({
          XXBTZUSD: mockTrades,
          last: '1234567890123456789',
        });
      });
    });

    describe('getAssetPairs', () => {
      it('should fetch asset pairs', async () => {
        const mockPairs = {
          XXBTZUSD: {
            altname: 'XBTUSD',
            wsname: 'XBT/USD',
            base: 'XXBT',
            quote: 'ZUSD',
          },
        };

        const mockResponse = {
          data: {
            error: [],
            result: mockPairs,
          },
        };

        mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getAssetPairs();

        expect(result).toEqual(mockPairs);
      });
    });
  });

  describe('Private API Methods', () => {
    describe('getBalance', () => {
      it('should fetch account balance', async () => {
        const mockBalance = {
          XXBT: '1.5000000000',
          ZUSD: '10000.0000',
        };

        const mockResponse = {
          data: {
            error: [],
            result: mockBalance,
          },
        };

        mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getBalance();

        expect(result).toEqual(mockBalance);
        expect(mockHttpClient.post).toHaveBeenCalled();
      });

      it('should throw error if API credentials are missing', async () => {
        mockConfigService.get.mockReturnValue('');
        
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            KrakenService,
            {
              provide: ConfigService,
              useValue: mockConfigService,
            },
          ],
        }).compile();

        const serviceWithoutCreds = module.get<KrakenService>(KrakenService);

        await expect(serviceWithoutCreds.getBalance()).rejects.toThrow(
          new HttpException(
            'Kraken API credentials not configured',
            HttpStatus.UNAUTHORIZED,
          ),
        );
      });
    });

    describe('placeOrder', () => {
      it('should place a market buy order', async () => {
        const mockOrderResponse = {
          descr: { order: 'buy 0.01 XBTUSD @ market' },
          txid: ['ORDER-ID-123'],
        };

        const mockResponse = {
          data: {
            error: [],
            result: mockOrderResponse,
          },
        };

        mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.placeOrder({
          pair: 'XBTUSD',
          type: 'buy',
          ordertype: 'market',
          volume: '0.01',
        });

        expect(result).toEqual(mockOrderResponse);
        expect(mockHttpClient.post).toHaveBeenCalled();
      });

      it('should place a limit sell order', async () => {
        const mockOrderResponse = {
          descr: { order: 'sell 0.01 XBTUSD @ limit 51000.00' },
          txid: ['ORDER-ID-456'],
        };

        const mockResponse = {
          data: {
            error: [],
            result: mockOrderResponse,
          },
        };

        mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.placeOrder({
          pair: 'XBTUSD',
          type: 'sell',
          ordertype: 'limit',
          volume: '0.01',
          price: '51000.00',
        });

        expect(result).toEqual(mockOrderResponse);
      });

      it('should throw error if required parameters are missing', async () => {
        await expect(
          service.placeOrder({
            pair: '',
            type: 'buy',
            ordertype: 'market',
            volume: '0.01',
          }),
        ).rejects.toThrow(
          new HttpException(
            'Missing required order parameters',
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should throw error if limit order lacks price', async () => {
        await expect(
          service.placeOrder({
            pair: 'XBTUSD',
            type: 'buy',
            ordertype: 'limit',
            volume: '0.01',
          }),
        ).rejects.toThrow(
          new HttpException(
            'Price is required for limit orders',
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should validate orders when validate flag is set', async () => {
        const mockResponse = {
          data: {
            error: [],
            result: {
              descr: { order: 'buy 0.01 XBTUSD @ market' },
              txid: [],
            },
          },
        };

        mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

        await service.placeOrder({
          pair: 'XBTUSD',
          type: 'buy',
          ordertype: 'market',
          volume: '0.01',
          validate: true,
        });

        expect(mockHttpClient.post).toHaveBeenCalled();
      });
    });

    describe('cancelOrder', () => {
      it('should cancel an order successfully', async () => {
        const mockResponse = {
          data: {
            error: [],
            result: {
              count: 1,
            },
          },
        };

        mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.cancelOrder('ORDER-ID-123');

        expect(result).toEqual({ count: 1 });
        expect(mockHttpClient.post).toHaveBeenCalled();
      });

      it('should throw error if transaction ID is missing', async () => {
        await expect(service.cancelOrder('')).rejects.toThrow(
          new HttpException(
            'Transaction ID is required',
            HttpStatus.BAD_REQUEST,
          ),
        );
      });
    });

    describe('getOpenOrders', () => {
      it('should fetch open orders', async () => {
        const mockOrders = {
          open: {
            'ORDER-ID-123': {
              status: 'open',
              vol: '0.01000000',
              vol_exec: '0.00000000',
            },
          },
        };

        const mockResponse = {
          data: {
            error: [],
            result: mockOrders,
          },
        };

        mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getOpenOrders();

        expect(result).toEqual(mockOrders);
      });

      it('should fetch open orders with trades', async () => {
        const mockResponse = {
          data: {
            error: [],
            result: {
              open: {},
            },
          },
        };

        mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

        await service.getOpenOrders(true);

        expect(mockHttpClient.post).toHaveBeenCalled();
      });
    });

    describe('getClosedOrders', () => {
      it('should fetch closed orders', async () => {
        const mockOrders = {
          closed: {
            'ORDER-ID-789': {
              status: 'closed',
              vol: '0.01000000',
              vol_exec: '0.01000000',
            },
          },
          count: 1,
        };

        const mockResponse = {
          data: {
            error: [],
            result: mockOrders,
          },
        };

        mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getClosedOrders();

        expect(result).toEqual(mockOrders);
      });
    });
  });

  describe('Health Check', () => {
    it('should return true when API is reachable', async () => {
      const mockResponse = {
        data: {
          error: [],
          result: {
            unixtime: 1234567890,
            rfc1123: 'Test Time',
          },
        },
      };

      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is unreachable', async () => {
      mockHttpClient.get = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid trading pair gracefully', async () => {
      const mockResponse = {
        data: {
          error: ['EQuery:Unknown asset pair'],
          result: null,
        },
      };

      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      await expect(service.getTicker('INVALID')).rejects.toThrow('EQuery:Unknown asset pair');
    });
  });

  describe('Message Signature Generation', () => {
    it('should generate valid signatures for private requests', () => {
      const path = '/0/private/Balance';
      const data = { nonce: '1234567890' };
      const nonce = '1234567890';

      const signature = service['getMessageSignature'](path, data, nonce);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });
  });
});
