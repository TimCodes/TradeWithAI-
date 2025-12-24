import { Controller, Get, Post, Body, Param, Sse, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LLMService, ChatMessage } from './llm.service';
import { TradingContextService } from './services/trading-context.service';

@Controller('llm')
export class LLMController {
  constructor(
    private llmService: LLMService,
    private tradingContextService: TradingContextService,
  ) {}

  @Get('providers')
  getProviders() {
    return {
      providers: this.llmService.getAvailableProviders(),
    };
  }

  @Get('trading-context')
  async getTradingContext(@Req() req: any) {
    // TODO: Get userId from JWT token in req.user
    const userId = req.user?.id || 'demo-user';
    const context = await this.tradingContextService.getTradingContext(userId);
    return context;
  }

  @Post('chat')
  async chat(
    @Body() body: { 
      provider: string; 
      messages: ChatMessage[]; 
      stream?: boolean;
      includeContext?: boolean;
    },
    @Req() req: any,
  ) {
    const { provider, messages, stream = false, includeContext = false } = body;
    
    let processedMessages = [...messages];
    
    // Inject trading context if requested
    if (includeContext) {
      const userId = req.user?.id || 'demo-user';
      const context = await this.tradingContextService.getTradingContext(userId);
      const contextPrompt = this.tradingContextService.formatContextPrompt(context);
      
      // Add context as a system message before the user's messages
      processedMessages = [
        {
          role: 'system' as const,
          content: contextPrompt,
        },
        ...messages,
      ];
    }
    
    const response = await this.llmService.chat(provider, processedMessages, stream);
    return { response };
  }

  @Sse('chat/stream/:provider')
  streamChat(
    @Param('provider') provider: string,
    @Body() body: { messages: ChatMessage[] },
  ): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          for await (const chunk of this.llmService.streamChat(provider, body.messages)) {
            subscriber.next({ data: { type: 'token', content: chunk } });
          }
          subscriber.next({ data: { type: 'done' } });
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }
}