/**
 * Weighted random selection for call outcomes.
 * @param {Array<{value: string, weight: number}>} outcomes
 * @returns {string}
 */
export function weightedRandom(outcomes) {
  const total = outcomes.reduce((sum, o) => sum + o.weight, 0);
  let r = Math.random() * total;
  for (const outcome of outcomes) {
    r -= outcome.weight;
    if (r <= 0) return outcome.value;
  }
  return outcomes[outcomes.length - 1].value;
}

/**
 * Random integer between min and max (inclusive).
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
