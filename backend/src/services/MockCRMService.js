import { v4 as uuidv4 } from 'uuid';
import { getLeadById, updateLead } from '../dal/leads.js';
import { createCrmActivity, getActivityByCallId } from '../dal/crmActivities.js';
import { upsertMockContact, createMockActivity } from '../dal/mockCrm.js';

/**
 * Upsert a contact in the mock external CRM.
 */
export async function upsertContact(leadId) {
  const lead = await getLeadById(leadId);
  if (!lead) return null;

  if (lead.crmExternalId) {
    return lead.crmExternalId;
  }

  const crmId = `CRM-${uuidv4().slice(0, 8).toUpperCase()}`;
  const contact = {
    id: crmId,
    leadId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone_number,
    company: lead.company,
    createdAt: new Date().toISOString(),
  };

  await upsertMockContact(contact);
  await updateLead(leadId, { crmExternalId: crmId });

  return crmId;
}

/**
 * Create a CRM activity for a completed call.
 * Idempotent: if an activity already exists for this callId, return existing.
 */
export async function createActivity(call) {
  // Idempotency check
  const existing = await getActivityByCallId(call.id);
  if (existing) return existing;

  const crmExternalId = await upsertContact(call.leadId);

  const dispositionMap = {
    CONNECTED: 'Connected - Conversation',
    NO_ANSWER: 'No Answer',
    BUSY: 'Busy',
    VOICEMAIL: 'Left Voicemail',
    CANCELED_BY_DIALER: 'Canceled by Dialer',
  };

  const notesMap = {
    CONNECTED: 'Call connected successfully. Lead engaged in conversation.',
    NO_ANSWER: 'Call went unanswered after multiple rings.',
    BUSY: 'Line was busy. Will retry later.',
    VOICEMAIL: 'Reached voicemail. No message left.',
    CANCELED_BY_DIALER: 'Call was canceled because another line connected first.',
  };

  const activityId = uuidv4();
  const activity = {
    id: activityId,
    leadId: call.leadId,
    crmExternalId,
    type: 'CALL',
    callId: call.id,
    disposition: dispositionMap[call.callStatus] || call.callStatus,
    notes: notesMap[call.callStatus] || `Call ended with status: ${call.callStatus}`,
    createdAt: new Date().toISOString(),
  };

  await createCrmActivity(activity);

  // Save in mock external CRM store
  const mockActivityId = `MOCK-${uuidv4().slice(0, 8).toUpperCase()}`;
  await createMockActivity({
    ...activity,
    id: mockActivityId,
    sourceActivityId: activityId,
  });

  return activity;
}
