import { query } from '../db/pool.js';
import { useInMemory } from '../db/pool.js';
import { calls as callsStore } from '../store/index.js';

function rowToCall(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    sessionId: row.session_id,
    status: row.status,
    callStatus: row.call_status,
    providerCallId: row.provider_call_id,
    recordingUrl: row.recording_url,
    transcriptionText: row.transcription_text,
    transcriptionStatus: row.transcription_status || 'NONE',
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export async function getCallById(id) {
  if (useInMemory) {
    return callsStore.get(id) || null;
  }
  const { rows } = await query('SELECT * FROM calls WHERE id = $1', [id]);
  return rows[0] ? rowToCall(rows[0]) : null;
}

export async function createCall(data) {
  if (useInMemory) {
    callsStore.set(data.id, data);
    return data;
  }
  const { rows } = await query(
    `INSERT INTO calls (id, lead_id, session_id, status, call_status, provider_call_id, started_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.id, data.leadId, data.sessionId, data.status, data.callStatus, data.providerCallId, data.startedAt]
  );
  return rowToCall(rows[0]);
}

export async function updateCall(id, data) {
  if (useInMemory) {
    const call = callsStore.get(id);
    if (!call) return null;
    Object.assign(call, data);
    return call;
  }

  const fields = [];
  const params = [];
  let idx = 1;

  const columnMap = {
    status: 'status',
    callStatus: 'call_status',
    endedAt: 'ended_at',
    recordingUrl: 'recording_url',
    transcriptionText: 'transcription_text',
    transcriptionStatus: 'transcription_status',
  };

  for (const [key, value] of Object.entries(data)) {
    const col = columnMap[key];
    if (!col) continue;
    fields.push(`${col} = $${idx}`);
    params.push(value);
    idx++;
  }

  if (fields.length === 0) return await getCallById(id);

  params.push(id);
  const { rows } = await query(
    `UPDATE calls SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0] ? rowToCall(rows[0]) : null;
}

export async function getCallsBySessionId(sessionId) {
  if (useInMemory) {
    return Array.from(callsStore.values()).filter(c => c.sessionId === sessionId);
  }
  const { rows } = await query('SELECT * FROM calls WHERE session_id = $1 ORDER BY started_at', [sessionId]);
  return rows.map(rowToCall);
}
