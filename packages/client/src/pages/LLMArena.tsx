import { useState, useEffect } from 'react';
import { ModelComparisonPanel } from '../components/ModelComparisonPanel';
import { ModelPerformanceStats } from '../components/ModelPerformanceStats';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useArenaStore, selectCurrentPanels } from '../stores/useArenaStore';
import { useSendMessage } from '../hooks/useApi';
import { useLLMStream } from '../hooks/useLLMStream';

/**
 * LLMArena Page
 * 
 * Multi-model comparison interface featuring:
 * - Side-by-side chat panels for multiple LLM providers
 * - Shared prompt input sent to all models
 * - Parallel streaming responses
 * - Response time tracking
 * - Voting system for model comparison
 * - Session saving and loading
 */
export function LLMArena() {
  const [sharedPrompt, setSharedPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [includeContext, setIncludeContext] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const {
    currentSession,
    savedSessions,
    createSession,
    loadSession,
    saveSession,
    deleteSession,
    updatePanel,
    addMessageToPanel,
    updateMessageInPanel,
    addSharedPrompt,
  } = useArenaStore();

  const sendMessageMutation = useSendMessage();
  const panels = selectCurrentPanels(useArenaStore.getState());

  // WebSocket streaming setup
  const { isConnected } = useLLMStream({
    autoSubscribe: true,
    onStreamDone: (fullResponse) => {
      console.log('Arena stream completed:', fullResponse);
    },
    onStreamError: (error) => {
      console.error('Arena streaming error:', error);
    },
  });

  // Default providers for new session
  const defaultProviders = ['openai', 'anthropic', 'google'];

  // Auto-create session on mount if none exists
  useEffect(() => {
    if (!currentSession) {
      createSession('Arena Session ' + new Date().toLocaleTimeString(), defaultProviders);
    }
  }, []);

  const handleCreateSession = () => {
    if (!sessionName.trim()) {
      alert('Please enter a session name');
      return;
    }
    createSession(sessionName, defaultProviders);
    setSessionName('');
    setIsCreatingSession(false);
  };

  const handleLoadSession = (sessionId: string) => {
    loadSession(sessionId);
  };

  const handleSaveSession = () => {
    saveSession();
    alert('Session saved successfully!');
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      deleteSession(sessionId);
    }
  };

  const handleSendToAll = async () => {
    if (!sharedPrompt.trim() || !currentSession) return;

    setIsSending(true);
    addSharedPrompt(sharedPrompt);

    // Add user message to all panels
    const userMessageId = `user-${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      role: 'user' as const,
      content: sharedPrompt,
      timestamp: new Date(),
    };

    currentSession.panels.forEach(panel => {
      addMessageToPanel(panel.id, userMessage);
      updatePanel(panel.id, { isLoading: true, error: null });
    });

    // Send to each provider in parallel
    const sendPromises = currentSession.panels.map(async (panel) => {
      const startTime = Date.now();
      
      try {
        // Create assistant message placeholder for streaming
        const assistantMessageId = `assistant-${panel.id}-${Date.now()}`;
        const assistantMessage = {
          id: assistantMessageId,
          role: 'assistant' as const,
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        };
        
        addMessageToPanel(panel.id, assistantMessage);
        updatePanel(panel.id, { isStreaming: true, isLoading: false });

        // Send request to backend
        const response = await sendMessageMutation.mutateAsync({
          message: sharedPrompt,
          provider: panel.providerId as any,
          includeContext,
        });

        const responseTime = Date.now() - startTime;

        // Update with final response
        updateMessageInPanel(panel.id, assistantMessageId, {
          content: response.response || response.message?.content || 'No response',
          isStreaming: false,
          responseTime,
        });

        updatePanel(panel.id, {
          isStreaming: false,
          isLoading: false,
          responseTime,
        });

      } catch (error) {
        console.error(`Error from ${panel.providerName}:`, error);
        updatePanel(panel.id, {
          isStreaming: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.all(sendPromises);
    setIsSending(false);
    setSharedPrompt('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendToAll();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LLM Arena</h1>
          <p className="text-slate-400">Compare AI models side-by-side</p>
        </div>

        {/* Session Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            WebSocket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          
          {isCreatingSession ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Session name..."
                className="px-3 py-1 text-sm bg-slate-800 border border-slate-700 rounded"
              />
              <Button size="sm" onClick={handleCreateSession}>
                Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsCreatingSession(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsCreatingSession(true)}>
                + New Session
              </Button>
              {currentSession && (
                <Button size="sm" onClick={handleSaveSession}>
                  Save Session
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Saved Sessions */}
      {savedSessions.length > 0 && (
        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-2">Saved Sessions</h3>
          <div className="flex flex-wrap gap-2">
            {savedSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded border border-slate-700"
              >
                <button
                  onClick={() => handleLoadSession(session.id)}
                  className="text-sm text-slate-300 hover:text-white"
                >
                  {session.name}
                </button>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Model Performance Stats */}
      <ModelPerformanceStats className="w-full" />

      {/* Model Comparison Panels */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {panels.length === 0 ? (
          <div className="col-span-full flex items-center justify-center text-slate-500">
            <p>Create a session to start comparing models</p>
          </div>
        ) : (
          panels.map((panel) => (
            <ModelComparisonPanel
              key={panel.id}
              panel={panel}
              className="h-full"
            />
          ))
        )}
      </div>

      {/* Shared Input Area */}
      <Card className="p-4">
        <div className="space-y-3">
          {/* Context Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeContext"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="includeContext" className="text-sm text-slate-400">
              Include trading context (positions, balance, market data)
            </label>
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <textarea
              value={sharedPrompt}
              onChange={(e) => setSharedPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message to send to all models..."
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg 
                       text-slate-100 placeholder-slate-500 resize-none focus:outline-none 
                       focus:border-blue-500 transition-colors"
              rows={3}
              disabled={isSending || !currentSession}
            />
            <Button
              onClick={handleSendToAll}
              disabled={isSending || !sharedPrompt.trim() || !currentSession}
              className="px-6"
            >
              {isSending ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Sending...
                </span>
              ) : (
                'Send to All'
              )}
            </Button>
          </div>

          {/* Status */}
          {isSending && (
            <div className="text-xs text-slate-400">
              Sending to {panels.length} model{panels.length !== 1 ? 's' : ''}...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}