import { useState, useCallback, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getDialerSession, stopDialerSession, transcribeCall } from '../api';
import { usePolling } from '../hooks/usePolling';
import { useWebSocket } from '../hooks/useWebSocket';
import CallCard from '../components/CallCard';
import SessionMetrics from '../components/SessionMetrics';

// Cache sessions in localStorage so session history can view them
function cacheSession(session) {
  if (!session?.id) return;
  try {
    const cache = JSON.parse(localStorage.getItem('sessionCache') || '{}');
    cache[session.id] = session;
    localStorage.setItem('sessionCache', JSON.stringify(cache));
  } catch { /* ignore */ }
}

function getCachedSession(sessionId) {
  try {
    const cache = JSON.parse(localStorage.getItem('sessionCache') || '{}');
    return cache[sessionId] || null;
  } catch { return null; }
}

function DialerPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const initialSession = location.state?.session || getCachedSession(sessionId);
  const [session, setSession] = useState(initialSession);
  const [error, setError] = useState(null);
  const [stopping, setStopping] = useState(false);

  const isRunning = session?.status === 'RUNNING';

  // Cache session whenever it updates
  useEffect(() => {
    if (session) cacheSession(session);
  }, [session]);

  const fetchSession = useCallback(async () => {
    try {
      const res = await getDialerSession(sessionId);
      setSession(res.data);
      setError(null);
    } catch (err) {
      // On serverless, session may not exist in memory — if we already
      // have session data from nav state or cache, just keep it
      if (!session) {
        setError('Failed to load session');
      }
    }
  }, [sessionId, session]);

  // Only try WebSocket if session is still running
  const { fallbackToPolling } = useWebSocket(
    isRunning ? sessionId : null,
    (data) => {
      if (data.state) setSession(data.state);
    }
  );

  // Poll if: no session data yet (direct URL visit) OR session is running and WS failed
  usePolling(fetchSession, 1500, !session || (isRunning && fallbackToPolling));

  const handleStop = async () => {
    setStopping(true);
    try {
      await stopDialerSession(sessionId);
      await fetchSession();
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
    setStopping(false);
  };

  const handleTranscribe = async (callId) => {
    try {
      await transcribeCall(callId);
      setTimeout(fetchSession, 2000);
    } catch (err) {
      console.error('Failed to start transcription:', err);
    }
  };

  if (error && !session) {
    return (
      <div className="page dialer-page">
        <p className="error">{error}</p>
        <Link to="/" className="btn-primary">Back to Leads</Link>
      </div>
    );
  }

  if (!session) {
    return <div className="page dialer-page"><p>Loading session...</p></div>;
  }

  const activeCalls = session.calls.filter((c) => c.status === 'RINGING');
  const completedCalls = session.calls.filter((c) => c.status === 'COMPLETED');

  return (
    <div className="page dialer-page">
      <div className="page-header">
        <div>
          <h1>Dialer Session</h1>
          <span className={`session-status ${session.status.toLowerCase()}`}>
            {session.status}
          </span>
        </div>
        <div className="header-actions">
          {isRunning && (
            <button
              className="btn-stop"
              onClick={handleStop}
              disabled={stopping}
            >
              {stopping ? 'Stopping...' : 'Stop Session'}
            </button>
          )}
          <Link to="/" className="btn-primary">Back to Leads</Link>
        </div>
      </div>

      <SessionMetrics metrics={session.metrics} />

      {/* Active Lines */}
      <div className="active-lines-section">
        <h2>Active Lines</h2>
        <div className="call-cards">
          {activeCalls.length > 0 ? (
            activeCalls.map((call) => (
              <CallCard key={call.id} call={call} isWinner={false} />
            ))
          ) : (
            <div className="no-active-calls">
              {session.status === 'STOPPED' ? 'Session ended' : 'Waiting for calls...'}
            </div>
          )}
        </div>
      </div>

      {/* Call Log */}
      <div className="call-log-section">
        <h2>Call Log</h2>
        <table className="call-log-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Company</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Outcome</th>
              <th>CRM</th>
            </tr>
          </thead>
          <tbody>
            {completedCalls.map((call) => (
              <tr
                key={call.id}
                className={call.id === session.winnerCallId ? 'winner-row' : ''}
              >
                <td>{call.leadName}</td>
                <td>{call.leadCompany}</td>
                <td>{call.leadPhone}</td>
                <td>{call.status}</td>
                <td>
                  <span className={`outcome-badge ${call.callStatus?.toLowerCase().replace(/_/g, '-')}`}>
                    {call.callStatus}
                    {call.id === session.winnerCallId && ' (WINNER)'}
                  </span>
                </td>
                <td>
                  {call.crmActivityStatus && (
                    <span className={`crm-badge ${call.crmActivityStatus.toLowerCase()}`}>
                      {call.crmActivityStatus === 'SYNCED' && 'Synced'}
                      {call.crmActivityStatus === 'PENDING' && 'Syncing...'}
                      {call.crmActivityStatus === 'FAILED' && 'Failed'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {completedCalls.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-row">No completed calls yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Completed Call Cards with Recording/Transcription */}
      {completedCalls.length > 0 && (
        <div className="completed-calls-section">
          <h2>Call Details</h2>
          <div className="call-cards completed-cards">
            {completedCalls.map((call) => (
              <CallCard
                key={call.id}
                call={call}
                isWinner={call.id === session.winnerCallId}
                onTranscribe={handleTranscribe}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DialerPage;
