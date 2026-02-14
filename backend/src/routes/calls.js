import { Router } from 'express';
import { calls } from '../store/index.js';
import { getCallById, updateCall } from '../dal/calls.js';
import { useInMemory } from '../db/pool.js';
import { getTranscriptionProvider } from '../providers/TranscriptionProvider.js';

const router = Router();

/**
 * Get a call from in-memory Map or Postgres.
 */
async function findCall(id) {
  // Try in-memory first
  const memCall = calls.get(id);
  if (memCall) return memCall;

  // Fall back to Postgres
  if (!useInMemory) {
    return await getCallById(id);
  }

  return null;
}

// GET /calls/:id — get a single call
router.get('/:id', async (req, res) => {
  const call = await findCall(req.params.id);
  if (!call) return res.status(404).json({ detail: 'Call not found' });
  res.json(call);
});

// POST /calls/:id/transcribe — start transcription
router.post('/:id/transcribe', async (req, res) => {
  const call = await findCall(req.params.id);
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

    // Persist to Postgres
    if (!useInMemory) {
      await updateCall(call.id, {
        transcriptionText: result.text,
        transcriptionStatus: 'COMPLETED',
      });
    }
  } catch {
    call.transcriptionStatus = 'FAILED';
    if (!useInMemory) {
      await updateCall(call.id, { transcriptionStatus: 'FAILED' }).catch(() => {});
    }
  }
});

// GET /calls/:id/transcription — get transcription result
router.get('/:id/transcription', async (req, res) => {
  const call = await findCall(req.params.id);
  if (!call) return res.status(404).json({ detail: 'Call not found' });

  res.json({
    callId: call.id,
    status: call.transcriptionStatus,
    text: call.transcriptionText,
  });
});

export default router;
