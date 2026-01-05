import { useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ChatMessage } from './ChatMessage';
import type { ModelPanel } from '../stores/useArenaStore';
import { useArenaStore } from '../stores/useArenaStore';

interface ModelComparisonPanelProps {
  panel: ModelPanel;
  onVote?: (panelId: string, vote: 'up' | 'down') => void;
  className?: string;
}

/**
 * ModelComparisonPanel Component
 * 
 * Individual panel for LLM Arena showing:
 * - Model name and selector
 * - Chat messages
 * - Streaming indicator
 * - Response time
 * - Voting buttons (thumbs up/down)
 * - Auto-scroll to latest message
 */
export const ModelComparisonPanel = ({ 
  panel, 
  onVote, 
  className = '' 
}: ModelComparisonPanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { votePanel, clearVote } = useArenaStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [panel.messages]);

  const handleVote = (vote: 'up' | 'down') => {
    if (panel.votes.userVote === vote) {
      // If clicking the same vote, clear it
      clearVote(panel.id);
    } else {
      // Otherwise, set the new vote
      votePanel(panel.id, vote);
      if (onVote) {
        onVote(panel.id, vote);
      }
    }
  };

  const getVoteScore = () => {
    return panel.votes.up - panel.votes.down;
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Header with Model Name and Stats */}
      <div className="flex items-center justify-between border-b border-slate-700 p-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-slate-100">
            {panel.providerName}
          </h3>
          {panel.responseTime !== undefined && (
            <span className="text-xs text-slate-400">
              {panel.responseTime}ms response
            </span>
          )}
        </div>

        {/* Voting Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={panel.votes.userVote === 'up' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleVote('up')}
            className="h-8 w-8 p-0"
            title="Vote up"
          >
            👍
          </Button>
          <span className="text-xs font-medium text-slate-300 min-w-[24px] text-center">
            {getVoteScore()}
          </span>
          <Button
            variant={panel.votes.userVote === 'down' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => handleVote('down')}
            className="h-8 w-8 p-0"
            title="Vote down"
          >
            👎
          </Button>
        </div>
      </div>

      {/* Messages Display Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-950/50"
      >
        {panel.messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Waiting for messages...
          </div>
        ) : (
          <>
            {panel.messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{
                  ...message,
                  provider: panel.providerName,
                }}
              />
            ))}
            {/* Streaming indicator */}
            {panel.isStreaming && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <div className="flex gap-1">
                  <span className="animate-bounce delay-0">●</span>
                  <span className="animate-bounce delay-100">●</span>
                  <span className="animate-bounce delay-200">●</span>
                </div>
                <span>{panel.providerName} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Display */}
      {panel.error && (
        <div className="border-t border-red-900/50 bg-red-950/20 p-2">
          <p className="text-xs text-red-400">
            Error: {panel.error}
          </p>
        </div>
      )}

      {/* Loading Indicator */}
      {panel.isLoading && !panel.isStreaming && (
        <div className="border-t border-slate-700 p-2 bg-slate-900/50">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <div className="animate-spin h-3 w-3 border-2 border-slate-500 border-t-transparent rounded-full" />
            <span>Loading...</span>
          </div>
        </div>
      )}
    </Card>
  );
};
