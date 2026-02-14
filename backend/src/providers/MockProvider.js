import { weightedRandom, randomInt } from '../utils/random.js';

const CALL_OUTCOMES = [
  { value: 'CONNECTED', weight: 40 },
  { value: 'NO_ANSWER', weight: 25 },
  { value: 'BUSY', weight: 20 },
  { value: 'VOICEMAIL', weight: 15 },
];

const activeTimers = new Map();

export class MockProvider {
  startCall(lead, sessionId, onComplete) {
    const duration = randomInt(3000, 8000);
    const timerId = setTimeout(() => {
      activeTimers.delete(lead.id);
      const outcome = weightedRandom(CALL_OUTCOMES);
      onComplete(outcome);
    }, duration);
    activeTimers.set(lead.id, timerId);
  }

  endCall(providerCallId) {
    // In mock mode, timers are tracked by lead ID in the engine
    // This is a no-op; the engine handles timer cleanup
  }

  getRecording(providerCallId) {
    return `https://mock-recordings.example.com/${providerCallId}.wav`;
  }
}
