-- Initial schema for lead management app
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'agent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  job_title VARCHAR(255),
  phone_number VARCHAR(50),
  company VARCHAR(255),
  email VARCHAR(255),
  headcount VARCHAR(50),
  industry VARCHAR(100),
  enriched BOOLEAN DEFAULT FALSE,
  enrichment_data JSONB,
  crm_external_id VARCHAR(100),
  priority_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES users(id),
  lead_queue UUID[] DEFAULT '{}',
  concurrency INTEGER DEFAULT 2,
  active_call_ids UUID[] DEFAULT '{}',
  winner_call_id UUID,
  status VARCHAR(50) DEFAULT 'RUNNING',
  metrics JSONB DEFAULT '{"attempted":0,"connected":0,"failed":0,"canceled":0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  session_id UUID REFERENCES sessions(id),
  status VARCHAR(50) DEFAULT 'RINGING',
  call_status VARCHAR(50),
  provider_call_id VARCHAR(100),
  recording_url TEXT,
  transcription_text TEXT,
  transcription_status VARCHAR(50) DEFAULT 'NONE',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  crm_external_id VARCHAR(100),
  type VARCHAR(50) DEFAULT 'CALL',
  call_id UUID REFERENCES calls(id),
  disposition VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_crm_contacts (
  id VARCHAR(100) PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_crm_activities (
  id VARCHAR(100) PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  crm_external_id VARCHAR(100),
  type VARCHAR(50),
  call_id UUID,
  disposition VARCHAR(255),
  notes TEXT,
  source_activity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_agent_status ON sessions(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_session_id ON calls(session_id);
CREATE INDEX IF NOT EXISTS idx_calls_lead_id ON calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_call_id ON crm_activities(call_id);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
