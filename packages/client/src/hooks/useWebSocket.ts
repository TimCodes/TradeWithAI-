import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/useAuthStore';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  status: ConnectionStatus;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  subscribe: (channel: string, symbols?: string[]) => void;
  unsubscribe: (channel: string, symbols?: string[]) => void;
}

/**
 * Base WebSocket Hook using Socket.IO
 * 
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Connection status tracking
 * - JWT authentication
 * - Cleanup on unmount
 * - Event subscription/unsubscription
 * 
 * @example
 * ```tsx
 * const { socket, status, connect, subscribe } = useWebSocket();
 * 
 * useEffect(() => {
 *   if (status === 'connected') {
 *     subscribe('market-data', ['BTC/USD']);
 *   }
 * }, [status]);
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:3000',
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 5000,
    timeout = 20000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { token } = useAuthStore();

  /**
   * Calculate exponential backoff delay
   */
  const getReconnectionDelay = useCallback(() => {
    const delay = Math.min(
      reconnectionDelay * Math.pow(2, reconnectAttemptsRef.current),
      reconnectionDelayMax
    );
    return delay;
  }, [reconnectionDelay, reconnectionDelayMax]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      // Create socket instance
      const socket = io(url, {
        auth: {
          token: token || undefined,
        },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually
        timeout,
      });

      socketRef.current = socket;

      // Connection established
      socket.on('connect', () => {
        console.log('[WebSocket] Connected:', socket.id);
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      });

      // Connection error
      socket.on('connect_error', (err) => {
        console.error('[WebSocket] Connection error:', err.message);
        setStatus('error');
        setError(err.message);

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < reconnectionAttempts) {
          const delay = getReconnectionDelay();
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${reconnectionAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('[WebSocket] Max reconnection attempts reached');
          setError('Max reconnection attempts reached');
        }
      });

      // Disconnected
      socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        setStatus('disconnected');

        // Attempt reconnection if not a manual disconnect
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          reconnectAttemptsRef.current = 0;
          const delay = reconnectionDelay;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reason === 'io client disconnect') {
          // Manual disconnect, don't reconnect
          console.log('[WebSocket] Manual disconnect, not reconnecting');
        } else {
          // Transport error, try to reconnect
          const delay = getReconnectionDelay();
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      });

      // Connection established message from server
      socket.on('connected', (data) => {
        console.log('[WebSocket] Server welcome:', data);
      });

      // Error events from server
      socket.on('error', (data) => {
        console.error('[WebSocket] Server error:', data);
        setError(data.message || 'Unknown server error');
      });

      // Ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [url, token, timeout, reconnectionAttempts, reconnectionDelay, getReconnectionDelay]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      console.log('[WebSocket] Disconnecting...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  /**
   * Emit event to server
   */
  const emit = useCallback((event: string, data?: any) => {
    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Cannot emit, not connected');
      return;
    }
    socketRef.current.emit(event, data);
  }, []);

  /**
   * Listen to event from server
   */
  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketRef.current) {
      console.warn('[WebSocket] Cannot listen, socket not initialized');
      return;
    }
    socketRef.current.on(event, callback);
  }, []);

  /**
   * Stop listening to event
   */
  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (!socketRef.current) {
      return;
    }
    if (callback) {
      socketRef.current.off(event, callback);
    } else {
      socketRef.current.off(event);
    }
  }, []);

  /**
   * Subscribe to a channel
   */
  const subscribe = useCallback((channel: string, symbols?: string[]) => {
    emit('subscribe', { channel, symbols });
  }, [emit]);

  /**
   * Unsubscribe from a channel
   */
  const unsubscribe = useCallback((channel: string, symbols?: string[]) => {
    emit('unsubscribe', { channel, symbols });
  }, [emit]);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only run on mount/unmount

  return {
    socket: socketRef.current,
    status,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
    subscribe,
    unsubscribe,
  };
}
