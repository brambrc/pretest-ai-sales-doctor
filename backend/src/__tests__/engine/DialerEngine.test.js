import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSession,
  stopSession,
  getSessionState,
  hasRunningSession,
  getAgentSessions,
} from '../../engine/DialerEngine.js';
import { leads, calls, sessions } from '../../store/index.js';

describe('DialerEngine', () => {
  const agentId = 'agent-001';
  let leadIds;

  beforeEach(() => {
    vi.useFakeTimers();
    leads.clear();
    calls.clear();
    sessions.clear();

    // Seed test leads
    leadIds = [];
    for (let i = 1; i <= 5; i++) {
      const id = `lead-${i}`;
      leadIds.push(id);
      leads.set(id, {
        id,
        name: `Lead ${i}`,
        job_title: 'Manager',
        phone_number: `+6281234567${i}`,
        company: `Company ${i}`,
        email: `lead${i}@example.com`,
        headcount: '11-50',
        industry: 'Technology',
        enriched: false,
        enrichment_data: null,
        crmExternalId: null,
        priority_score: 0,
      });
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it('creates session with correct defaults', () => {
      const session = createSession(agentId, leadIds);

      expect(session.status).toBe('RUNNING');
      expect(session.concurrency).toBe(2);
      expect(session.agentId).toBe(agentId);
      expect(session.winnerCallId).toBeNull();
      expect(session.metrics).toEqual({
        attempted: expect.any(Number),
        connected: 0,
        failed: 0,
        canceled: 0,
      });
    });

    it('adds session to sessions store', () => {
      const session = createSession(agentId, leadIds);
      expect(sessions.has(session.id)).toBe(true);
      expect(sessions.get(session.id)).toBe(session);
    });

    it('starts with active calls up to concurrency', () => {
      const session = createSession(agentId, leadIds);

      // Concurrency is 2, so 2 calls should be active
      expect(session.activeCallIds.length).toBe(2);
      expect(session.metrics.attempted).toBe(2);

      // Each active call should exist in the calls store
      for (const callId of session.activeCallIds) {
        const call = calls.get(callId);
        expect(call).toBeTruthy();
        expect(call.status).toBe('RINGING');
      }
    });
  });

  describe('hasRunningSession', () => {
    it('returns true for agent with running session', () => {
      createSession(agentId, leadIds);
      expect(hasRunningSession(agentId)).toBe(true);
    });

    it('returns false for agent without running session', () => {
      expect(hasRunningSession('unknown-agent')).toBe(false);
    });
  });

  describe('getAgentSessions', () => {
    it('returns sessions for specific agent', () => {
      createSession(agentId, leadIds);
      createSession('other-agent', leadIds);

      const agentSessions = getAgentSessions(agentId);
      expect(agentSessions.length).toBe(1);
      expect(agentSessions[0].agentId).toBe(agentId);
    });

    it('filters by status', () => {
      const session = createSession(agentId, leadIds);
      stopSession(session.id);

      const running = getAgentSessions(agentId, 'RUNNING');
      expect(running.length).toBe(0);

      const stopped = getAgentSessions(agentId, 'STOPPED');
      expect(stopped.length).toBe(1);
    });
  });

  describe('winner detection', () => {
    it('sets winnerCallId when a call connects', () => {
      // Mock Math.random so weightedRandom always picks CONNECTED (weight 40 out of 100)
      // randomInt(3000,8000) with 0.1 => Math.floor(0.1*5001)+3000 = 3500ms
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const session = createSession(agentId, leadIds);

      // Advance timers past the call duration (3500ms)
      vi.advanceTimersByTime(4000);

      expect(session.winnerCallId).toBeTruthy();
      expect(session.metrics.connected).toBeGreaterThanOrEqual(1);
    });

    it('cancels other active calls when winner found', () => {
      // Math.random = 0.1 => CONNECTED outcome, duration 3500ms
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const session = createSession(agentId, leadIds);
      const initialActiveIds = [...session.activeCallIds];

      // Advance past call completion
      vi.advanceTimersByTime(4000);

      // Winner should be set
      expect(session.winnerCallId).toBeTruthy();

      // All initial calls should be completed (winner + canceled)
      for (const callId of initialActiveIds) {
        const call = calls.get(callId);
        expect(call.status).toBe('COMPLETED');
      }
    });
  });

  describe('queue refill', () => {
    it('starts next lead when a non-connected call completes', () => {
      // Use a random value that yields NO_ANSWER (weight 25, range 40-65 out of 100)
      // Math.random = 0.5 => r = 50, 50-40=10(skip CONNECTED), 10-25<0 => NO_ANSWER
      // randomInt(3000,8000) with 0.5 => Math.floor(0.5*5001)+3000 = 5500ms
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const session = createSession(agentId, leadIds);
      const attemptedBefore = session.metrics.attempted;

      // Advance timers past the call duration (5500ms)
      vi.advanceTimersByTime(6000);

      // After failed calls complete, the queue should refill with new calls
      expect(session.metrics.attempted).toBeGreaterThan(attemptedBefore);
    });
  });

  describe('stopSession', () => {
    it('cancels all active calls', () => {
      const session = createSession(agentId, leadIds);
      const activeIds = [...session.activeCallIds];
      expect(activeIds.length).toBeGreaterThan(0);

      stopSession(session.id);

      for (const callId of activeIds) {
        const call = calls.get(callId);
        expect(call.status).toBe('COMPLETED');
        expect(call.callStatus).toBe('CANCELED_BY_DIALER');
      }
    });

    it('sets status to STOPPED', () => {
      const session = createSession(agentId, leadIds);
      stopSession(session.id);
      expect(session.status).toBe('STOPPED');
    });
  });

  describe('getSessionState', () => {
    it('enriches calls with lead info', () => {
      const session = createSession(agentId, leadIds);
      const state = getSessionState(session.id);

      expect(state.calls.length).toBeGreaterThan(0);
      for (const call of state.calls) {
        expect(call.leadName).toBeTruthy();
        expect(call.leadName).not.toBe('Unknown');
        expect(call.leadPhone).toBeTruthy();
        expect(call.leadCompany).toBeTruthy();
      }
    });

    it('returns null for non-existent session', () => {
      expect(getSessionState('non-existent')).toBeNull();
    });
  });
});
