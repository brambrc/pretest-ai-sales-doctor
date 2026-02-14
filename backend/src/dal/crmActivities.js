import { query } from '../db/pool.js';
import { useInMemory } from '../db/pool.js';
import { crmActivities as crmStore } from '../store/index.js';

function rowToActivity(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    crmExternalId: row.crm_external_id,
    type: row.type,
    callId: row.call_id,
    disposition: row.disposition,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function createCrmActivity(data) {
  if (useInMemory) {
    crmStore.set(data.id, data);
    return data;
  }
  const { rows } = await query(
    `INSERT INTO crm_activities (id, lead_id, crm_external_id, type, call_id, disposition, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.id, data.leadId, data.crmExternalId, data.type, data.callId, data.disposition, data.notes]
  );
  return rowToActivity(rows[0]);
}

export async function getActivitiesByLeadId(leadId) {
  if (useInMemory) {
    return Array.from(crmStore.values()).filter(a => a.leadId === leadId);
  }
  const { rows } = await query(
    'SELECT * FROM crm_activities WHERE lead_id = $1 ORDER BY created_at DESC',
    [leadId]
  );
  return rows.map(rowToActivity);
}

export async function getActivityByCallId(callId) {
  if (useInMemory) {
    for (const activity of crmStore.values()) {
      if (activity.callId === callId) return activity;
    }
    return null;
  }
  const { rows } = await query('SELECT * FROM crm_activities WHERE call_id = $1', [callId]);
  return rows[0] ? rowToActivity(rows[0]) : null;
}
