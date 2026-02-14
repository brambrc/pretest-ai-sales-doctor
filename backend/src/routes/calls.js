import { Router } from 'express';
import { calls } from '../store/index.js';
import { getTranscriptionProvider } from '../providers/TranscriptionProvider.js';

const router = Router();

// GET /calls/:id — get a single call
router.get('/:id', (req, res) => {
  const call = calls.get(req.params.id);
  if (!call) return res.status(404).json({ detail: 'Call not found' });
  res.json(call);
});

// POST /calls/:id/transcribe — start transcription
router.post('/:id/transcribe', async (req, res) => {
  const call = calls.get(req.params.id);
  if (!call) return res.status(404).json({ detail: 'Call not found' });
  if (call.status !== 'COMPLETED') {
    return res.status(400).json({ detail: 'Call must be completed before transcription' });
  }
  if (call.transcriptionStatus === 'IN_PROGRESS') {
    return res.status(409).json({ detail: 'Transcription already in progress' });
  }

  call.transcriptionStatus = 'IN_PROGRESS';
  res.json({ message: 'Transcription started', callId: call.id });

  // Run transcription asynchronously
  try {
    const provider = getTranscriptionProvider();
    const result = await provider.transcribe(call.recordingUrl);
    call.transcriptionText = result.text;
    call.transcriptionStatus = 'COMPLETED';
  } catch {
    call.transcriptionStatus = 'FAILED';
  }
});

// GET /calls/:id/transcription — get transcription result
router.get('/:id/transcription', (req, res) => {
  const call = calls.get(req.params.id);
  if (!call) return res.status(404).json({ detail: 'Call not found' });

  res.json({
    callId: call.id,
    status: call.transcriptionStatus,
    text: call.transcriptionText,
  });
});

export default router;
