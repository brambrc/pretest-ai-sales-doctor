import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

export const getLeads = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.industry) params.append('industry', filters.industry);
  if (filters.headcount) params.append('headcount', filters.headcount);
  return api.get(`/leads?${params}`);
};

export const createLead = (data) => api.post('/leads', data);

export const enrichLead = (id) => api.post(`/leads/${id}/enrich`);

export const getFilterOptions = () => api.get('/filters/options');

export default api;