import { WebSocketServer } from 'ws';
import { dialerEventBus } from '../events/DialerEventBus.js';

const sessionSubscribers = new Map(); // sessionId -> Set<WebSocket>

export function initWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let subscribedSessionId = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'SUBSCRIBE' && msg.sessionId) {
          // Unsubscribe from previous session
          if (subscribedSessionId) {
            const subs = sessionSubscribers.get(subscribedSessionId);
            if (subs) {
              subs.delete(ws);
              if (subs.size === 0) sessionSubscribers.delete(subscribedSessionId);
            }
          }

          subscribedSessionId = msg.sessionId;
          if (!sessionSubscribers.has(subscribedSessionId)) {
            sessionSubscribers.set(subscribedSessionId, new Set());
          }
          sessionSubscribers.get(subscribedSessionId).add(ws);

          ws.send(JSON.stringify({ type: 'SUBSCRIBED', sessionId: subscribedSessionId }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (subscribedSessionId) {
        const subs = sessionSubscribers.get(subscribedSessionId);
        if (subs) {
          subs.delete(ws);
          if (subs.size === 0) sessionSubscribers.delete(subscribedSessionId);
        }
      }
    });

    // Ping/pong keepalive
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // Periodic ping
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(pingInterval));

  // Listen to DialerEventBus and broadcast to subscribers
  const events = ['SESSION_UPDATE', 'CALL_STARTED', 'CALL_COMPLETED', 'WINNER_FOUND', 'SESSION_STOPPED'];
  for (const event of events) {
    dialerEventBus.on(event, (data) => {
      const { sessionId } = data;
      const subs = sessionSubscribers.get(sessionId);
      if (!subs || subs.size === 0) return;

      const message = JSON.stringify({ type: event, ...data });
      for (const ws of subs) {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        }
      }
    });
  }

  return wss;
}
