import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '../api';

export function useWebSocket(sessionId, onMessage) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [fallbackToPolling, setFallbackToPolling] = useState(false);
  const retriesRef = useRef(0);
  const maxRetries = 3;

  const connect = useCallback(() => {
    if (!sessionId) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        retriesRef.current = 0;
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', sessionId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'SUBSCRIBED') {
            onMessage(data);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          const delay = Math.pow(2, retriesRef.current) * 1000;
          setTimeout(connect, delay);
        } else {
          setFallbackToPolling(true);
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed');
        ws.close();
      };
    } catch {
      setFallbackToPolling(true);
    }
  }, [sessionId, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { connected, error, fallbackToPolling };
}
