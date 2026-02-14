import { query } from '../db/pool.js';
import { useInMemory } from '../db/pool.js';
import { leads as leadsStore } from '../store/index.js';
import { v4 as uuidv4 } from 'uuid';

function rowToLead(row) {
  return {
    id: row.id,
    name: row.name,
    job_title: row.job_title,
    phone_number: row.phone_number,
    company: row.company,
    email: row.email,
    headcount: row.headcount,
    industry: row.industry,
    enriched: row.enriched,
    enrichment_data: row.enrichment_data,
    crmExternalId: row.crm_external_id,
    priority_score: parseFloat(row.priority_score) || 0,
  };
}

export async function getAllLeads(filters = {}) {
  if (useInMemory) {
    let results = Array.from(leadsStore.values());
    if (filters.industry) {
      results = results.filter(l => l.industry.toLowerCase() === filters.industry.toLowerCase());
    }
    if (filters.headcount) {
      results = results.filter(l => l.headcount === filters.headcount);
    }
    return results;
  }

  let sql = 'SELECT * FROM leads WHERE 1=1';
  const params = [];
  if (filters.industry) {
    params.push(filters.industry);
    sql += ` AND LOWER(industry) = LOWER($${params.length})`;
  }
  if (filters.headcount) {
    params.push(filters.headcount);
    sql += ` AND headcount = $${params.length}`;
  }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await query(sql, params);
  return rows.map(rowToLead);
}

export async function getLeadById(id) {
  if (useInMemory) {
    return leadsStore.get(id) || null;
  }
  const { rows } = await query('SELECT * FROM leads WHERE id = $1', [id]);
  return rows[0] ? rowToLead(rows[0]) : null;
}

export async function createLead(data) {
  const id = uuidv4();
  if (useInMemory) {
    const newLead = {
      id,
      ...data,
      enriched: false,
      enrichment_data: null,
      crmExternalId: null,
      priority_score: 0,
    };
    leadsStore.set(id, newLead);
    return newLead;
  }

  const { rows } = await query(
    `INSERT INTO leads (id, name, job_title, phone_number, company, email, headcount, industry, enriched, priority_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, 0) RETURNING *`,
    [id, data.name, data.job_title, data.phone_number, data.company, data.email, data.headcount, data.industry]
  );
  return rowToLead(rows[0]);
}

export async function updateLead(id, data) {
  if (useInMemory) {
    const lead = leadsStore.get(id);
    if (!lead) return null;
    Object.assign(lead, data);
    return lead;
  }

  const fields = [];
  const params = [];
  let idx = 1;

  const columnMap = {
    enriched: 'enriched',
    enrichment_data: 'enrichment_data',
    crmExternalId: 'crm_external_id',
    priority_score: 'priority_score',
    name: 'name',
    job_title: 'job_title',
    phone_number: 'phone_number',
    company: 'company',
    email: 'email',
    headcount: 'headcount',
    industry: 'industry',
  };

  for (const [key, value] of Object.entries(data)) {
    const col = columnMap[key];
    if (!col) continue;
    fields.push(`${col} = $${idx}`);
    params.push(key === 'enrichment_data' ? JSON.stringify(value) : value);
    idx++;
  }

  if (fields.length === 0) return await getLeadById(id);

  params.push(id);
  const { rows } = await query(
    `UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0] ? rowToLead(rows[0]) : null;
}
