import { Injectable } from '@nestjs/common';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';

export interface LLMProvider {
  chat(messages: any[], stream?: boolean): Promise<any>;
  streamChat(messages: any[]): AsyncGenerator<string>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class LLMService {
  private providers: Map<string, LLMProvider>;

  constructor(
    private claudeProvider: ClaudeProvider,
    private openaiProvider: OpenAIProvider,
    private geminiProvider: GeminiProvider,
    private deepseekProvider: DeepSeekProvider,
  ) {
    this.providers = new Map<string, LLMProvider>([
      ['claude', this.claudeProvider],
      ['openai', this.openaiProvider],
      ['gemini', this.geminiProvider],
      ['deepseek', this.deepseekProvider],
    ]);
  }

  async chat(provider: string, messages: ChatMessage[], stream = false) {
    const llmProvider = this.providers.get(provider);
    if (!llmProvider) {
      throw new Error(`Provider ${provider} not found`);
    }
    return llmProvider.chat(messages, stream);
  }

  async *streamChat(provider: string, messages: ChatMessage[]) {
    const llmProvider = this.providers.get(provider);
    if (!llmProvider) {
      throw new Error(`Provider ${provider} not found`);
    }
    yield* llmProvider.streamChat(messages);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}