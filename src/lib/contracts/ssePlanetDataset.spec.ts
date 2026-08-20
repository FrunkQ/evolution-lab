import { describe, expect, it } from 'vitest';
import fixtureJson from './fixtures/sse-beta-spectral-v1.json';
import {
  SSE_PLANET_DATASET_SCHEMA,
  SSE_SPECTRAL_FRAME_SCHEMA,
  compileSsePlanetDataset,
  irradianceAt,
  peakWavelength,
  spectralBinCount,
  validateSsePlanetDataset,
  wavelengthAtIndex
} from './ssePlanetDataset';
import type { SsePlanetDataset } from './ssePlanetDataset';

const fixture = fixtureJson as unknown as SsePlanetDataset;

describe('seeded SSE beta planet dataset', () => {
  it('validates the pinned reference fixture', () => {
    expect(validateSsePlanetDataset(fixture)).toEqual([]);
    expect(fixture.fixtureSchema).toBe(SSE_PLANET_DATASET_SCHEMA);
    expect(fixture.payload.grid.id).toBe(SSE_SPECTRAL_FRAME_SCHEMA);
    expect(fixture.payloadSha256).toBe(
      '21d238b793da3d941ba58a2dec1c5ca4c89c6c6832dc8faf0043bd7a1a80dfa9'
    );
    expect(fixture.source.commit).toBe('61da68ed4dd1f78f1cfb858d8b00514d704d6020');
  });

  it('reproduces the reference payload hash', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(fixture.payload));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    expect(hash).toBe(fixture.payloadSha256);
  });
  it('compiles immutable frames behind stable IDs and a master seed', () => {
    const compiled = compileSsePlanetDataset(fixture);
    expect(compiled.masterSeed).toBe('sse-beta-spectral-compatibility-v1');
    expect(compiled.seedPath).toEqual(['planet-fixture', 'sse-beta', 'spectral-v1']);
    expect(compiled.framesById.size).toBe(3);
    expect(compiled.frame('g-star-earthlike-surface').bodyId).toBe('fixture-earthlike');
    expect(Object.isFrozen(compiled.frame('g-star-earthlike-surface').irradianceWm2Nm)).toBe(true);
    expect(() => compiled.frame('missing-frame')).toThrow('Unknown SSE fixture frame');
  });

  it('preserves the real spectral differences emitted by SSE beta', () => {
    const compiled = compileSsePlanetDataset(fixture);
    const gStar = compiled.frame('g-star-earthlike-surface');
    const mStar = compiled.frame('m-star-earthlike-surface');
    const thickCo2 = compiled.frame('g-star-thick-co2-surface');
    expect(peakWavelength(mStar, compiled.grid)).toBeGreaterThan(
      peakWavelength(gStar, compiled.grid)
    );
    expect(irradianceAt(thickCo2, compiled.grid, 450)).toBeLessThan(
      irradianceAt(gStar, compiled.grid, 450)
    );
    expect(irradianceAt(mStar, compiled.grid, 1000)).toBeGreaterThan(
      irradianceAt(mStar, compiled.grid, 450)
    );
  });

  it('defines the grid once and rejects malformed frame data', () => {
    expect(spectralBinCount(fixture.payload.grid)).toBe(113);
    expect(wavelengthAtIndex(fixture.payload.grid, 0)).toBe(280);
    expect(wavelengthAtIndex(fixture.payload.grid, 112)).toBe(1400);
    expect(() =>
      irradianceAt(fixture.payload.frames[0], fixture.payload.grid, 455)
    ).toThrow('not on');

    const malformed = structuredClone(fixture);
    malformed.payload.frames[1].id = malformed.payload.frames[0].id;
    malformed.payload.frames[2].irradianceWm2Nm =
      malformed.payload.frames[2].irradianceWm2Nm.slice(1);
    const issues = validateSsePlanetDataset(malformed);
    expect(issues.some((issue) => issue.message.includes('Duplicate frame ID'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('Expected 113 spectral bins'))).toBe(true);
  });
});
