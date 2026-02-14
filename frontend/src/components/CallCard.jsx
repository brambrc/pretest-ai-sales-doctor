function CallCard({ call, isWinner, onTranscribe }) {
  const statusClass = call.status === 'RINGING'
    ? 'ringing'
    : call.callStatus === 'CONNECTED'
      ? 'connected'
      : call.callStatus === 'CANCELED_BY_DIALER'
        ? 'canceled'
        : 'failed';

  return (
    <div className={`call-card ${statusClass} ${isWinner ? 'winner' : ''}`}>
      <div className="call-card-header">
        <span className="call-line-label">
          {isWinner ? 'WINNER' : `Line`}
        </span>
        <span className={`call-status-badge ${statusClass}`}>
          {call.status === 'RINGING' ? 'RINGING...' : call.callStatus}
        </span>
      </div>
      <div className="call-card-body">
        <div className="call-lead-name">{call.leadName}</div>
        <div className="call-lead-phone">{call.leadPhone}</div>
        <div className="call-lead-company">{call.leadCompany}</div>
      </div>
      {call.status === 'RINGING' && (
        <div className="call-ringing-indicator">
          <span className="dot dot-1"></span>
          <span className="dot dot-2"></span>
          <span className="dot dot-3"></span>
        </div>
      )}
      {call.status === 'COMPLETED' && call.recordingUrl && (
        <div className="call-recording">
          <audio controls src={call.recordingUrl} preload="none">
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
      {call.status === 'COMPLETED' && call.crmActivityStatus && (
        <div className="call-crm-status">
          <span className={`crm-badge ${call.crmActivityStatus.toLowerCase()}`}>
            {call.crmActivityStatus === 'SYNCED' && 'CRM: Synced'}
            {call.crmActivityStatus === 'PENDING' && 'CRM: Syncing...'}
            {call.crmActivityStatus === 'FAILED' && 'CRM: Failed'}
          </span>
        </div>
      )}
      {call.status === 'COMPLETED' && onTranscribe && (
        <div className="call-transcription">
          {call.transcriptionStatus === 'COMPLETED' && call.transcriptionText && (
            <p className="transcription-text">{call.transcriptionText}</p>
          )}
          {call.transcriptionStatus === 'IN_PROGRESS' && (
            <p className="transcription-status">Transcribing...</p>
          )}
          {call.transcriptionStatus === 'FAILED' && (
            <p className="transcription-status error">Transcription failed</p>
          )}
          {(!call.transcriptionStatus || call.transcriptionStatus === 'NONE') && (
            <button className="btn-transcribe" onClick={() => onTranscribe(call.id)}>
              Transcribe
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CallCard;
