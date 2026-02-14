import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLeads, enrichLead, getFilterOptions, createDialerSession, getAgentSessions } from '../api';
import { useAuth } from '../contexts/AuthContext';
import LeadTable from '../components/LeadTable';
import FilterBar from '../components/FilterBar';
import SessionHistory from '../components/SessionHistory';

function LeadsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ industry: '', headcount: '' });
  const [options, setOptions] = useState({ industries: [], headcounts: [] });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [starting, setStarting] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [sortByPriority, setSortByPriority] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const res = await getLeads(filters);
    let results = res.data.leads;
    if (sortByPriority) {
      results = [...results].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    }
    setLeads(results);
    setLoading(false);
  };

  const fetchOptions = async () => {
    const res = await getFilterOptions();
    setOptions(res.data);
  };

  const fetchSessions = async () => {
    try {
      const res = await getAgentSessions();
      setPastSessions(res.data.sessions || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchSessions();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [filters, sortByPriority]);

  const handleEnrich = async (id) => {
    await enrichLead(id);
    fetchLeads();
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (leads.every((l) => selectedIds.has(l.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const handleStartDialer = async () => {
    if (selectedIds.size === 0) return;
    setStarting(true);
    try {
      const res = await createDialerSession(Array.from(selectedIds));
      navigate(`/dialer/${res.data.id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        alert('You already have a running session. Stop it first.');
      } else {
        console.error('Failed to start dialer session:', err);
      }
      setStarting(false);
    }
  };

  return (
    <div className="page leads-page">
      <div className="page-header">
        <h1>Leads</h1>
        <div className="header-actions">
          <span className="user-info">Hi, {user?.name}</span>
          <button
            className="btn-dialer"
            onClick={handleStartDialer}
            disabled={selectedIds.size === 0 || starting}
          >
            {starting ? 'Starting...' : `Start Dialer (${selectedIds.size})`}
          </button>
          <Link to="/add" className="btn-primary">+ Add Lead</Link>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="filter-actions">
        <FilterBar filters={filters} setFilters={setFilters} options={options} />
        <label className="sort-toggle">
          <input
            type="checkbox"
            checked={sortByPriority}
            onChange={(e) => setSortByPriority(e.target.checked)}
          />
          Sort by Priority
        </label>
      </div>

      <LeadTable
        leads={leads}
        onEnrich={handleEnrich}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleAll={handleToggleAll}
      />

      {pastSessions.length > 0 && (
        <SessionHistory sessions={pastSessions} />
      )}
    </div>
  );
}

export default LeadsPage;
