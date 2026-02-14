import express from 'express';
import cors from 'cors';
import leadsRouter from './routes/leads.js';
import dialerRouter from './routes/dialer.js';
import crmRouter from './routes/crm.js';
import leadCrmRouter from './routes/leadCrm.js';
import authRouter from './routes/auth.js';
import callsRouter from './routes/calls.js';
import { authRequired } from './middleware/auth.js';
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Global rate limiter
app.use(generalLimiter);

// Public routes
app.get('/', (req, res) => {
  res.json({ message: 'Lead Management API', version: '2.0' });
});

app.get('/filters/options', (req, res) => {
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

// Auth routes (public, with stricter rate limit)
app.use('/auth', authLimiter, authRouter);

// Protected routes
app.use('/leads', authRequired, leadsRouter);
app.use('/leads', authRequired, leadCrmRouter);
app.use('/dialer', authRequired, dialerRouter);
app.use('/mock-crm', authRequired, crmRouter);
app.use('/calls', authRequired, callsRouter);

export default app;
