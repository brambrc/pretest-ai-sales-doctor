export class MockTranscriptionProvider {
  async transcribe(recordingUrl) {
    // Simulate transcription delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      text: 'Hello, this is a mock transcription of the call recording. The lead expressed interest in our product and would like a follow-up meeting next week.',
      duration: 45,
      confidence: 0.95,
    };
  }
}
