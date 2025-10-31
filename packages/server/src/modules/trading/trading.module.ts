import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { KrakenService } from './services/kraken.service';
import { TradingService } from './services/trading.service';
import { OrderExecutorService } from './services/order-executor.service';
import { TradingEventsService } from './services/trading-events.service';
import { RiskManagementService } from './services/risk-management.service';
import { KrakenController } from './controllers/kraken.controller';
import { TradingController } from './controllers/trading.controller';
import { TradingHealthController } from './controllers/health.controller';
import { Order } from './entities/order.entity';
import { Position } from './entities/position.entity';
import { Trade } from './entities/trade.entity';
import { RiskSettings } from './entities/risk-settings.entity';

/**
 * Trading Module
 * 
 * Provides comprehensive trading functionality including:
 * - Exchange connectivity (Kraken API)
 * - Order management and execution
 * - Position tracking and P&L calculation
 * - Risk management and validation
 * - Trade history and analytics
 * 
 * Dependencies:
 * - PostgreSQL: For persisting orders, positions, trades, and risk settings
 * - Redis/Bull: For asynchronous order queue processing
 * - ConfigModule: For environment variable access (KRAKEN_API_KEY, etc.)
 * 
 * Environment Variables Required:
 * - KRAKEN_API_KEY: Your Kraken API key
 * - KRAKEN_API_SECRET: Your Kraken API secret (base64 encoded)
 * 
 * @module TradingModule
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([Order, Position, Trade, RiskSettings]),
    BullModule.registerQueue({
      name: 'order-execution',
    }),
  ],
  controllers: [KrakenController, TradingController, TradingHealthController],
  providers: [
    KrakenService,
    TradingService,
    OrderExecutorService,
    TradingEventsService,
    RiskManagementService,
  ],
  exports: [
    KrakenService,
    TradingService,
    OrderExecutorService,
    TradingEventsService,
    RiskManagementService,
  ],
})
export class TradingModule {}

