import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { seedData } from '../../store/seed.js';
import { leads, calls, sessions, crmActivities, mockCrmContacts, mockCrmActivities, users } from '../../store/index.js';

describe('Dialer routes', () => {
  let token;
  let leadIds;

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
    leadIds = Array.from(leads.keys());

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

  describe('POST /dialer/sessions', () => {
    it('creates a session', async () => {
      const res = await request(app)
        .post('/dialer/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ leadIds: leadIds.slice(0, 3) });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      expect(res.body.status).toBe('RUNNING');
      expect(res.body.concurrency).toBe(2);
      expect(res.body.activeCallIds).toBeInstanceOf(Array);
    });

    it('returns 400 without leadIds', async () => {
      const res = await request(app)
        .post('/dialer/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.detail).toContain('leadIds');
    });
  });

  describe('GET /dialer/sessions/:id', () => {
    it('returns session state', async () => {
      // Create a session first
      const createRes = await request(app)
        .post('/dialer/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ leadIds: leadIds.slice(0, 3) });
      const sessionId = createRes.body.id;

      const res = await request(app)
        .get(`/dialer/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(sessionId);
      expect(res.body.calls).toBeInstanceOf(Array);
      // Enriched calls should have leadName
      if (res.body.calls.length > 0) {
        expect(res.body.calls[0].leadName).toBeTruthy();
      }
    });
  });

  describe('POST /dialer/sessions/:id/stop', () => {
    it('stops a session', async () => {
      // Create a session first
      const createRes = await request(app)
        .post('/dialer/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ leadIds: leadIds.slice(0, 3) });
      const sessionId = createRes.body.id;

      const res = await request(app)
        .post(`/dialer/sessions/${sessionId}/stop`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('STOPPED');
    });
  });

  describe('GET /dialer/sessions', () => {
    it('lists agent sessions', async () => {
      // Create a session first
      await request(app)
        .post('/dialer/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ leadIds: leadIds.slice(0, 3) });

      // Stop it so we can verify listing works
      // (hasRunningSession would block creating a second session)
      const sessionsArr = Array.from(sessions.values());
      if (sessionsArr.length > 0) {
        // Stop the first session to allow the list endpoint to be clean
        await request(app)
          .post(`/dialer/sessions/${sessionsArr[0].id}/stop`)
          .set('Authorization', `Bearer ${token}`);
      }

      const res = await request(app)
        .get('/dialer/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.sessions).toBeInstanceOf(Array);
      expect(res.body.sessions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });
});
