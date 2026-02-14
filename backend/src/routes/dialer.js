import { Router } from 'express';
import { createSession, createSessionAndWait, getSessionState, stopSession, hasRunningSession, getAgentSessions } from '../engine/DialerEngine.js';
import { dialerLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// GET /dialer/sessions — list sessions for current agent (must come before :id)
router.get('/sessions', async (req, res) => {
  try {
    const agentId = req.user.userId;
    const { status } = req.query;
    const sessions = getAgentSessions(agentId, status);
    res.json({ sessions, total: sessions.length });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /dialer/sessions — create and run a dialer session to completion
router.post('/sessions', dialerLimiter, async (req, res) => {
  const agentId = req.user.userId;
  const { leadIds } = req.body;

  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ detail: 'Non-empty leadIds array is required' });
  }

  if (hasRunningSession(agentId)) {
    return res.status(409).json({ detail: 'You already have a running session' });
  }

  try {
    const sessionState = await createSessionAndWait(agentId, leadIds);
    res.status(201).json(sessionState);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /dialer/sessions/:id — get session state (polled by frontend)
router.get('/sessions/:id', (req, res) => {
  const state = getSessionState(req.params.id);
  if (!state) return res.status(404).json({ detail: 'Session not found' });
  res.json(state);
});

// POST /dialer/sessions/:id/stop — manually stop a session
router.post('/sessions/:id/stop', (req, res) => {
  const session = stopSession(req.params.id);
  if (!session) return res.status(404).json({ detail: 'Session not found' });
  res.json(session);
});

export default router;
