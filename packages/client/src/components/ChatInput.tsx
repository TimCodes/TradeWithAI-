import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from './ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * ChatInput Component
 * 
 * Message input area with:
 * - Auto-resizing textarea
 * - Send button with loading state
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Character limit indicator
 * - Disabled state during processing
 */
export const ChatInput = ({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask about trading strategies, market analysis, or get trade recommendations...',
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 4000;

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) return;

    onSend(trimmedMessage);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift sends the message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || isLoading;
  const canSend = message.trim().length > 0 && !isDisabled;
  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.9;

  return (
    <div className="border-t border-slate-700 bg-slate-900 p-4">
      <div className="flex flex-col gap-2">
        {/* Textarea Container */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={1}
            className="w-full resize-none rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              maxHeight: '200px',
              minHeight: '44px',
            }}
          />

          {/* Send Button (inside textarea) */}
          <div className="absolute right-2 bottom-2">
            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Sending...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                  </svg>
                  <span className="hidden sm:inline">Send</span>
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Footer with character count and keyboard shortcut hint */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs">Enter</kbd> to send
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs">Shift+Enter</kbd> for new line
            </span>
          </div>

          {/* Character Count */}
          <span className={isNearLimit ? 'text-orange-400' : ''}>
            {characterCount} / {maxLength}
          </span>
        </div>
      </div>
    </div>
  );
};
