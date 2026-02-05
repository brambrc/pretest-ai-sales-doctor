import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLead, getFilterOptions } from '../api';
import LeadForm from '../components/LeadForm';

function AddLeadPage() {
  const navigate = useNavigate();
  const [options, setOptions] = useState({ industries: [], headcounts: [] });

  useEffect(() => {
    getFilterOptions().then((res) => setOptions(res.data));
  }, []);

  const handleSubmit = async (data) => {
    await createLead(data);
    navigate('/');
  };

  return (
    <div className="page form-page">
      <h1>Add New Lead</h1>
      <LeadForm onSubmit={handleSubmit} options={options} />
    </div>
  );
}

export default AddLeadPage;