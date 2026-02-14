/**
 * OpenAI Whisper transcription provider skeleton.
 * Requires OPENAI_API_KEY env var.
 */
export class WhisperTranscriptionProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
  }

  async transcribe(recordingUrl) {
    // TODO: Implement OpenAI Whisper transcription
    // 1. Download recording from recordingUrl
    // 2. Send to OpenAI Whisper API
    // const openai = new OpenAI({ apiKey: this.apiKey });
    // const transcription = await openai.audio.transcriptions.create({
    //   file: audioStream,
    //   model: 'whisper-1',
    // });
    // return { text: transcription.text, duration: null, confidence: null };
    throw new Error('WhisperTranscriptionProvider.transcribe not yet implemented');
  }
}
