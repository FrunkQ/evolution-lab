import { describe, expect, it } from 'vitest';
import { simulate } from '../core';
import { createMicrobialShadowEvaluation, evaluatePairedBiomassRuns, withoutLongShadow } from './pairedBiomass';

describe('paired biomass evaluation', () => {
  it('compares aligned same-seed reruns and remains deterministic', () => {
    const first = createMicrobialShadowEvaluation('paired-analysis');
    const second = createMicrobialShadowEvaluation('paired-analysis');
    expect(first).toEqual(second);
    expect(first.evaluation.comparison.kind).toBe('paired-deterministic-rerun');
    expect(first.evaluation.metrics.lowestRetentionTick).toBeGreaterThanOrEqual(first.run.config.shadowStartsAt);
    expect(first.evaluation.metrics.lowestRetentionPercent).toBeGreaterThanOrEqual(0);
    expect(first.evaluation.checks.find((check) => check.id === 'repeatability')?.status).toBe('pass');
  });

  it('removes only the configured shadow window from the comparison input', () => {
    const ordinary = simulate('comparison-input');
    const comparisonConfig = withoutLongShadow(ordinary.config);
    const comparison = simulate('comparison-input', comparisonConfig);
    expect(comparisonConfig.nutrientPulseAt).toBe(ordinary.config.nutrientPulseAt);
    expect(comparisonConfig.duration).toBe(ordinary.config.duration);
    expect(comparison.events.some((event) => event.id === 'long-shadow')).toBe(false);
    expect(ordinary.manifest.scenarioId).toBe(comparison.manifest.scenarioId);
    expect(ordinary.manifest.environmentProvider).toBe(comparison.manifest.environmentProvider);
  });

  it('fails a hard check when a stored stock is negative', () => {
    const withShadow = simulate('invalid-analysis');
    const comparison = simulate('invalid-analysis', withoutLongShadow(withShadow.config));
    const repeated = simulate('invalid-analysis');
    withShadow.snapshots[250].resources.carbon = -1;
    const evaluation = evaluatePairedBiomassRuns(withShadow, comparison, repeated);
    expect(evaluation.status).toBe('invalid');
    expect(evaluation.checks.find((check) => check.id === 'non-negative-stocks')?.status).toBe('fail');
  });

  it('rejects unpaired seeds and exposes unavailable checks', () => {
    const run = simulate('one-seed');
    const comparison = simulate('one-seed', withoutLongShadow(run.config));
    expect(() => evaluatePairedBiomassRuns(run, comparison, simulate('another-seed'))).toThrow(/same master seed/);
    const evaluation = evaluatePairedBiomassRuns(run, comparison, simulate('one-seed'));
    expect(evaluation.checks.filter((check) => check.status === 'not-checked').map((check) => check.id)).toEqual(['matter-balance', 'growth-and-debt']);
  });
});
