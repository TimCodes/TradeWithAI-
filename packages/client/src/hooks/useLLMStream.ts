import { useEffect, useCallback, useRef, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import { useLLMStore } from '../stores/useLLMStore';
import type { ChatMessage } from '../types/store.types';

interface UseLLMStreamOptions {
  autoSubscribe?: boolean;
  onStreamStart?: (sessionId: string) => void;
  onStreamToken?: (token: string) => void;
  onStreamDone?: (fullResponse: string) => void;
  onStreamError?: (error: string) => void;
  onStreamCancelled?: () => void;
}

interface UseLLMStreamReturn {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  currentSessionId: string | null;
  subscribe: () => void;
  unsubscribe: () => void;
  sendMessage: (message: string, provider?: string) => void;
  cancelStream: () => void;
  streamingContent: string;
}

/**
 * React Hook for LLM Response Streaming via WebSocket
 * 
 * Features:
 * - Stream LLM responses token by token
 * - Support for all LLM providers
 * - Stream cancellation support
 * - Automatic message store updates
 * - Typing indicator during streaming
 * - Error handling with graceful recovery
 * 
 * @example
 * ```tsx
 * const { 
 *   isStreaming, 
 *   sendMessage, 
 *   cancelStream,
 *   streamingContent 
 * } = useLLMStream({
 *   autoSubscribe: true,
 *   onStreamDone: (response) => {
 *     toast.success('Response complete!');
 *   },
 * });
 * 
 * // Send a message
 * sendMessage('What is the current BTC price?', 'openai');
 * 
 * // Cancel if needed
 * if (isStreaming) {
 *   cancelStream();
 * }
 * ```
 */
export function useLLMStream(options: UseLLMStreamOptions = {}): UseLLMStreamReturn {
  const {
    autoSubscribe = false,
    onStreamStart,
    onStreamToken,
    onStreamDone,
    onStreamError,
    onStreamCancelled,
  } = options;

  const { status, error, on, off, emit, subscribe: wsSubscribe, unsubscribe: wsUnsubscribe } = useWebSocket();
  
  const {
    addMessage,
    updateMessage,
    setStreaming,
    setError,
    currentProvider,
    messages,
  } = useLLMStore();

  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const streamingMessageIdRef = useRef<string | null>(null);

  /**
   * Generate unique session ID
   */
  const generateSessionId = useCallback((): string => {
    return `stream-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }, []);

  /**
   * Handle stream start event
   */
  const handleStreamStart = useCallback((data: any) => {
    console.log('[LLM Stream] Stream started:', data.sessionId);
    
    setIsStreaming(true);
    setStreaming(true);
    setCurrentSessionId(data.sessionId);
    setStreamingContent('');

    // Create a new message in the store for the assistant's response
    const messageId = `msg-${Date.now()}`;
    streamingMessageIdRef.current = messageId;

    const assistantMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '',
      provider: data.provider,
      timestamp: new Date(),
      isStreaming: true,
    };

    addMessage(assistantMessage);

    // Call optional callback
    if (onStreamStart) {
      onStreamStart(data.sessionId);
    }
  }, [addMessage, setStreaming, onStreamStart]);

  /**
   * Handle stream token event
   */
  const handleStreamToken = useCallback((data: any) => {
    const token = data.token;

    // Append to streaming content
    setStreamingContent((prev) => prev + token);

    // Update the message in the store
    if (streamingMessageIdRef.current) {
      updateMessage(streamingMessageIdRef.current, {
        content: (messages.find(m => m.id === streamingMessageIdRef.current)?.content || '') + token,
      });
    }

    // Call optional callback
    if (onStreamToken) {
      onStreamToken(token);
    }
  }, [updateMessage, messages, onStreamToken]);

  /**
   * Handle stream done event
   */
  const handleStreamDone = useCallback((data: any) => {
    console.log('[LLM Stream] Stream completed:', {
      sessionId: data.sessionId,
      tokenCount: data.tokenCount,
    });

    setIsStreaming(false);
    setStreaming(false);
    setCurrentSessionId(null);

    // Finalize the message in the store
    if (streamingMessageIdRef.current) {
      updateMessage(streamingMessageIdRef.current, {
        content: data.fullResponse,
        isStreaming: false,
        metadata: {
          responseTime: 0, // Could calculate based on timestamps
          confidence: undefined,
        },
      });
      streamingMessageIdRef.current = null;
    }

    // Call optional callback
    if (onStreamDone) {
      onStreamDone(data.fullResponse);
    }

    // Reset streaming content
    setStreamingContent('');
  }, [updateMessage, setStreaming, onStreamDone]);

  /**
   * Handle stream error event
   */
  const handleStreamError = useCallback((data: any) => {
    console.error('[LLM Stream] Stream error:', data.error);

    setIsStreaming(false);
    setStreaming(false);
    setCurrentSessionId(null);
    setError(data.error);

    // Update message with error
    if (streamingMessageIdRef.current) {
      updateMessage(streamingMessageIdRef.current, {
        isStreaming: false,
        content: `Error: ${data.error}`,
      });
      streamingMessageIdRef.current = null;
    }

    // Call optional callback
    if (onStreamError) {
      onStreamError(data.error);
    }

    // Reset streaming content
    setStreamingContent('');
  }, [updateMessage, setStreaming, setError, onStreamError]);

  /**
   * Handle stream cancelled event
   */
  const handleStreamCancelled = useCallback((data: any) => {
    console.log('[LLM Stream] Stream cancelled:', data.sessionId);

    setIsStreaming(false);
    setStreaming(false);
    setCurrentSessionId(null);

    // Mark message as cancelled
    if (streamingMessageIdRef.current) {
      updateMessage(streamingMessageIdRef.current, {
        isStreaming: false,
        content: streamingContent + ' [Cancelled]',
      });
      streamingMessageIdRef.current = null;
    }

    // Call optional callback
    if (onStreamCancelled) {
      onStreamCancelled();
    }

    // Reset streaming content
    setStreamingContent('');
  }, [updateMessage, setStreaming, streamingContent, onStreamCancelled]);

  /**
   * Send a chat message and start streaming response
   */
  const sendMessage = useCallback((message: string, provider?: string) => {
    if (!message.trim()) {
      console.warn('[LLM Stream] Cannot send empty message');
      return;
    }

    // Generate session ID
    const sessionId = generateSessionId();

    // Add user message to store
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    // Build messages array for context
    const chatHistory = [
      ...messages.filter(m => !m.isStreaming),
      userMessage,
    ];

    // Emit stream request to server
    console.log('[LLM Stream] Requesting stream:', {
      sessionId,
      provider: provider || currentProvider,
    });

    emit('llm:stream:request', {
      sessionId,
      provider: provider || currentProvider,
      messages: chatHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });
  }, [emit, addMessage, messages, currentProvider, generateSessionId]);

  /**
   * Cancel the current streaming session
   */
  const cancelStream = useCallback(() => {
    if (!currentSessionId) {
      console.warn('[LLM Stream] No active stream to cancel');
      return;
    }

    console.log('[LLM Stream] Cancelling stream:', currentSessionId);
    emit('llm:stream:cancel', { sessionId: currentSessionId });
  }, [currentSessionId, emit]);

  /**
   * Subscribe to LLM events
   */
  const subscribe = useCallback(() => {
    console.log('[LLM Stream] Subscribing to llm channel');
    wsSubscribe('llm');
  }, [wsSubscribe]);

  /**
   * Unsubscribe from LLM events
   */
  const unsubscribe = useCallback(() => {
    console.log('[LLM Stream] Unsubscribing from llm channel');
    wsUnsubscribe('llm');
  }, [wsUnsubscribe]);

  /**
   * Setup WebSocket event listeners
   */
  useEffect(() => {
    // Register event handlers
    on('llm:stream:start', handleStreamStart);
    on('llm:stream:token', handleStreamToken);
    on('llm:stream:done', handleStreamDone);
    on('llm:stream:error', handleStreamError);
    on('llm:stream:cancelled', handleStreamCancelled);

    return () => {
      // Cleanup event handlers
      off('llm:stream:start', handleStreamStart);
      off('llm:stream:token', handleStreamToken);
      off('llm:stream:done', handleStreamDone);
      off('llm:stream:error', handleStreamError);
      off('llm:stream:cancelled', handleStreamCancelled);
    };
  }, [
    on,
    off,
    handleStreamStart,
    handleStreamToken,
    handleStreamDone,
    handleStreamError,
    handleStreamCancelled,
  ]);

  /**
   * Update error in store
   */
  useEffect(() => {
    if (error) {
      setError(error);
    }
  }, [error, setError]);

  /**
   * Auto-subscribe on mount if enabled
   */
  useEffect(() => {
    if (autoSubscribe && status === 'connected') {
      subscribe();
    }
  }, [autoSubscribe, status]); // Only subscribe when connection status changes

  /**
   * Cleanup on unmount - cancel any active streams
   */
  useEffect(() => {
    return () => {
      if (currentSessionId) {
        cancelStream();
      }
    };
  }, []); // Only run on unmount

  return {
    isConnected: status === 'connected',
    isStreaming,
    error,
    currentSessionId,
    subscribe,
    unsubscribe,
    sendMessage,
    cancelStream,
    streamingContent,
  };
}
