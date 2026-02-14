function SessionMetrics({ metrics }) {
  return (
    <div className="session-metrics">
      <div className="metric">
        <span className="metric-value">{metrics.attempted}</span>
        <span className="metric-label">Attempted</span>
      </div>
      <div className="metric metric-connected">
        <span className="metric-value">{metrics.connected}</span>
        <span className="metric-label">Connected</span>
      </div>
      <div className="metric metric-failed">
        <span className="metric-value">{metrics.failed}</span>
        <span className="metric-label">Failed</span>
      </div>
      <div className="metric metric-canceled">
        <span className="metric-value">{metrics.canceled}</span>
        <span className="metric-label">Canceled</span>
      </div>
    </div>
  );
}

export default SessionMetrics;
