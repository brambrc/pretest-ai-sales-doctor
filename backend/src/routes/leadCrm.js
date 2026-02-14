import { Router } from 'express';
import { getLeadById } from '../dal/leads.js';
import { getActivitiesByLeadId } from '../dal/crmActivities.js';

const router = Router();

// GET /leads/:id/crm-activities — get CRM activities for a lead
router.get('/:id/crm-activities', async (req, res) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ detail: 'Lead not found' });

    const activities = await getActivitiesByLeadId(req.params.id);

    res.json({
      leadId: req.params.id,
      leadName: lead.name,
      crmExternalId: lead.crmExternalId,
      activities,
      total: activities.length,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
