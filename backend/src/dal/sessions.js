import { query } from '../db/pool.js';
import { useInMemory } from '../db/pool.js';
import { sessions as sessionsStore } from '../store/index.js';

function rowToSession(row) {
  return {
    id: row.id,
    agentId: row.agent_id,
    leadQueue: row.lead_queue || [],
    concurrency: row.concurrency,
    activeCallIds: row.active_call_ids || [],
    winnerCallId: row.winner_call_id,
    status: row.status,
    metrics: row.metrics || { attempted: 0, connected: 0, failed: 0, canceled: 0 },
    calls: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSessionById(id) {
  if (useInMemory) {
    return sessionsStore.get(id) || null;
  }
  const { rows } = await query('SELECT * FROM sessions WHERE id = $1', [id]);
  return rows[0] ? rowToSession(rows[0]) : null;
}

export async function createSession(data) {
  if (useInMemory) {
    sessionsStore.set(data.id, data);
    return data;
  }
  const { rows } = await query(
    `INSERT INTO sessions (id, agent_id, lead_queue, concurrency, status, metrics)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.id, data.agentId, data.leadQueue, data.concurrency, data.status, JSON.stringify(data.metrics)]
  );
  return rowToSession(rows[0]);
}

export async function updateSession(id, data) {
  if (useInMemory) {
    const session = sessionsStore.get(id);
    if (!session) return null;
    Object.assign(session, data);
    return session;
  }

  const fields = [];
  const params = [];
  let idx = 1;

  const columnMap = {
    status: 'status',
    winnerCallId: 'winner_call_id',
    leadQueue: 'lead_queue',
    activeCallIds: 'active_call_ids',
    metrics: 'metrics',
  };

  for (const [key, value] of Object.entries(data)) {
    const col = columnMap[key];
    if (!col) continue;
    fields.push(`${col} = $${idx}`);
    params.push(key === 'metrics' ? JSON.stringify(value) : value);
    idx++;
  }

  fields.push(`updated_at = NOW()`);

  if (fields.length === 0) return await getSessionById(id);

  params.push(id);
  const { rows } = await query(
    `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0] ? rowToSession(rows[0]) : null;
}

export async function persistSessionState(session) {
  if (useInMemory) return;
  await updateSession(session.id, {
    status: session.status,
    winnerCallId: session.winnerCallId,
    leadQueue: session.leadQueue,
    activeCallIds: session.activeCallIds,
    metrics: session.metrics,
  });
}

export async function getSessionsByAgent(agentId, statusFilter) {
  if (useInMemory) {
    let results = Array.from(sessionsStore.values()).filter(s => s.agentId === agentId);
    if (statusFilter) {
      results = results.filter(s => s.status === statusFilter);
    }
    return results;
  }

  let sql = 'SELECT * FROM sessions WHERE agent_id = $1';
  const params = [agentId];
  if (statusFilter) {
    params.push(statusFilter);
    sql += ` AND status = $${params.length}`;
  }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await query(sql, params);
  return rows.map(rowToSession);
}
