import { MockTranscriptionProvider } from './MockTranscriptionProvider.js';
import { WhisperTranscriptionProvider } from './WhisperTranscriptionProvider.js';

let transcriptionProvider = null;

export function createTranscriptionProvider() {
  const provider = process.env.TRANSCRIPTION_PROVIDER || 'mock';

  switch (provider) {
    case 'whisper':
      return new WhisperTranscriptionProvider();
    case 'mock':
    default:
      return new MockTranscriptionProvider();
  }
}

export function getTranscriptionProvider() {
  if (!transcriptionProvider) {
    transcriptionProvider = createTranscriptionProvider();
  }
  return transcriptionProvider;
}
