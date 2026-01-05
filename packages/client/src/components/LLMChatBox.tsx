import { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ContextDisplay } from './ContextDisplay';
import { TradeSignalCard } from './TradeSignalCard';
import { useLLMStore } from '../stores';
import { useSendMessage, useChatHistory, useProviders } from '../hooks/useApi';
import { useLLMStream } from '../hooks/useLLMStream';

interface LLMChatBoxProps {
  sessionId?: string;
  className?: string;
}

/**
 * LLMChatBox Component
 * 
 * Main chat interface with:
 * - Message display area with auto-scroll
 * - Provider selector dropdown
 * - Message input with send button
 * - Real-time streaming support via WebSocket
 * - Typing indicator during streaming
 * - Message history loading
 * - Error handling
 */
export const LLMChatBox = ({ sessionId, className = '' }: LLMChatBoxProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic' | 'google' | 'groq'>('openai');
  const [autoScroll, setAutoScroll] = useState(true);
  const [includeContext, setIncludeContext] = useState(true); // NEW: Toggle for trading context

  // Zustand store
  const { messages, addMessage, signals, addSignals, updateSignal, removeSignal } = useLLMStore();

  // React Query hooks
  const { data: chatHistory, isLoading: isLoadingHistory } = useChatHistory(sessionId);
  const { data: providersData, isLoading: isLoadingProviders } = useProviders();
  const sendMessageMutation = useSendMessage();

  // WebSocket streaming
  const { 
    isConnected, 
    isStreaming
  } = useLLMStream({
    autoSubscribe: true,
    onStreamDone: (fullResponse) => {
      console.log('Stream completed:', fullResponse);
    },
    onStreamError: (error) => {
      console.error('LLM streaming error:', error);
      addMessage({
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Error: ${error}`,
        timestamp: new Date(),
      });
    },
  });

  // Load chat history on mount
  useEffect(() => {
    if (chatHistory && Array.isArray(chatHistory)) {
      // Initialize messages from history
      chatHistory.forEach((msg) => {
        addMessage(msg);
      });
    }
  }, [chatHistory, addMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    // Add user message immediately
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    // Send message via API (WebSocket will handle the streaming response)
    try {
      const response = await sendMessageMutation.mutateAsync({
        message: content,
        provider: selectedProvider,
        includeContext, // Use the toggle state
      });
      
      // Check if response contains signals
      if (response && response.signals && response.signals.length > 0) {
        addSignals(response.signals);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage({
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      });
    }
  };

  const handleExecuteSignal = async (signalId: string) => {
    // Mark signal as being executed
    updateSignal(signalId, { executed: true, executedAt: new Date() });
    
    // TODO: Actually execute the trade via trading service
    console.log('Executing signal:', signalId);
  };

  const handleDismissSignal = (signalId: string) => {
    removeSignal(signalId);
  };

  const isSending = sendMessageMutation.isPending;

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Header with Provider Selector */}
      <div className="flex items-center justify-between border-b border-slate-700 p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-100">AI Trading Assistant</h2>
          {isConnected && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Connected
            </span>
          )}
        </div>

        {/* Provider Selector & Context Toggle */}
        <div className="flex items-center gap-4">
          {/* Trading Context Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              disabled={isStreaming}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-slate-400">Include Trading Context</span>
          </label>

          {/* Provider Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="provider-select" className="text-sm text-slate-400">
              Provider:
            </label>
            <select
              id="provider-select"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as typeof selectedProvider)}
              disabled={isLoadingProviders || isStreaming}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingProviders ? (
                <option>Loading...</option>
              ) : providersData && Array.isArray(providersData) ? (
                providersData.map((provider: any) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="groq">Groq</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Trading Context Display (when enabled) */}
      {includeContext && (
        <div className="px-4 pt-3">
          <ContextDisplay />
        </div>
      )}

      {/* Messages Display Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {/* Loading State */}
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Loading chat history...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8 text-purple-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              Start a conversation
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              Ask me about trading strategies, market analysis, technical indicators,
              or get personalized trade recommendations based on your portfolio.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Trade Signals */}
        {signals.length > 0 && (
          <div className="space-y-2">
            {signals
              .filter((sig) => !sig.executed)
              .map((signal) => (
                <TradeSignalCard
                  key={signal.id}
                  signal={signal}
                  onExecute={handleExecuteSignal}
                  onDismiss={handleDismissSignal}
                  isExecuting={false}
                />
              ))}
          </div>
        )}

        {/* Typing Indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>AI is typing...</span>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />

        {/* Scroll to bottom button (when not auto-scrolling) */}
        {!autoScroll && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-8 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all"
            title="Scroll to bottom"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Message Input */}
      <ChatInput
        onSend={handleSendMessage}
        isLoading={isSending || isStreaming}
        disabled={!isConnected}
      />
    </Card>
  );
};
