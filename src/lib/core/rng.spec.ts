import { describe, expect, it } from 'vitest';
import { randomAt } from './rng';

describe('named counter-addressed randomness', () => {
  it('is repeatable and independent of request order', () => {
    const path = ['experiment', 'alien-lake', 'variation'];
    const forward = [0, 1, 2].map((counter) => randomAt('seed', path, counter));
    const reverse = [2, 1, 0].map((counter) => randomAt('seed', path, counter));
    expect(reverse.reverse()).toEqual(forward);
    expect(new Set(forward).size).toBe(3);
  });

  it('isolates unrelated paths and validates addresses', () => {
    expect(randomAt('seed', ['lineage', 'a'], 0)).not.toBe(randomAt('seed', ['lineage', 'b'], 0));
    expect(() => randomAt('seed', [], 0)).toThrow('stable path');
    expect(() => randomAt('seed', ['lineage', 'a'], -1)).toThrow('counter');
  });
});
