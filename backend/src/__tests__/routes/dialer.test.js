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
    it('creates and completes a session', async () => {
      const res = await request(app)
        .post('/dialer/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ leadIds: leadIds.slice(0, 3) });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      expect(res.body.status).toBe('STOPPED');
      expect(res.body.calls).toBeInstanceOf(Array);
      expect(res.body.calls.length).toBeGreaterThan(0);
      expect(res.body.metrics.attempted).toBeGreaterThan(0);
    }, 15000);

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
      // Create a session first (awaits completion)
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
      if (res.body.calls.length > 0) {
        expect(res.body.calls[0].leadName).toBeTruthy();
      }
    }, 15000);
  });

  describe('POST /dialer/sessions/:id/stop', () => {
    it('stops a session', async () => {
      // Session is already completed after POST
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
    }, 15000);
  });

  describe('GET /dialer/sessions', () => {
    it('lists agent sessions', async () => {
      // Create a session (completes automatically)
      await request(app)
        .post('/dialer/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ leadIds: leadIds.slice(0, 3) });

      const res = await request(app)
        .get('/dialer/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.sessions).toBeInstanceOf(Array);
      expect(res.body.sessions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    }, 15000);
  });
});
