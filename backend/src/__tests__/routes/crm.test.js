import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { seedData } from '../../store/seed.js';
import { leads, calls, sessions, crmActivities, mockCrmContacts, mockCrmActivities, users } from '../../store/index.js';

describe('CRM routes', () => {
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

  describe('GET /mock-crm/contacts', () => {
    it('returns contacts list', async () => {
      // Pre-populate a contact
      mockCrmContacts.set('CRM-TEST', {
        id: 'CRM-TEST',
        leadId: 'lead-1',
        name: 'Test Contact',
        email: 'test@example.com',
        phone: '+62812345678',
        company: 'TestCo',
        createdAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/mock-crm/contacts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.contacts).toBeInstanceOf(Array);
      expect(res.body.contacts.length).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.contacts[0].id).toBe('CRM-TEST');
    });
  });

  describe('GET /mock-crm/activities', () => {
    it('returns activities list', async () => {
      // Pre-populate a mock activity
      mockCrmActivities.set('MOCK-ACT-1', {
        id: 'MOCK-ACT-1',
        leadId: 'lead-1',
        crmExternalId: 'CRM-TEST',
        type: 'CALL',
        callId: 'call-1',
        disposition: 'Connected - Conversation',
        notes: 'Test activity',
        createdAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/mock-crm/activities')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.activities).toBeInstanceOf(Array);
      expect(res.body.activities.length).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.activities[0].id).toBe('MOCK-ACT-1');
    });
  });
});
