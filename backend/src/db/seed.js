import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import pg from 'pg';

const { Pool } = pg;

const seedLeads = [
  { name: 'John Doe', job_title: 'CEO', phone_number: '+62812345678', company: 'Tech Startup', email: 'john@techstartup.com', headcount: '11-50', industry: 'Technology' },
  { name: 'Jane Smith', job_title: 'Marketing Director', phone_number: '+62887654321', company: 'Construction Co', email: 'jane@constructco.com', headcount: '51-200', industry: 'Construction' },
  { name: 'Bob Wilson', job_title: 'CTO', phone_number: '+62811112222', company: 'Logistics Plus', email: 'bob@logisticsplus.com', headcount: '201-500', industry: 'Logistics' },
  { name: 'Alice Chen', job_title: 'VP of Sales', phone_number: '+62813456789', company: 'HealthFirst', email: 'alice@healthfirst.com', headcount: '51-200', industry: 'Healthcare' },
  { name: 'David Park', job_title: 'CFO', phone_number: '+62814567890', company: 'FinanceHub', email: 'david@financehub.com', headcount: '500+', industry: 'Finance' },
  { name: 'Maria Garcia', job_title: 'Operations Manager', phone_number: '+62815678901', company: 'BuildRight Manufacturing', email: 'maria@buildright.com', headcount: '201-500', industry: 'Manufacturing' },
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL set — skipping DB seed (using in-memory store)');
    process.exit(0);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    // Check if leads exist already
    const { rows } = await pool.query('SELECT COUNT(*) FROM leads');
    if (parseInt(rows[0].count) > 0) {
      console.log('Leads already seeded, skipping');
      return;
    }

    for (const lead of seedLeads) {
      await pool.query(
        `INSERT INTO leads (id, name, job_title, phone_number, company, email, headcount, industry, enriched, priority_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [uuidv4(), lead.name, lead.job_title, lead.phone_number, lead.company, lead.email, lead.headcount, lead.industry, false, 0]
      );
    }
    console.log(`Seeded ${seedLeads.length} leads into database`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
