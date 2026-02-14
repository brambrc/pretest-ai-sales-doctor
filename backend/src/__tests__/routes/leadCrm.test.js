import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { seedData } from '../../store/seed.js';
import { leads, calls, sessions, crmActivities, mockCrmContacts, mockCrmActivities, users } from '../../store/index.js';

describe('Lead CRM routes', () => {
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

  describe('GET /leads/:id/crm-activities', () => {
    it('returns activities for a lead', async () => {
      const leadId = Array.from(leads.keys())[0];

      // Pre-populate a CRM activity for this lead
      crmActivities.set('activity-1', {
        id: 'activity-1',
        leadId,
        crmExternalId: 'CRM-123',
        type: 'CALL',
        callId: 'call-1',
        disposition: 'Connected - Conversation',
        notes: 'Great call',
        createdAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get(`/leads/${leadId}/crm-activities`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.leadId).toBe(leadId);
      expect(res.body.leadName).toBeTruthy();
      expect(res.body.activities).toBeInstanceOf(Array);
      expect(res.body.activities.length).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.activities[0].id).toBe('activity-1');
    });

    it('returns 404 for missing lead', async () => {
      const res = await request(app)
        .get('/leads/non-existent-id/crm-activities')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.detail).toBe('Lead not found');
    });
  });
});
