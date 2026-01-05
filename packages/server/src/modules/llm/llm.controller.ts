import { Controller, Get, Post, Body, Param, Sse, Req, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LLMService, ChatMessage } from './llm.service';
import { TradingContextService } from './services/trading-context.service';
import { LlmAnalyticsService } from './services/llm-analytics.service';
import { parseTradeSignal } from './utils/signal-parser';

@Controller('llm')
export class LLMController {
  constructor(
    private llmService: LLMService,
    private tradingContextService: TradingContextService,
    private llmAnalyticsService: LlmAnalyticsService,
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
    
    // Parse response for trade signals
    const signalResult = parseTradeSignal(response, provider);
    
    return { 
      response,
      signals: signalResult.hasSignal ? signalResult.signals : [],
    };
  }

  @Post('parse-signal')
  parseSignal(
    @Body() body: { 
      text: string; 
      provider?: string;
      messageId?: string;
    },
  ) {
    const { text, provider, messageId } = body;
    return parseTradeSignal(text, provider, messageId);
  }

  @Post('compare')
  async compareProviders(
    @Body() body: {
      message: string;
      providers: string[];
      includeContext?: boolean;
    },
    @Req() req: any,
  ) {
    const { message, providers, includeContext = false } = body;
    
    // Build messages array
    let messages: ChatMessage[] = [
      {
        role: 'user',
        content: message,
      },
    ];
    
    // Inject trading context if requested
    if (includeContext) {
      const userId = req.user?.id || 'demo-user';
      const context = await this.tradingContextService.getTradingContext(userId);
      const contextPrompt = this.tradingContextService.formatContextPrompt(context);
      
      // Add context as a system message before the user's message
      messages = [
        {
          role: 'system' as const,
          content: contextPrompt,
        },
        ...messages,
      ];
    }
    
    // Call all providers in parallel
    const startTimes = new Map<string, number>();
    const promises = providers.map(async (provider) => {
      startTimes.set(provider, Date.now());
      
      try {
        const response = await this.llmService.chat(provider, messages, false);
        const responseTime = Date.now() - startTimes.get(provider)!;
        
        // Parse for signals
        const signalResult = parseTradeSignal(response, provider);
        
        return {
          provider,
          response,
          responseTime,
          signals: signalResult.hasSignal ? signalResult.signals : [],
          error: null,
        };
      } catch (error) {
        return {
          provider,
          response: '',
          responseTime: Date.now() - startTimes.get(provider)!,
          signals: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    const results = await Promise.all(promises);
    
    return {
      results,
      message,
      timestamp: new Date(),
    };
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

  @Get('analytics')
  async getModelPerformanceStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || 'demo-user';
    
    const dateRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };
    
    const stats = await this.llmAnalyticsService.getModelPerformanceStats(
      userId,
      dateRange,
    );
    
    return {
      stats,
      dateRange,
      timestamp: new Date(),
    };
  }

  @Get('analytics/:provider')
  async getProviderStats(
    @Param('provider') provider: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || 'demo-user';
    
    const dateRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };
    
    const stats = await this.llmAnalyticsService.getProviderPerformanceStats(
      userId,
      provider,
      dateRange,
    );
    
    return {
      stats,
      provider,
      dateRange,
      timestamp: new Date(),
    };
  }

  @Get('analytics/compare/:provider1/:provider2')
  async compareProviderStats(
    @Param('provider1') provider1: string,
    @Param('provider2') provider2: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || 'demo-user';
    
    const dateRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };
    
    const comparison = await this.llmAnalyticsService.compareProviders(
      userId,
      provider1,
      provider2,
      dateRange,
    );
    
    return {
      ...comparison,
      dateRange,
      timestamp: new Date(),
    };
  }

  @Get('analytics/top/:limit')
  async getTopProviders(
    @Param('limit') limit: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || 'demo-user';
    const limitNum = parseInt(limit, 10) || 5;
    
    const dateRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };
    
    const topProviders = await this.llmAnalyticsService.getTopProviders(
      userId,
      limitNum,
      dateRange,
    );
    
    return {
      topProviders,
      limit: limitNum,
      dateRange,
      timestamp: new Date(),
    };
  }
}