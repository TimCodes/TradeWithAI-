import { apiClient, handleAPIError } from './api';
import type { ChatMessage, TradeSignal } from '../types/store.types';

/**
 * LLM API Request Types
 */
export interface SendMessageRequest {
  message: string;
  provider?: 'openai' | 'anthropic' | 'google' | 'groq';
  model?: string;
  includeContext?: boolean; // Include trading context
  temperature?: number;
  maxTokens?: number;
}

export interface CompareProvidersRequest {
  message: string;
  providers: Array<'openai' | 'anthropic' | 'google' | 'groq'>;
  includeContext?: boolean;
}

/**
 * LLM API Response Types
 */
export interface SendMessageResponse {
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface CompareProvidersResponse {
  responses: Array<{
    provider: string;
    message: ChatMessage;
    responseTime: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;
}

export interface ParsedTradeSignal {
  signal: TradeSignal;
  confidence: number;
  rawResponse: string;
}

/**
 * LLM Provider Info
 */
export interface LLMProvider {
  id: string;
  name: string;
  models: string[];
  isConfigured: boolean;
  isAvailable: boolean;
}

/**
 * LLM Service
 * 
 * Provides methods for interacting with LLM endpoints:
 * - Send chat messages
 * - Stream responses (via WebSocket)
 * - Compare multiple providers
 * - Parse trade signals
 * - Manage provider configuration
 */
export class LLMService {
  /**
   * Send a message to an LLM provider
   */
  static async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const response = await apiClient.post<SendMessageResponse>('/llm/chat', request);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get chat history for current session
   */
  static async getChatHistory(sessionId?: string): Promise<ChatMessage[]> {
    try {
      const url = sessionId ? `/llm/history?sessionId=${sessionId}` : '/llm/history';
      const response = await apiClient.get<ChatMessage[]>(url);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Clear chat history
   */
  static async clearHistory(sessionId?: string): Promise<{ message: string }> {
    try {
      const url = sessionId ? `/llm/history?sessionId=${sessionId}` : '/llm/history';
      const response = await apiClient.delete<{ message: string }>(url);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Compare responses from multiple LLM providers
   * Note: This is a synchronous comparison. For real-time streaming comparison,
   * use WebSocket (useLLMStream hook)
   */
  static async compareProviders(request: CompareProvidersRequest): Promise<CompareProvidersResponse> {
    try {
      const response = await apiClient.post<CompareProvidersResponse>('/llm/compare', request);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Parse a trade signal from LLM response
   */
  static async parseTradeSignal(response: string): Promise<ParsedTradeSignal | null> {
    try {
      const result = await apiClient.post<ParsedTradeSignal | null>('/llm/parse-signal', {
        response,
      });
      return result.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get list of available LLM providers
   */
  static async getProviders(): Promise<LLMProvider[]> {
    try {
      const response = await apiClient.get<LLMProvider[]>('/llm/providers');
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get available models for a specific provider
   */
  static async getModels(provider: string): Promise<string[]> {
    try {
      const response = await apiClient.get<string[]>(`/llm/providers/${provider}/models`);
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Test connection to a specific provider
   */
  static async testProvider(provider: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/llm/providers/${provider}/test`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get LLM usage statistics
   */
  static async getUsageStats(): Promise<any> {
    try {
      const response = await apiClient.get('/llm/stats');
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }

  /**
   * Get current trading context (what will be sent to LLM)
   */
  static async getTradingContext(): Promise<{
    balance: any;
    positions: any[];
    recentOrders: any[];
    marketPrices: any;
  }> {
    try {
      const response = await apiClient.get('/llm/trading-context');
      return response.data;
    } catch (error) {
      throw new Error(handleAPIError(error));
    }
  }
}

export default LLMService;
