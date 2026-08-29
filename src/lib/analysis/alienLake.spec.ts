import { describe, expect, it } from 'vitest';
import {
  ALIEN_LAKE_DEFAULT_SEED,
  ALIEN_LAKE_DURATION,
  ALIEN_LAKE_REEXPAND_AT,
  ALIEN_LAKE_WRAP_AT,
  createAlienLakeExperiment
} from './alienLake';

describe('Alien Lake integration experiment', () => {
  it('replays exactly with closed material accounting and no debt', () => {
    const first = createAlienLakeExperiment();
    const second = createAlienLakeExperiment();
    expect(first.run.runHash).toBe(second.run.runHash);
    expect(first.run.snapshots).toHaveLength(ALIEN_LAKE_DURATION + 1);
    expect(first.run.accounting).toMatchObject({ balanced: true, debtFree: true, continuity: true, structuralIntegrity: true });
    expect(first.run.snapshots.every(({ patches }) => patches.every(({ nutrientMinor, detritusMinor, populations }) => nutrientMinor >= 0 && detritusMinor >= 0 && populations.every(({ biomassMinor }) => biomassMinor >= 0)))).toBe(true);
  });

  it('changes energy access when the field or response changes', () => {
    const result = createAlienLakeExperiment();
    expect(result.spectrumCounterfactual.baselineAccessibleWm2).not.toBeCloseTo(result.spectrumCounterfactual.alternateAccessibleWm2, 8);
    expect(result.responseCounterfactual.firstAccessibleWm2).not.toBeCloseTo(result.responseCounterfactual.secondAccessibleWm2, 8);
  });

  it('creates bounded seeded variation without shifting other histories', () => {
    const first = createAlienLakeExperiment(ALIEN_LAKE_DEFAULT_SEED);
    const other = createAlienLakeExperiment('another-lake-seed');
    expect(Math.abs(first.run.daughterShiftNm)).toBe(30);
    expect(Math.abs(other.run.daughterShiftNm)).toBe(30);
    expect(first.run.events.find(({ kind }) => kind === 'variation')?.causes).toContain('named-draw/variation-0');
  });

  it('wraps one patch, re-expands on disturbance and matches the always-detailed control exactly', () => {
    const result = createAlienLakeExperiment();
    expect(result.run.snapshots[ALIEN_LAKE_WRAP_AT].resolution).toBe('exact-wrapper');
    expect(result.run.snapshots[ALIEN_LAKE_REEXPAND_AT].resolution).toBe('re-expanded');
    expect(result.scaleProof.exactResume).toBe(true);
    expect(result.scaleProof.finalWrappedHash).toBe(result.scaleProof.finalDetailedHash);
    expect(result.scaleProof.observableDistances.every(({ distance }) => distance === 0)).toBe(true);
    expect(result.scaleProof.limitations.join(' ')).toContain('not yet a compute-saving');
  });

  it('changes deterministic outcomes for a different provider spectrum', () => {
    const gStar = createAlienLakeExperiment(ALIEN_LAKE_DEFAULT_SEED, 'g-star-earthlike-surface');
    const mStar = createAlienLakeExperiment(ALIEN_LAKE_DEFAULT_SEED, 'm-star-earthlike-surface');
    expect(gStar.run.finalStateHash).not.toBe(mStar.run.finalStateHash);
    expect(gStar.run.providerReference).not.toBe(mStar.run.providerReference);
  });
});
