import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
export const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3002').replace(/^http/, 'ws') + '/ws';

const api = axios.create({
  baseURL: API_BASE,
});

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const loginUser = (email, password) =>
  api.post('/auth/login', { email, password });

export const registerUser = (name, email, password) =>
  api.post('/auth/register', { name, email, password });

// Lead endpoints
export const getLeads = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.industry) params.append('industry', filters.industry);
  if (filters.headcount) params.append('headcount', filters.headcount);
  return api.get(`/leads?${params}`);
};

export const createLead = (data) => api.post('/leads', data);

export const enrichLead = (id) => api.post(`/leads/${id}/enrich`);

export const getFilterOptions = () => api.get('/filters/options');

// Dialer endpoints
export const createDialerSession = (leadIds) =>
  api.post('/dialer/sessions', { leadIds });

export const getDialerSession = (sessionId) =>
  api.get(`/dialer/sessions/${sessionId}`);

export const stopDialerSession = (sessionId) =>
  api.post(`/dialer/sessions/${sessionId}/stop`);

export const getAgentSessions = (status) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  return api.get(`/dialer/sessions?${params}`);
};

// CRM endpoints
export const getLeadCrmActivities = (leadId) =>
  api.get(`/leads/${leadId}/crm-activities`);

export const getMockCrmContacts = () => api.get('/mock-crm/contacts');

export const getMockCrmActivities = () => api.get('/mock-crm/activities');

// Call endpoints
export const getCall = (callId) => api.get(`/calls/${callId}`);

export const transcribeCall = (callId) => api.post(`/calls/${callId}/transcribe`);

export const getTranscription = (callId) => api.get(`/calls/${callId}/transcription`);

export default api;
