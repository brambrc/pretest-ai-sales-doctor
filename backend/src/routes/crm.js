import { Router } from 'express';
import { getAllMockContacts, getAllMockActivities } from '../dal/mockCrm.js';

const router = Router();

// GET /mock-crm/contacts — inspect mock CRM contacts
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await getAllMockContacts();
    res.json({ contacts, total: contacts.length });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /mock-crm/activities — inspect mock CRM activities
router.get('/activities', async (req, res) => {
  try {
    const activities = await getAllMockActivities();
    res.json({ activities, total: activities.length });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
