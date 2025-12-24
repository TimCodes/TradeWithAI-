import { memo } from 'react';
import type { ChatMessage as ChatMessageType } from '../types/store.types';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * ChatMessage Component
 * 
 * Displays a single chat message with:
 * - Different styling for user vs assistant messages
 * - Provider name badge for assistant messages
 * - Timestamp
 * - Streaming indicator
 * - Trade signal highlighting (if present)
 */
export const ChatMessage = memo(({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Format timestamp
  const timestamp = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex gap-3 mb-4 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          isUser
            ? 'bg-blue-500 text-white'
            : isAssistant
            ? 'bg-purple-500 text-white'
            : 'bg-gray-500 text-white'
        }`}
      >
        {isUser ? 'You' : isAssistant ? 'AI' : 'S'}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 max-w-[80%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Provider Badge (for assistant messages) */}
        {isAssistant && message.provider && (
          <div className="mb-1">
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded">
              {message.provider}
            </span>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : isAssistant
              ? 'bg-slate-800 text-slate-100 border border-slate-700'
              : 'bg-slate-700 text-slate-300 border border-slate-600'
          }`}
        >
          {/* Content */}
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
            
            {/* Streaming Indicator */}
            {message.isStreaming && (
              <span className="inline-block ml-2 w-2 h-4 bg-current animate-pulse" />
            )}
          </div>

          {/* Trade Signal Indicator */}
          {message.metadata?.tradeSignal && (
            <div className="mt-2 pt-2 border-t border-slate-600">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  📊
                  <span className="font-semibold">Trade Signal:</span>
                  <span
                    className={`font-bold ${
                      message.metadata.tradeSignal.action === 'buy'
                        ? 'text-green-400'
                        : message.metadata.tradeSignal.action === 'sell'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {message.metadata.tradeSignal.action.toUpperCase()}
                  </span>
                  {message.metadata.tradeSignal.symbol}
                </span>
                {message.metadata.confidence && (
                  <span className="text-slate-400">
                    • {Math.round(message.metadata.confidence * 100)}% confidence
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Response Time (for assistant messages) */}
          {isAssistant && message.metadata?.responseTime && (
            <div className="mt-1 text-xs text-slate-500">
              Response time: {message.metadata.responseTime}ms
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`mt-1 text-xs text-slate-500 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {timestamp}
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';
