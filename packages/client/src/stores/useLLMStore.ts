import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { LLMState, ChatMessage, LLMProvider } from '../types/store.types';
import type { TradeSignal } from '@alpha-arena/shared';

const initialState = {
  messages: [],
  signals: [] as TradeSignal[],
  currentProvider: 'openai',
  providers: [
    { id: 'openai', name: 'OpenAI GPT-4', enabled: true },
    { id: 'anthropic', name: 'Claude', enabled: true },
    { id: 'deepseek', name: 'DeepSeek', enabled: true },
    { id: 'xai', name: 'Grok', enabled: true },
    { id: 'google', name: 'Gemini', enabled: true },
    { id: 'mistral', name: 'Mistral', enabled: true },
    { id: 'perplexity', name: 'Perplexity', enabled: true },
  ],
  isStreaming: false,
  isLoading: false,
  error: null,
};

export const useLLMStore = create<LLMState>()(
  devtools(
    (set) => ({
      ...initialState,

      // Message actions
      addMessage: (message: ChatMessage) =>
        set(
          (state) => ({
            messages: [...state.messages, message],
          }),
          false,
          'addMessage'
        ),

      updateMessage: (id: string, updates: Partial<ChatMessage>) =>
        set(
          (state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id ? { ...msg, ...updates } : msg
            ),
          }),
          false,
          'updateMessage'
        ),

      removeMessage: (id: string) =>
        set(
          (state) => ({
            messages: state.messages.filter((msg) => msg.id !== id),
          }),
          false,
          'removeMessage'
        ),

      clearMessages: () =>
        set({ messages: [] }, false, 'clearMessages'),

      // Provider actions
      setCurrentProvider: (providerId: string) =>
        set({ currentProvider: providerId }, false, 'setCurrentProvider'),

      setProviders: (providers: LLMProvider[]) =>
        set({ providers }, false, 'setProviders'),

      updateProvider: (id: string, updates: Partial<LLMProvider>) =>
        set(
          (state) => ({
            providers: state.providers.map((provider) =>
              provider.id === id
                ? { ...provider, ...updates, lastUsed: new Date() }
                : provider
            ),
          }),
          false,
          'updateProvider'
        ),

      // UI state actions
      setStreaming: (isStreaming: boolean) =>
        set({ isStreaming }, false, 'setStreaming'),

      setLoading: (isLoading: boolean) =>
        set({ isLoading }, false, 'setLoading'),

      setError: (error: string | null) =>
        set({ error }, false, 'setError'),

      // Signal actions
      addSignal: (signal: TradeSignal) =>
        set(
          (state) => ({
            signals: [...state.signals, signal],
          }),
          false,
          'addSignal'
        ),

      addSignals: (signals: TradeSignal[]) =>
        set(
          (state) => ({
            signals: [...state.signals, ...signals],
          }),
          false,
          'addSignals'
        ),

      updateSignal: (id: string, updates: Partial<TradeSignal>) =>
        set(
          (state) => ({
            signals: state.signals.map((sig) =>
              sig.id === id ? { ...sig, ...updates } : sig
            ),
          }),
          false,
          'updateSignal'
        ),

      removeSignal: (id: string) =>
        set(
          (state) => ({
            signals: state.signals.filter((sig) => sig.id !== id),
          }),
          false,
          'removeSignal'
        ),

      clearSignals: () =>
        set({ signals: [] }, false, 'clearSignals'),

      // Reset
      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'llm-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for common queries
export const selectMessagesByRole = (state: LLMState, role: ChatMessage['role']) =>
  state.messages.filter((msg) => msg.role === role);

export const selectCurrentProviderDetails = (state: LLMState) =>
  state.providers.find((provider) => provider.id === state.currentProvider);

export const selectEnabledProviders = (state: LLMState) =>
  state.providers.filter((provider) => provider.enabled);

export const selectMessagesWithSignals = (state: LLMState) =>
  state.messages.filter((msg) => msg.metadata?.tradeSignal);

export const selectLastMessage = (state: LLMState) =>
  state.messages[state.messages.length - 1];

export const selectAverageResponseTime = (state: LLMState) => {
  const messagesWithTime = state.messages.filter(
    (msg) => msg.metadata?.responseTime
  );
  if (messagesWithTime.length === 0) return 0;
  
  const total = messagesWithTime.reduce(
    (sum, msg) => sum + (msg.metadata?.responseTime || 0),
    0
  );
  return total / messagesWithTime.length;
};
