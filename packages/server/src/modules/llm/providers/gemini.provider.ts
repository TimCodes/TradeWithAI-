import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ChatMessage } from '../llm.service';

@Injectable()
export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  async chat(messages: ChatMessage[], stream = false) {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.client.getGenerativeModel({ model: 'gemini-pro' });

    // Convert messages to Gemini format
    const chatHistory = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    if (stream) {
      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessageStream(lastMessage.content);
      return result;
    } else {
      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(lastMessage.content);
      return result.response;
    }
  }

  async *streamChat(messages: ChatMessage[]) {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.client.getGenerativeModel({ model: 'gemini-pro' });

    // Convert messages to Gemini format
    const chatHistory = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  }
}