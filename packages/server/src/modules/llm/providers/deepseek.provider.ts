import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LLMProvider, ChatMessage } from '../llm.service';

@Injectable()
export class DeepSeekProvider implements LLMProvider {
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('DEEPSEEK_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1',
      });
    }
  }

  async chat(messages: ChatMessage[], stream = false) {
    if (!this.client) {
      throw new Error('DeepSeek API key not configured');
    }

    const response = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      stream,
    });

    return response;
  }

  async *streamChat(messages: ChatMessage[]) {
    if (!this.client) {
      throw new Error('DeepSeek API key not configured');
    }

    const stream = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  }
}