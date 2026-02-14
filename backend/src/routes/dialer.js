import { Router } from 'express';
import { createSessionAndWait, getSessionState, stopSession, hasRunningSession } from '../engine/DialerEngine.js';
import { getSessionsByAgent, getSessionById } from '../dal/sessions.js';
import { getCallsBySessionId } from '../dal/calls.js';
import { getLeadById } from '../dal/leads.js';
import { useInMemory } from '../db/pool.js';
import { dialerLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * Build enriched session state from DAL (Postgres).
 */
async function getSessionStateFromDB(sessionId) {
  const session = await getSessionById(sessionId);
  if (!session) return null;

  const sessionCalls = await getCallsBySessionId(sessionId);
  const enrichedCalls = [];
  for (const call of sessionCalls) {
    const lead = await getLeadById(call.leadId);
    enrichedCalls.push({
      ...call,
      leadName: lead?.name || 'Unknown',
      leadPhone: lead?.phone_number || 'Unknown',
      leadCompany: lead?.company || 'Unknown',
    });
  }

  return {
    ...session,
    calls: enrichedCalls,
  };
}

// GET /dialer/sessions — list sessions for current agent (must come before :id)
router.get('/sessions', async (req, res) => {
  try {
    const agentId = req.user.userId;
    const { status } = req.query;

    if (!useInMemory) {
      // Read from Postgres for serverless
      const sessions = await getSessionsByAgent(agentId, status);
      // Enrich each session with calls
      const enriched = [];
      for (const session of sessions) {
        const calls = await getCallsBySessionId(session.id);
        enriched.push({ ...session, calls });
      }
      return res.json({ sessions: enriched, total: enriched.length });
    }

    // In-memory fallback
    const { getAgentSessions } = await import('../engine/DialerEngine.js');
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

// GET /dialer/sessions/:id — get session state
router.get('/sessions/:id', async (req, res) => {
  // Try in-memory first (for active sessions)
  let state = getSessionState(req.params.id);

  // Fall back to Postgres
  if (!state && !useInMemory) {
    state = await getSessionStateFromDB(req.params.id);
  }

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
