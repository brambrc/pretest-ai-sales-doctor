import { Link } from 'react-router-dom';

function SessionHistory({ sessions }) {
  return (
    <div className="session-history">
      <h2>Session History</h2>
      <table className="call-log-table">
        <thead>
          <tr>
            <th>Session ID</th>
            <th>Status</th>
            <th>Attempted</th>
            <th>Connected</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.id.slice(0, 8)}...</td>
              <td>
                <span className={`session-status ${s.status.toLowerCase()}`}>
                  {s.status}
                </span>
              </td>
              <td>{s.metrics?.attempted || 0}</td>
              <td>{s.metrics?.connected || 0}</td>
              <td>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}</td>
              <td>
                <Link to={`/dialer/${s.id}`} className="btn-view">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SessionHistory;
