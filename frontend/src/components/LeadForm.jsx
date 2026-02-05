import { useState } from 'react';

const initialForm = {
  name: '',
  job_title: '',
  phone_number: '',
  company: '',
  email: '',
  headcount: '',
  industry: '',
};

function LeadForm({ onSubmit, options }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(form);
    setForm(initialForm);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="lead-form">
      <div className="form-group">
        <label>Name</label>
        <input name="name" value={form.name} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Job Title</label>
        <input name="job_title" value={form.job_title} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Company</label>
        <input name="company" value={form.company} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Phone Number</label>
        <input name="phone_number" value={form.phone_number} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Industry</label>
        <select name="industry" value={form.industry} onChange={handleChange} required>
          <option value="">Select Industry</option>
          {options.industries?.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Headcount</label>
        <select name="headcount" value={form.headcount} onChange={handleChange} required>
          <option value="">Select Headcount</option>
          {options.headcounts?.map((hc) => (
            <option key={hc} value={hc}>{hc}</option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding...' : 'Add Lead'}
      </button>
    </form>
  );
}

export default LeadForm;