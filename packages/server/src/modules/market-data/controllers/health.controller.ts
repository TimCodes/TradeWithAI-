import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketDataService } from '../services/market-data.service';

@ApiTags('health')
@Controller('health/market-data')
export class MarketDataHealthController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  @ApiOperation({ summary: 'Check market data module health' })
  @ApiResponse({ 
    status: 200, 
    description: 'Market data module health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        module: { type: 'string' },
        websocket: {
          type: 'object',
          properties: {
            connected: { type: 'boolean' },
            reconnectAttempts: { type: 'number' },
          },
        },
        cache: {
          type: 'object',
          properties: {
            tickerCount: { type: 'number' },
            orderBookCount: { type: 'number' },
            ohlcvCacheSize: { type: 'number' },
          },
        },
        subscriptions: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            symbols: { type: 'array', items: { type: 'string' } },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  getHealth() {
    const connectionStatus = this.marketDataService.getConnectionStatus();
    const cacheStats = this.marketDataService.getCacheStats();
    const allTickers = this.marketDataService.getAllTickers();

    const isHealthy = connectionStatus.connected;
    const isDegraded = !connectionStatus.connected && connectionStatus.reconnectAttempts < 3;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    if (isHealthy) {
      status = 'healthy';
    } else if (isDegraded) {
      status = 'degraded';
    }

    return {
      status,
      module: 'MarketDataModule',
      websocket: {
        connected: connectionStatus.connected,
        reconnectAttempts: connectionStatus.reconnectAttempts,
      },
      cache: {
        tickerCount: cacheStats.tickerCacheSize,
        orderBookCount: cacheStats.orderBookCacheSize,
        ohlcvCacheSize: cacheStats.ohlcvCacheSize,
      },
      subscriptions: {
        total: allTickers.length,
        symbols: allTickers.map(t => t.symbol),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check if market data module is ready to serve requests' })
  @ApiResponse({ status: 200, description: 'Module is ready' })
  @ApiResponse({ status: 503, description: 'Module is not ready' })
  getReady() {
    const connectionStatus = this.marketDataService.getConnectionStatus();
    
    if (connectionStatus.connected) {
      return {
        ready: true,
        message: 'Market data module is ready',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      ready: false,
      message: 'Market data module is not ready - WebSocket not connected',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for market data module' })
  @ApiResponse({ status: 200, description: 'Module is alive' })
  getLive() {
    return {
      alive: true,
      module: 'MarketDataModule',
      timestamp: new Date().toISOString(),
    };
  }
}
