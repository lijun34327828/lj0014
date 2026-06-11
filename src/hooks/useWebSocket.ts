import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/useGameStore.js';
import type { ServerMessage } from '../../shared/types.js';

const WS_URL = 'ws://localhost:9654';
const RECONNECT_DELAY = 3000;
const HEARTBEAT_INTERVAL = 15000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

  const handleServerMessage = useGameStore((state) => state.handleServerMessage);
  const setWs = useGameStore((state) => state.setWs);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isReconnectingRef.current) {
      return;
    }

    try {
      console.log('[WebSocket] Connecting to', WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setWs(ws);
        isReconnectingRef.current = false;

        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }

        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          handleServerMessage(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setWs(null);
        stopHeartbeat();

        if (!isReconnectingRef.current) {
          scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      scheduleReconnect();
    }
  }, [handleServerMessage, setWs]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    isReconnectingRef.current = true;
    console.log(`[WebSocket] Reconnecting in ${RECONNECT_DELAY / 1000}s...`);

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, RECONNECT_DELAY);
  }, [connect]);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'HEARTBEAT',
          timestamp: Date.now(),
        }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    stopHeartbeat();

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setWs(null);
    isReconnectingRef.current = false;
  }, [stopHeartbeat, setWs]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: useGameStore((state) => state.isConnected),
    send: (data: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
        return true;
      }
      return false;
    },
    reconnect: connect,
    disconnect,
  };
}
