import { Router } from 'express';
import { getAllLeads, getLeadById, createLead, updateLead } from '../dal/leads.js';
import { calculatePriorityScore } from '../utils/scoring.js';
import { writeLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// GET /leads — list leads with optional filters
router.get('/', async (req, res) => {
  try {
    const { industry, headcount } = req.query;
    const results = await getAllLeads({ industry, headcount });
    res.json({ leads: results, total: results.length });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /leads/:id — single lead
router.get('/:id', async (req, res) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ detail: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /leads — create a lead
router.post('/', writeLimiter, async (req, res) => {
  try {
    const { name, job_title, phone_number, company, email, headcount, industry } = req.body;

    if (!name || !job_title || !phone_number || !company || !email || !headcount || !industry) {
      return res.status(400).json({ detail: 'All fields are required' });
    }

    const newLead = await createLead({ name, job_title, phone_number, company, email, headcount, industry });
    res.status(201).json({ message: 'Lead created', lead: newLead });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /leads/:id/enrich — enrich a lead with mock data
router.post('/:id/enrich', writeLimiter, async (req, res) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ detail: 'Lead not found' });

    const enrichment_data = {
      linkedin_url: `https://linkedin.com/in/${lead.name.toLowerCase().replace(/ /g, '-')}`,
      company_size_verified: true,
      company_revenue: '$1M - $10M',
      technologies_used: ['Python', 'React', 'AWS'],
      recent_funding: 'Series A - $5M',
      decision_maker_score: 85,
    };

    const updated = await updateLead(req.params.id, { enriched: true, enrichment_data });

    // Calculate priority score after enrichment
    const priorityScore = calculatePriorityScore(updated);
    const final = await updateLead(req.params.id, { priority_score: priorityScore });

    res.json({ message: 'Lead enriched', lead: final });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /leads/:id/score — recalculate priority score
router.post('/:id/score', async (req, res) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ detail: 'Lead not found' });

    const priorityScore = calculatePriorityScore(lead);
    const updated = await updateLead(req.params.id, { priority_score: priorityScore });
    res.json({ message: 'Score updated', lead: updated });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /filters/options — dropdown options
router.get('/filters/options', (req, res) => {
  res.json({
    industries: [
      'Technology',
      'Construction',
      'Logistics',
      'Healthcare',
      'Finance',
      'Manufacturing',
    ],
    headcounts: ['1-10', '11-50', '51-200', '201-500', '500+'],
  });
});

export default router;
