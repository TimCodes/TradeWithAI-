import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LLMController } from './llm.controller';
import { LLMService } from './llm.service';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { TradingContextService } from './services/trading-context.service';
import { Order } from '../trading/entities/order.entity';
import { Position } from '../trading/entities/position.entity';
import { OHLCVEntity } from '../market-data/entities/ohlcv.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Position, OHLCVEntity]),
  ],
  controllers: [LLMController],
  providers: [
    LLMService,
    TradingContextService,
    ClaudeProvider,
    OpenAIProvider,
    GeminiProvider,
    DeepSeekProvider,
  ],
  exports: [LLMService, TradingContextService],
})
export class LLMModule {}