import { Controller, Get, Post, Body, Param, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LLMService, ChatMessage } from './llm.service';

@Controller('llm')
export class LLMController {
  constructor(private llmService: LLMService) {}

  @Get('providers')
  getProviders() {
    return {
      providers: this.llmService.getAvailableProviders(),
    };
  }

  @Post('chat')
  async chat(
    @Body() body: { provider: string; messages: ChatMessage[]; stream?: boolean },
  ) {
    const { provider, messages, stream = false } = body;
    const response = await this.llmService.chat(provider, messages, stream);
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