import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface ArenaMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  responseTime?: number;
}

export interface ModelPanel {
  id: string;
  providerId: string;
  providerName: string;
  messages: ArenaMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  responseTime?: number;
  votes: {
    up: number;
    down: number;
    userVote?: 'up' | 'down';
  };
}

export interface ArenaSession {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  panels: ModelPanel[];
  sharedPrompts: string[];
}

interface ArenaState {
  // Current session
  currentSession: ArenaSession | null;
  
  // Saved sessions
  savedSessions: ArenaSession[];
  
  // Actions
  createSession: (name: string, providerIds: string[]) => void;
  loadSession: (sessionId: string) => void;
  saveSession: () => void;
  deleteSession: (sessionId: string) => void;
  
  // Panel actions
  updatePanel: (panelId: string, updates: Partial<ModelPanel>) => void;
  addMessageToPanel: (panelId: string, message: ArenaMessage) => void;
  updateMessageInPanel: (panelId: string, messageId: string, updates: Partial<ArenaMessage>) => void;
  
  // Voting actions
  votePanel: (panelId: string, vote: 'up' | 'down') => void;
  clearVote: (panelId: string) => void;
  
  // Shared prompt actions
  addSharedPrompt: (prompt: string) => void;
  
  // Reset
  reset: () => void;
}

const createInitialPanel = (providerId: string, providerName: string): ModelPanel => ({
  id: `panel-${providerId}-${Date.now()}`,
  providerId,
  providerName,
  messages: [],
  isStreaming: false,
  isLoading: false,
  error: null,
  votes: {
    up: 0,
    down: 0,
  },
});

export const useArenaStore = create<ArenaState>()(
  devtools(
    persist(
      (set, get) => ({
        currentSession: null,
        savedSessions: [],

        createSession: (name: string, providerIds: string[]) => {
          const providerNames: Record<string, string> = {
            'openai': 'OpenAI GPT-4',
            'anthropic': 'Claude',
            'google': 'Gemini',
            'deepseek': 'DeepSeek',
            'xai': 'Grok',
            'mistral': 'Mistral',
            'perplexity': 'Perplexity',
          };

          const panels = providerIds.map(id => 
            createInitialPanel(id, providerNames[id] || id)
          );

          const session: ArenaSession = {
            id: `session-${Date.now()}`,
            name,
            createdAt: new Date(),
            updatedAt: new Date(),
            panels,
            sharedPrompts: [],
          };

          set({ currentSession: session }, false, 'createSession');
        },

        loadSession: (sessionId: string) => {
          const session = get().savedSessions.find(s => s.id === sessionId);
          if (session) {
            set({ currentSession: session }, false, 'loadSession');
          }
        },

        saveSession: () => {
          const { currentSession, savedSessions } = get();
          if (!currentSession) return;

          const updatedSession = {
            ...currentSession,
            updatedAt: new Date(),
          };

          const existingIndex = savedSessions.findIndex(s => s.id === currentSession.id);
          
          if (existingIndex >= 0) {
            // Update existing session
            const newSessions = [...savedSessions];
            newSessions[existingIndex] = updatedSession;
            set({ 
              currentSession: updatedSession,
              savedSessions: newSessions 
            }, false, 'saveSession');
          } else {
            // Add new session
            set({ 
              currentSession: updatedSession,
              savedSessions: [...savedSessions, updatedSession] 
            }, false, 'saveSession');
          }
        },

        deleteSession: (sessionId: string) => {
          set((state) => ({
            savedSessions: state.savedSessions.filter(s => s.id !== sessionId),
            currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
          }), false, 'deleteSession');
        },

        updatePanel: (panelId: string, updates: Partial<ModelPanel>) => {
          set((state) => {
            if (!state.currentSession) return state;

            return {
              currentSession: {
                ...state.currentSession,
                panels: state.currentSession.panels.map(panel =>
                  panel.id === panelId ? { ...panel, ...updates } : panel
                ),
                updatedAt: new Date(),
              },
            };
          }, false, 'updatePanel');
        },

        addMessageToPanel: (panelId: string, message: ArenaMessage) => {
          set((state) => {
            if (!state.currentSession) return state;

            return {
              currentSession: {
                ...state.currentSession,
                panels: state.currentSession.panels.map(panel =>
                  panel.id === panelId
                    ? { ...panel, messages: [...panel.messages, message] }
                    : panel
                ),
                updatedAt: new Date(),
              },
            };
          }, false, 'addMessageToPanel');
        },

        updateMessageInPanel: (panelId: string, messageId: string, updates: Partial<ArenaMessage>) => {
          set((state) => {
            if (!state.currentSession) return state;

            return {
              currentSession: {
                ...state.currentSession,
                panels: state.currentSession.panels.map(panel =>
                  panel.id === panelId
                    ? {
                        ...panel,
                        messages: panel.messages.map(msg =>
                          msg.id === messageId ? { ...msg, ...updates } : msg
                        ),
                      }
                    : panel
                ),
                updatedAt: new Date(),
              },
            };
          }, false, 'updateMessageInPanel');
        },

        votePanel: (panelId: string, vote: 'up' | 'down') => {
          set((state) => {
            if (!state.currentSession) return state;

            return {
              currentSession: {
                ...state.currentSession,
                panels: state.currentSession.panels.map(panel => {
                  if (panel.id !== panelId) return panel;

                  const currentVote = panel.votes.userVote;
                  let newVotes = { ...panel.votes };

                  // Remove previous vote if exists
                  if (currentVote === 'up') newVotes.up--;
                  if (currentVote === 'down') newVotes.down--;

                  // Add new vote
                  if (vote === 'up') newVotes.up++;
                  if (vote === 'down') newVotes.down++;

                  newVotes.userVote = vote;

                  return {
                    ...panel,
                    votes: newVotes,
                  };
                }),
                updatedAt: new Date(),
              },
            };
          }, false, 'votePanel');
        },

        clearVote: (panelId: string) => {
          set((state) => {
            if (!state.currentSession) return state;

            return {
              currentSession: {
                ...state.currentSession,
                panels: state.currentSession.panels.map(panel => {
                  if (panel.id !== panelId) return panel;

                  const currentVote = panel.votes.userVote;
                  let newVotes = { ...panel.votes };

                  // Remove vote
                  if (currentVote === 'up') newVotes.up--;
                  if (currentVote === 'down') newVotes.down--;
                  newVotes.userVote = undefined;

                  return {
                    ...panel,
                    votes: newVotes,
                  };
                }),
                updatedAt: new Date(),
              },
            };
          }, false, 'clearVote');
        },

        addSharedPrompt: (prompt: string) => {
          set((state) => {
            if (!state.currentSession) return state;

            return {
              currentSession: {
                ...state.currentSession,
                sharedPrompts: [...state.currentSession.sharedPrompts, prompt],
                updatedAt: new Date(),
              },
            };
          }, false, 'addSharedPrompt');
        },

        reset: () => {
          set({ currentSession: null }, false, 'reset');
        },
      }),
      {
        name: 'arena-storage',
        partialize: (state) => ({ savedSessions: state.savedSessions }),
      }
    ),
    {
      name: 'arena-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors
export const selectCurrentPanels = (state: ArenaState) =>
  state.currentSession?.panels || [];

export const selectPanelById = (state: ArenaState, panelId: string) =>
  state.currentSession?.panels.find(p => p.id === panelId);

export const selectPanelsByProvider = (state: ArenaState, providerId: string) =>
  state.currentSession?.panels.filter(p => p.providerId === providerId) || [];

export const selectAverageResponseTime = (state: ArenaState) => {
  const panels = state.currentSession?.panels || [];
  const timesWithValues = panels
    .filter(p => p.responseTime !== undefined)
    .map(p => p.responseTime!);
  
  if (timesWithValues.length === 0) return 0;
  return timesWithValues.reduce((a, b) => a + b, 0) / timesWithValues.length;
};

export const selectTopVotedPanel = (state: ArenaState) => {
  const panels = state.currentSession?.panels || [];
  if (panels.length === 0) return null;

  return panels.reduce((best, current) => {
    const bestScore = best.votes.up - best.votes.down;
    const currentScore = current.votes.up - current.votes.down;
    return currentScore > bestScore ? current : best;
  });
};
