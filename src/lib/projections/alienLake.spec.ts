import { describe, expect, it } from 'vitest';
import { ALIEN_LAKE_WRAP_AT, createAlienLakeExperiment } from '../analysis';
import { projectAlienLake } from './alienLake';

describe('Alien Lake presentation projection', () => {
  it('is deterministic and clamps the inspected day without changing the run', () => {
    const experiment = createAlienLakeExperiment();
    const before = experiment.run.runHash;
    const first = projectAlienLake(experiment, 9_999, 'lake/sediment-refuge');
    const second = projectAlienLake(experiment, 9_999, 'lake/sediment-refuge');
    expect(first).toEqual(second);
    expect(first.tick).toBe(first.duration);
    expect(experiment.run.runHash).toBe(before);
  });

  it('keeps the selected habitat, spectrum and response data explicit', () => {
    const view = projectAlienLake(createAlienLakeExperiment(), 72, 'lake/mixed-water');
    expect(view.selectedPatch.id).toBe('lake/mixed-water');
    expect(view.spectrumSeries[0].id).toBe('field/lake/mixed-water');
    expect(view.spectrumSeries.some(({ id }) => id.includes('amber-daughter'))).toBe(true);
    expect(view.spectrumSeries.every(({ points }) => points.length > 5)).toBe(true);
  });

  it('projects closed matter and the exact wrapper state honestly', () => {
    const view = projectAlienLake(createAlienLakeExperiment(), ALIEN_LAKE_WRAP_AT);
    expect(view.resolution).toBe('exact-wrapper');
    expect(view.accounting.residualMinorUnits).toBe(0);
    expect(view.accounting.adjustmentDebtMinorUnits).toBe(0);
    expect(view.totals.material).toBe(1296);
    expect(view.scaleProof.exactResume).toBe(true);
    expect(view.scaleProof.limitations.join(' ')).toContain('not yet a compute-saving');
  });
});
