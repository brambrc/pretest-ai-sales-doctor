import { useEffect, useRef, useState } from 'react';
import { WS_URL } from '../api';

export function useWebSocket(sessionId, onMessage) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);
  const [fallbackToPolling, setFallbackToPolling] = useState(false);
  const retriesRef = useRef(0);
  const maxRetries = 3;
  const mountedRef = useRef(true);

  // Keep onMessage ref up to date without triggering reconnects
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    mountedRef.current = true;

    if (!sessionId) {
      setFallbackToPolling(true);
      return;
    }

    function connect() {
      if (!mountedRef.current) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current) { ws.close(); return; }
          setConnected(true);
          retriesRef.current = 0;
          ws.send(JSON.stringify({ type: 'SUBSCRIBE', sessionId }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type !== 'SUBSCRIBED') {
              onMessageRef.current(data);
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          if (!mountedRef.current) return;
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
          // Just close — onclose handler will retry or fallback
          ws.close();
        };
      } catch {
        if (mountedRef.current) setFallbackToPolling(true);
      }
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId]);

  return { connected, fallbackToPolling };
}
