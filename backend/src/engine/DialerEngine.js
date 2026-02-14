import { v4 as uuidv4 } from 'uuid';
import { calls, sessions, leads } from '../store/index.js';
import { weightedRandom, randomInt } from '../utils/random.js';
import { createActivity } from '../services/MockCRMService.js';
import { dialerEventBus } from '../events/DialerEventBus.js';
import { getLeadById } from '../dal/leads.js';
import { createSession as dalCreateSession, updateSession as dalUpdateSession } from '../dal/sessions.js';
import { createCall as dalCreateCall, updateCall as dalUpdateCall } from '../dal/calls.js';
import { useInMemory } from '../db/pool.js';

// Track active timeouts so we can cancel them on manual stop
const callTimers = new Map();

// Telephony provider (set via initEngine)
let telephonyProvider = null;

const CALL_OUTCOMES = [
  { value: 'CONNECTED', weight: 40 },
  { value: 'NO_ANSWER', weight: 25 },
  { value: 'BUSY', weight: 20 },
  { value: 'VOICEMAIL', weight: 15 },
];

/**
 * Initialize the engine with a telephony provider.
 */
export function initEngine(provider) {
  telephonyProvider = provider;
}

/**
 * Check if an agent already has a running session.
 */
export function hasRunningSession(agentId) {
  for (const session of sessions.values()) {
    if (session.agentId === agentId && session.status === 'RUNNING') {
      return true;
    }
  }
  return false;
}

/**
 * Get all sessions for an agent, optionally filtered by status.
 */
export function getAgentSessions(agentId, statusFilter) {
  let results = Array.from(sessions.values()).filter(s => s.agentId === agentId);
  if (statusFilter) {
    results = results.filter(s => s.status === statusFilter);
  }
  return results;
}

/**
 * Create and start a new dialer session.
 */
export function createSession(agentId, leadIds) {
  const id = uuidv4();
  const session = {
    id,
    agentId,
    leadQueue: [...leadIds],
    concurrency: 2,
    activeCallIds: [],
    winnerCallId: null,
    status: 'RUNNING',
    calls: [],
    metrics: { attempted: 0, connected: 0, failed: 0, canceled: 0 },
    createdAt: new Date().toISOString(),
  };
  sessions.set(id, session);

  // Sort queue by priority score (highest first)
  session.leadQueue.sort((a, b) => {
    const leadA = leads.get(a);
    const leadB = leads.get(b);
    return (leadB?.priority_score || 0) - (leadA?.priority_score || 0);
  });

  processQueue(session);
  return session;
}

/**
 * Fill active call slots from the queue.
 */
function processQueue(session) {
  if (session.status !== 'RUNNING') return;

  while (
    session.activeCallIds.length < session.concurrency &&
    session.leadQueue.length > 0
  ) {
    const leadId = session.leadQueue.shift();
    const lead = leads.get(leadId);
    if (!lead) continue;

    const call = startCall(leadId, session.id);
    session.activeCallIds.push(call.id);
    session.calls.push(call.id);
    session.metrics.attempted++;

    dialerEventBus.emit('CALL_STARTED', { sessionId: session.id, call });

    if (telephonyProvider) {
      telephonyProvider.startCall(lead, session.id, (outcome) => {
        call.status = 'COMPLETED';
        call.callStatus = outcome;
        call.endedAt = new Date().toISOString();
        call.recordingUrl = telephonyProvider.getRecording?.(call.providerCallId) || null;
        onCallComplete(call, session);
      });
    } else {
      simulateCall(call, session);
    }
  }

  // If no active calls and queue empty, session is done
  if (session.activeCallIds.length === 0 && session.leadQueue.length === 0) {
    session.status = 'STOPPED';
    dialerEventBus.emit('SESSION_STOPPED', { sessionId: session.id });
    emitSessionUpdate(session);
  }
}

/**
 * Create a new call record.
 */
function startCall(leadId, sessionId) {
  const id = uuidv4();
  const call = {
    id,
    leadId,
    sessionId,
    status: 'RINGING',
    startedAt: new Date().toISOString(),
    endedAt: null,
    callStatus: null,
    providerCallId: `PROV-${uuidv4().slice(0, 8).toUpperCase()}`,
    recordingUrl: null,
    transcriptionText: null,
    transcriptionStatus: 'NONE',
    crmActivityId: null,
    crmActivityStatus: null,
  };
  calls.set(id, call);
  return call;
}

/**
 * Simulate a call with random duration and outcome.
 */
function simulateCall(call, session) {
  const duration = randomInt(1000, 3000);
  const timer = setTimeout(() => {
    callTimers.delete(call.id);
    const outcome = weightedRandom(CALL_OUTCOMES);
    call.status = 'COMPLETED';
    call.callStatus = outcome;
    call.endedAt = new Date().toISOString();
    onCallComplete(call, session);
  }, duration);
  callTimers.set(call.id, timer);
}

/**
 * Handle a completed call.
 */
function onCallComplete(call, session) {
  // Remove from active calls
  session.activeCallIds = session.activeCallIds.filter((id) => id !== call.id);

  dialerEventBus.emit('CALL_COMPLETED', { sessionId: session.id, call });

  if (call.callStatus === 'CONNECTED' && !session.winnerCallId) {
    // Winner found
    session.winnerCallId = call.id;
    session.metrics.connected++;

    // Cancel all other active calls
    for (const activeCallId of [...session.activeCallIds]) {
      cancelCall(activeCallId, session);
    }

    // CRM sync for winner
    syncCrmActivity(call, session);

    // Stop the session
    session.status = 'STOPPED';
    dialerEventBus.emit('WINNER_FOUND', { sessionId: session.id, call });
    emitSessionUpdate(session);
    return;
  }

  // Non-connected outcome
  if (call.callStatus === 'CANCELED_BY_DIALER') {
    session.metrics.canceled++;
  } else if (call.callStatus !== 'CONNECTED') {
    session.metrics.failed++;
  } else {
    // CONNECTED but winner already exists (edge case)
    session.metrics.connected++;
  }

  // CRM sync for this call
  syncCrmActivity(call, session);

  emitSessionUpdate(session);

  // Try to fill the slot
  processQueue(session);
}

/**
 * Cancel an active call.
 */
function cancelCall(callId, session) {
  const call = calls.get(callId);
  if (!call || call.status === 'COMPLETED') return;

  // Clear the timer
  const timer = callTimers.get(callId);
  if (timer) {
    clearTimeout(timer);
    callTimers.delete(callId);
  }

  // Cancel via provider if available
  if (telephonyProvider) {
    telephonyProvider.endCall?.(call.providerCallId);
  }

  call.status = 'COMPLETED';
  call.callStatus = 'CANCELED_BY_DIALER';
  call.endedAt = new Date().toISOString();

  session.activeCallIds = session.activeCallIds.filter((id) => id !== callId);
  session.metrics.canceled++;

  // CRM sync for canceled call
  syncCrmActivity(call, session);
}

/**
 * Manually stop a session — cancel all active calls.
 */
export function stopSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.status === 'STOPPED') return session;

  // Cancel all active calls
  for (const callId of [...session.activeCallIds]) {
    cancelCall(callId, session);
  }

  session.status = 'STOPPED';
  session.leadQueue = [];
  dialerEventBus.emit('SESSION_STOPPED', { sessionId: session.id });
  emitSessionUpdate(session);
  return session;
}

/**
 * Get session state enriched with call details and lead info.
 */
export function getSessionState(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const sessionCalls = session.calls.map((callId) => {
    const call = calls.get(callId);
    if (!call) return null;
    const lead = leads.get(call.leadId);
    return {
      ...call,
      leadName: lead?.name || 'Unknown',
      leadPhone: lead?.phone_number || 'Unknown',
      leadCompany: lead?.company || 'Unknown',
    };
  }).filter(Boolean);

  return {
    ...session,
    calls: sessionCalls,
  };
}

/**
 * Sync a completed call to the CRM and track status on the call object.
 */
async function syncCrmActivity(call, session) {
  call.crmActivityStatus = 'PENDING';
  emitSessionUpdate(session);
  try {
    const activity = await createActivity(call);
    call.crmActivityId = activity.id;
    call.crmActivityStatus = 'SYNCED';
  } catch (err) {
    call.crmActivityStatus = 'FAILED';
  }
  emitSessionUpdate(session);
}

/**
 * Create a session and wait for it to complete before returning.
 * Used on serverless (Vercel) where setTimeout callbacks must finish
 * within the same request.
 * Pre-fetches leads from the DAL so the engine can find them in the Map.
 */
export async function createSessionAndWait(agentId, leadIds) {
  // Pre-fetch leads from DAL (Postgres) into the in-memory Map
  // so the engine's leads.get() calls work on serverless
  for (const leadId of leadIds) {
    if (!leads.has(leadId)) {
      const lead = await getLeadById(leadId);
      if (lead) leads.set(leadId, lead);
    }
  }

  const sessionState = await new Promise((resolve) => {
    const session = createSession(agentId, leadIds);

    // If session finished immediately (e.g. no valid leads)
    if (session.status === 'STOPPED') {
      setTimeout(() => resolve(getSessionState(session.id)), 300);
      return;
    }

    const handler = ({ sessionId }) => {
      if (sessionId === session.id) {
        dialerEventBus.removeListener('SESSION_STOPPED', handler);
        // Small delay to let CRM sync finish
        setTimeout(() => resolve(getSessionState(session.id)), 500);
      }
    };
    dialerEventBus.on('SESSION_STOPPED', handler);

    // Safety: force-stop after 9s (Vercel has 10s limit)
    setTimeout(() => {
      dialerEventBus.removeListener('SESSION_STOPPED', handler);
      if (session.status === 'RUNNING') {
        stopSession(session.id);
      }
      resolve(getSessionState(session.id));
    }, 9000);
  });

  // Persist session and calls to Postgres so subsequent requests can find them
  if (!useInMemory && sessionState) {
    await persistToDatabase(sessionState);
  }

  return sessionState;
}

/**
 * Persist a completed session and its calls to Postgres.
 */
async function persistToDatabase(sessionState) {
  try {
    // Persist session
    await dalCreateSession({
      id: sessionState.id,
      agentId: sessionState.agentId,
      leadQueue: sessionState.leadQueue,
      concurrency: sessionState.concurrency,
      status: sessionState.status,
      metrics: sessionState.metrics,
    });
    await dalUpdateSession(sessionState.id, {
      status: sessionState.status,
      winnerCallId: sessionState.winnerCallId,
      metrics: sessionState.metrics,
    });

    // Persist each call
    for (const call of sessionState.calls) {
      await dalCreateCall({
        id: call.id,
        leadId: call.leadId,
        sessionId: call.sessionId,
        status: call.status,
        callStatus: call.callStatus,
        providerCallId: call.providerCallId,
        startedAt: call.startedAt,
      });
      await dalUpdateCall(call.id, {
        status: call.status,
        callStatus: call.callStatus,
        endedAt: call.endedAt,
        recordingUrl: call.recordingUrl,
        transcriptionText: call.transcriptionText,
        transcriptionStatus: call.transcriptionStatus,
      });
    }
  } catch (err) {
    console.error('[Dialer] Failed to persist session to DB:', err.message);
  }
}

function emitSessionUpdate(session) {
  const state = getSessionState(session.id);
  dialerEventBus.emit('SESSION_UPDATE', { sessionId: session.id, state });
}
