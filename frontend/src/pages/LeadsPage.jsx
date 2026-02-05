import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLeads, enrichLead, getFilterOptions } from '../api';
import LeadTable from '../components/LeadTable';
import FilterBar from '../components/FilterBar';

function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ industry: '', headcount: '' });
  const [options, setOptions] = useState({ industries: [], headcounts: [] });

  const fetchLeads = async () => {
    setLoading(true);
    const res = await getLeads(filters);
    setLeads(res.data.leads);
    setLoading(false);
  };

  const fetchOptions = async () => {
    const res = await getFilterOptions();
    setOptions(res.data);
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const handleEnrich = async (id) => {
    await enrichLead(id);
    fetchLeads();
  };

  return (
    <div className="page leads-page">
      <div className="page-header">
        <h1>Leads</h1>
        <Link to="/add" className="btn-primary">+ Add Lead</Link>
      </div>
      
      <FilterBar filters={filters} setFilters={setFilters} options={options} />
      <LeadTable leads={leads} onEnrich={handleEnrich} loading={loading} />
    </div>
  );
}

export default LeadsPage;