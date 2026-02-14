function getPriorityBadge(score) {
  if (!score || score === 0) return <span className="priority-badge none">None</span>;
  if (score >= 70) return <span className="priority-badge high">High ({score})</span>;
  if (score >= 40) return <span className="priority-badge medium">Med ({score})</span>;
  return <span className="priority-badge low">Low ({score})</span>;
}

function LeadTable({ leads, onEnrich, loading, selectedIds, onToggleSelect, onToggleAll }) {
  if (loading) return <p>Loading...</p>;

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds?.has(l.id));

  return (
    <table className="lead-table">
      <thead>
        <tr>
          {onToggleSelect && (
            <th className="checkbox-col">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll?.()}
              />
            </th>
          )}
          <th>Name</th>
          <th>Job Title</th>
          <th>Company</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Industry</th>
          <th>Headcount</th>
          <th>Priority</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <tr key={lead.id} className={selectedIds?.has(lead.id) ? 'selected-row' : ''}>
            {onToggleSelect && (
              <td className="checkbox-col">
                <input
                  type="checkbox"
                  checked={selectedIds?.has(lead.id) || false}
                  onChange={() => onToggleSelect(lead.id)}
                />
              </td>
            )}
            <td>{lead.name}</td>
            <td>{lead.job_title}</td>
            <td>{lead.company}</td>
            <td>{lead.email}</td>
            <td>{lead.phone_number}</td>
            <td>{lead.industry}</td>
            <td>{lead.headcount}</td>
            <td>{getPriorityBadge(lead.priority_score)}</td>
            <td>
              <button
                onClick={() => onEnrich(lead.id)}
                disabled={lead.enriched}
                className={lead.enriched ? 'enriched' : ''}
              >
                {lead.enriched ? 'Enriched' : 'Enrich'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default LeadTable;
