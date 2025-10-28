import { Module } from '@nestjs/common';
import { LLMController } from './llm.controller';
import { LLMService } from './llm.service';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';

@Module({
  controllers: [LLMController],
  providers: [
    LLMService,
    ClaudeProvider,
    OpenAIProvider,
    GeminiProvider,
    DeepSeekProvider,
  ],
  exports: [LLMService],
})
export class LLMModule {}