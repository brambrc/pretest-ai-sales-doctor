import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { seedData } from '../../store/seed.js';
import { leads, calls, sessions, crmActivities, mockCrmContacts, mockCrmActivities, users } from '../../store/index.js';

describe('Leads routes', () => {
  let token;

  beforeEach(async () => {
    // Clear all stores
    leads.clear();
    calls.clear();
    sessions.clear();
    crmActivities.clear();
    mockCrmContacts.clear();
    mockCrmActivities.clear();
    users.clear();

    // Seed lead data
    seedData();

    // Register a user and get auth token
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test Agent', email: 'agent@test.com', password: 'password123' });
    token = res.body.token;
  });

  afterEach(() => {
    leads.clear();
    calls.clear();
    sessions.clear();
    crmActivities.clear();
    mockCrmContacts.clear();
    mockCrmActivities.clear();
    users.clear();
  });

  describe('GET /leads', () => {
    it('returns seeded leads', async () => {
      const res = await request(app)
        .get('/leads')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.leads).toBeInstanceOf(Array);
      expect(res.body.leads.length).toBe(6); // 6 seeded leads
      expect(res.body.total).toBe(6);
    });

    it('filters by industry', async () => {
      const res = await request(app)
        .get('/leads')
        .query({ industry: 'Technology' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.leads.length).toBeGreaterThan(0);
      for (const lead of res.body.leads) {
        expect(lead.industry.toLowerCase()).toBe('technology');
      }
    });
  });

  describe('GET /leads/:id', () => {
    it('returns single lead', async () => {
      const leadId = Array.from(leads.keys())[0];
      const res = await request(app)
        .get(`/leads/${leadId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(leadId);
      expect(res.body.name).toBeTruthy();
    });

    it('returns 404 for missing lead', async () => {
      const res = await request(app)
        .get('/leads/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.detail).toBe('Lead not found');
    });
  });

  describe('POST /leads', () => {
    it('creates a new lead', async () => {
      const newLead = {
        name: 'New Person',
        job_title: 'Engineer',
        phone_number: '+62899999999',
        company: 'NewCo',
        email: 'new@newco.com',
        headcount: '1-10',
        industry: 'Technology',
      };

      const res = await request(app)
        .post('/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(newLead);

      expect(res.status).toBe(201);
      expect(res.body.lead.name).toBe('New Person');
      expect(res.body.lead.id).toBeTruthy();
      expect(res.body.lead.enriched).toBe(false);
      expect(res.body.lead.priority_score).toBe(0);
    });

    it('returns 400 when missing fields', async () => {
      const res = await request(app)
        .post('/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Incomplete Lead' });

      expect(res.status).toBe(400);
      expect(res.body.detail).toContain('required');
    });
  });

  describe('POST /leads/:id/enrich', () => {
    it('enriches a lead and sets priority_score', async () => {
      const leadId = Array.from(leads.keys())[0];

      const res = await request(app)
        .post(`/leads/${leadId}/enrich`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.lead.enriched).toBe(true);
      expect(res.body.lead.enrichment_data).toBeTruthy();
      expect(res.body.lead.enrichment_data.decision_maker_score).toBe(85);
      expect(res.body.lead.priority_score).toBeGreaterThan(0);
    });
  });
});
