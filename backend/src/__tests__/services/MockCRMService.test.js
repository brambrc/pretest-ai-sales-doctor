import { describe, it, expect, beforeEach } from 'vitest';
import { upsertContact, createActivity } from '../../services/MockCRMService.js';
import { leads, crmActivities, mockCrmContacts, mockCrmActivities } from '../../store/index.js';

describe('MockCRMService', () => {
  const testLeadId = 'lead-001';
  const testLead = {
    id: testLeadId,
    name: 'Test User',
    email: 'test@example.com',
    phone_number: '+62812345678',
    company: 'TestCo',
    job_title: 'CEO',
    headcount: '11-50',
    industry: 'Technology',
    enriched: false,
    enrichment_data: null,
    crmExternalId: null,
    priority_score: 0,
  };

  beforeEach(() => {
    leads.clear();
    crmActivities.clear();
    mockCrmContacts.clear();
    mockCrmActivities.clear();
    leads.set(testLeadId, { ...testLead });
  });

  describe('upsertContact', () => {
    it('creates new contact and sets crmExternalId on lead', async () => {
      const crmId = await upsertContact(testLeadId);

      expect(crmId).toBeTruthy();
      expect(crmId).toMatch(/^CRM-/);

      // crmExternalId should be set on the lead in the store
      const lead = leads.get(testLeadId);
      expect(lead.crmExternalId).toBe(crmId);

      // A contact should exist in mockCrmContacts
      expect(mockCrmContacts.size).toBe(1);
      const contact = mockCrmContacts.get(crmId);
      expect(contact.leadId).toBe(testLeadId);
      expect(contact.name).toBe('Test User');
    });

    it('returns existing crmExternalId if already set (idempotent)', async () => {
      // Set crmExternalId before calling upsertContact
      const existingCrmId = 'CRM-EXISTING';
      leads.get(testLeadId).crmExternalId = existingCrmId;

      const crmId = await upsertContact(testLeadId);
      expect(crmId).toBe(existingCrmId);

      // No new contact should have been created
      expect(mockCrmContacts.size).toBe(0);
    });

    it('returns null for non-existent lead', async () => {
      const result = await upsertContact('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('createActivity', () => {
    const makeCall = (overrides = {}) => ({
      id: 'call-001',
      leadId: testLeadId,
      sessionId: 'session-001',
      status: 'COMPLETED',
      callStatus: 'CONNECTED',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      ...overrides,
    });

    it('creates activity in both crmActivities and mockCrmActivities stores', async () => {
      const call = makeCall();
      const activity = await createActivity(call);

      expect(activity).toBeTruthy();
      expect(activity.callId).toBe('call-001');
      expect(activity.leadId).toBe(testLeadId);
      expect(activity.type).toBe('CALL');

      // Activity should be in crmActivities store
      expect(crmActivities.size).toBe(1);

      // Activity should also be in mockCrmActivities store
      expect(mockCrmActivities.size).toBe(1);
    });

    it('is idempotent (calling twice with same call returns same activity)', async () => {
      const call = makeCall();
      const first = await createActivity(call);
      const second = await createActivity(call);

      expect(first.id).toBe(second.id);
      // Should not create duplicate entries
      expect(crmActivities.size).toBe(1);
    });

    it('maps CONNECTED disposition correctly', async () => {
      const call = makeCall({ callStatus: 'CONNECTED' });
      const activity = await createActivity(call);

      expect(activity.disposition).toBe('Connected - Conversation');
      expect(activity.notes).toContain('connected successfully');
    });

    it('maps CANCELED_BY_DIALER disposition correctly', async () => {
      const call = makeCall({ id: 'call-canceled', callStatus: 'CANCELED_BY_DIALER' });
      const activity = await createActivity(call);

      expect(activity.disposition).toBe('Canceled by Dialer');
      expect(activity.notes).toContain('canceled');
    });
  });
});
