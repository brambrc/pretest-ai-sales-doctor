import { query } from '../db/pool.js';
import { useInMemory } from '../db/pool.js';
import { mockCrmContacts, mockCrmActivities } from '../store/index.js';

export async function upsertMockContact(data) {
  if (useInMemory) {
    mockCrmContacts.set(data.id, data);
    return data;
  }
  const { rows } = await query(
    `INSERT INTO mock_crm_contacts (id, lead_id, name, email, phone, company)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET name = $3, email = $4, phone = $5, company = $6
     RETURNING *`,
    [data.id, data.leadId, data.name, data.email, data.phone, data.company]
  );
  return rows[0];
}

export async function getAllMockContacts() {
  if (useInMemory) {
    return Array.from(mockCrmContacts.values());
  }
  const { rows } = await query('SELECT * FROM mock_crm_contacts ORDER BY created_at DESC');
  return rows;
}

export async function createMockActivity(data) {
  if (useInMemory) {
    mockCrmActivities.set(data.id, data);
    return data;
  }
  const { rows } = await query(
    `INSERT INTO mock_crm_activities (id, lead_id, crm_external_id, type, call_id, disposition, notes, source_activity_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.id, data.leadId, data.crmExternalId, data.type, data.callId, data.disposition, data.notes, data.sourceActivityId]
  );
  return rows[0];
}

export async function getAllMockActivities() {
  if (useInMemory) {
    return Array.from(mockCrmActivities.values());
  }
  const { rows } = await query('SELECT * FROM mock_crm_activities ORDER BY created_at DESC');
  return rows;
}
