import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AuthState, User, ApiKeyStatus, UserPreferences } from '../types/store.types';

const defaultPreferences: UserPreferences = {
  theme: 'system',
  defaultSymbol: 'BTC/USD',
  defaultTimeframe: '15m',
  notificationsEnabled: true,
  soundEnabled: true,
  autoExecuteSignals: false,
};

const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  apiKeyStatuses: [],
  preferences: defaultPreferences,
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // User actions
        setUser: (user: User | null) =>
          set({ user }, false, 'setUser'),

        // Token actions
        setTokens: (token: string, refreshToken: string) =>
          set(
            {
              token,
              refreshToken,
              isAuthenticated: true,
              error: null,
            },
            false,
            'setTokens'
          ),

        clearTokens: () =>
          set(
            {
              token: null,
              refreshToken: null,
              isAuthenticated: false,
            },
            false,
            'clearTokens'
          ),

        // Authentication state
        setAuthenticated: (isAuthenticated: boolean) =>
          set({ isAuthenticated }, false, 'setAuthenticated'),

        // API key status actions
        setApiKeyStatuses: (statuses: ApiKeyStatus[]) =>
          set({ apiKeyStatuses: statuses }, false, 'setApiKeyStatuses'),

        updateApiKeyStatus: (provider: string, status: Partial<ApiKeyStatus>) =>
          set(
            (state) => {
              const existingIndex = state.apiKeyStatuses.findIndex(
                (s) => s.provider === provider
              );

              if (existingIndex >= 0) {
                // Update existing status
                const updated = [...state.apiKeyStatuses];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  ...status,
                  lastChecked: new Date(),
                };
                return { apiKeyStatuses: updated };
              } else {
                // Add new status
                return {
                  apiKeyStatuses: [
                    ...state.apiKeyStatuses,
                    {
                      provider,
                      isConfigured: false,
                      isValid: false,
                      ...status,
                      lastChecked: new Date(),
                    },
                  ],
                };
              }
            },
            false,
            'updateApiKeyStatus'
          ),

        // Preferences actions
        setPreferences: (preferences: Partial<UserPreferences>) =>
          set(
            (state) => ({
              preferences: {
                ...state.preferences,
                ...preferences,
              },
            }),
            false,
            'setPreferences'
          ),

        // UI state actions
        setLoading: (isLoading: boolean) =>
          set({ isLoading }, false, 'setLoading'),

        setError: (error: string | null) =>
          set({ error }, false, 'setError'),

        // Logout
        logout: () =>
          set(
            {
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              error: null,
            },
            false,
            'logout'
          ),

        // Reset
        reset: () =>
          set(
            {
              ...initialState,
              preferences: initialState.preferences, // Keep preferences
            },
            false,
            'reset'
          ),
      }),
      {
        name: 'auth-storage', // localStorage key
        partialize: (state) => ({
          // Only persist these fields
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user,
          preferences: state.preferences,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for common queries
export const selectIsAuthenticated = (state: AuthState) =>
  state.isAuthenticated && !!state.token;

export const selectUserEmail = (state: AuthState) =>
  state.user?.email;

export const selectApiKeyStatus = (state: AuthState, provider: string) =>
  state.apiKeyStatuses.find((status) => status.provider === provider);

export const selectIsApiKeyConfigured = (state: AuthState, provider: string) =>
  state.apiKeyStatuses.find((status) => status.provider === provider)?.isConfigured || false;

export const selectAllApiKeysConfigured = (state: AuthState) =>
  state.apiKeyStatuses.length > 0 &&
  state.apiKeyStatuses.every((status) => status.isConfigured);

export const selectTheme = (state: AuthState) =>
  state.preferences.theme;

export const selectDefaultSymbol = (state: AuthState) =>
  state.preferences.defaultSymbol;

export const selectShouldAutoExecute = (state: AuthState) =>
  state.preferences.autoExecuteSignals;
