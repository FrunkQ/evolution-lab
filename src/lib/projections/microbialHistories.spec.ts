import { describe, expect, it } from 'vitest';
import { createMicrobialShadowEvaluation } from '../analysis';
import {
  projectMicrobialHistories,
  projectProductiveFluxHistory,
  projectResourceHistory,
  projectStressHistory
} from './microbialHistories';

describe('microbial history projections', () => {
  const bundle = createMicrobialShadowEvaluation('history-family');

  it('offers four deterministic views over the same paired histories', () => {
    const first = projectMicrobialHistories(bundle.run, bundle.comparisonRun);
    const second = projectMicrobialHistories(bundle.run, bundle.comparisonRun);

    expect(first.map((projection) => projection.selectorLabel)).toEqual([
      'Living mass',
      'New living mass',
      'Community strain',
      'Resources'
    ]);
    expect(first).toEqual(second);
    expect(first.every((projection) => projection.markers.some((marker) => marker.kind === 'fork'))).toBe(true);
  });

  it('calculates productive flow from positive stored productivity only', () => {
    const projection = projectProductiveFluxHistory(bundle.run, bundle.comparisonRun);
    const first = bundle.run.snapshots[0];
    const expected = first.populations
      .filter((population) => population.active)
      .reduce((sum, population) => sum + Math.max(0, population.productivity), 0);

    expect(projection.series[0].samples[0]).toEqual({ tick: first.tick, value: expected });
    expect(projection.unit).toBe('experimental biomass units/day');
  });

  it('keeps the stress view absolute because percent-of-peak would mislead', () => {
    expect(projectStressHistory(bundle.run, bundle.comparisonRun).relativeMode).toBeNull();
  });

  it('projects real resource stocks and only adds control light as the declared input comparison', () => {
    const projection = projectResourceHistory(bundle.run, bundle.comparisonRun);
    expect(projection.series.map((series) => series.id)).toEqual([
      'resource/light',
      'resource/carbon',
      'resource/minerals',
      'resource/oxygen',
      'resource/detritus',
      'resource/control-light'
    ]);
    expect(projection.explanation.join(' ')).toMatch(/not physically interchangeable/i);
  });
});