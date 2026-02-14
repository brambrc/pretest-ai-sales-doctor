import { v4 as uuidv4 } from 'uuid';
import { leads } from './index.js';

const seedLeads = [
  {
    name: 'John Doe',
    job_title: 'CEO',
    phone_number: '+62812345678',
    company: 'Tech Startup',
    email: 'john@techstartup.com',
    headcount: '11-50',
    industry: 'Technology',
  },
  {
    name: 'Jane Smith',
    job_title: 'Marketing Director',
    phone_number: '+62887654321',
    company: 'Construction Co',
    email: 'jane@constructco.com',
    headcount: '51-200',
    industry: 'Construction',
  },
  {
    name: 'Bob Wilson',
    job_title: 'CTO',
    phone_number: '+62811112222',
    company: 'Logistics Plus',
    email: 'bob@logisticsplus.com',
    headcount: '201-500',
    industry: 'Logistics',
  },
  {
    name: 'Alice Chen',
    job_title: 'VP of Sales',
    phone_number: '+62813456789',
    company: 'HealthFirst',
    email: 'alice@healthfirst.com',
    headcount: '51-200',
    industry: 'Healthcare',
  },
  {
    name: 'David Park',
    job_title: 'CFO',
    phone_number: '+62814567890',
    company: 'FinanceHub',
    email: 'david@financehub.com',
    headcount: '500+',
    industry: 'Finance',
  },
  {
    name: 'Maria Garcia',
    job_title: 'Operations Manager',
    phone_number: '+62815678901',
    company: 'BuildRight Manufacturing',
    email: 'maria@buildright.com',
    headcount: '201-500',
    industry: 'Manufacturing',
  },
];

export function seedData() {
  for (const data of seedLeads) {
    const id = uuidv4();
    leads.set(id, {
      id,
      ...data,
      enriched: false,
      enrichment_data: null,
      crmExternalId: null,
      priority_score: 0,
    });
  }
  console.log(`Seeded ${seedLeads.length} leads`);
}
