import { MockProvider } from './MockProvider.js';
import { TwilioProvider } from './TwilioProvider.js';

export function createTelephonyProvider() {
  const provider = process.env.TELEPHONY_PROVIDER || 'mock';

  switch (provider) {
    case 'twilio':
      return new TwilioProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}
