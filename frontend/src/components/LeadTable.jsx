function LeadTable({ leads, onEnrich, loading }) {
  if (loading) return <p>Loading...</p>;

  return (
    <table className="lead-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Job Title</th>
          <th>Company</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Industry</th>
          <th>Headcount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <tr key={lead.id}>
            <td>{lead.name}</td>
            <td>{lead.job_title}</td>
            <td>{lead.company}</td>
            <td>{lead.email}</td>
            <td>{lead.phone_number}</td>
            <td>{lead.industry}</td>
            <td>{lead.headcount}</td>
            <td>
              <button
                onClick={() => onEnrich(lead.id)}
                disabled={lead.enriched}
                className={lead.enriched ? 'enriched' : ''}
              >
                {lead.enriched ? '✓ Enriched' : 'Enrich'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default LeadTable;