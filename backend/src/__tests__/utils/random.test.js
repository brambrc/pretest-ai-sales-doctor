import { describe, it, expect } from 'vitest';
import { weightedRandom, randomInt } from '../../utils/random.js';

describe('weightedRandom', () => {
  it('returns one of the provided values', () => {
    const outcomes = [
      { value: 'A', weight: 50 },
      { value: 'B', weight: 30 },
      { value: 'C', weight: 20 },
    ];
    const result = weightedRandom(outcomes);
    expect(['A', 'B', 'C']).toContain(result);
  });

  it('with a single item always returns that item', () => {
    const outcomes = [{ value: 'ONLY', weight: 100 }];
    for (let i = 0; i < 50; i++) {
      expect(weightedRandom(outcomes)).toBe('ONLY');
    }
  });

  it('with weight 0 never returns that item', () => {
    const outcomes = [
      { value: 'NEVER', weight: 0 },
      { value: 'ALWAYS', weight: 100 },
    ];
    for (let i = 0; i < 100; i++) {
      expect(weightedRandom(outcomes)).toBe('ALWAYS');
    }
  });

  it('distribution roughly matches weights', () => {
    const outcomes = [
      { value: 'CONNECTED', weight: 40 },
      { value: 'NO_ANSWER', weight: 25 },
      { value: 'BUSY', weight: 20 },
      { value: 'VOICEMAIL', weight: 15 },
    ];
    const counts = { CONNECTED: 0, NO_ANSWER: 0, BUSY: 0, VOICEMAIL: 0 };

    for (let i = 0; i < 1000; i++) {
      const result = weightedRandom(outcomes);
      counts[result]++;
    }

    // With 1000 samples, order should hold: CONNECTED > NO_ANSWER > BUSY > VOICEMAIL
    expect(counts.CONNECTED).toBeGreaterThan(counts.NO_ANSWER);
    expect(counts.NO_ANSWER).toBeGreaterThan(counts.BUSY);
    expect(counts.BUSY).toBeGreaterThan(counts.VOICEMAIL);
  });
});

describe('randomInt', () => {
  it('returns value within bounds', () => {
    for (let i = 0; i < 50; i++) {
      const val = randomInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it('handles equal min and max', () => {
    expect(randomInt(7, 7)).toBe(7);
  });

  it('returns integer values', () => {
    for (let i = 0; i < 50; i++) {
      const val = randomInt(1, 100);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('covers full range', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      seen.add(randomInt(5, 10));
    }
    // With 100 attempts over a range of 6 values, both endpoints should appear
    expect(seen.has(5)).toBe(true);
    expect(seen.has(10)).toBe(true);
  });
});
