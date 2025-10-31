import { Controller, Get } from '@nestjs/common';
import { MarketDataEventsHandler } from '../events/market-data.events';

/**
 * Market Data Streaming Controller
 * 
 * Provides endpoints to monitor market data streaming status and statistics
 */
@Controller('websocket/market-data')
export class MarketDataStreamController {
  constructor(
    private readonly marketDataEventsHandler: MarketDataEventsHandler,
  ) {}

  /**
   * GET /websocket/market-data/stats
   * Get streaming statistics
   */
  @Get('stats')
  getStreamingStats() {
    return {
      status: 'streaming',
      ...this.marketDataEventsHandler.getStats(),
      timestamp: new Date().toISOString(),
    };
  }
}
