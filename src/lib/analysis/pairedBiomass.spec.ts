import { describe, expect, it } from 'vitest';
import { createSimulationCheckpoint, forkSimulation, simulate } from '../core';
import {
  createMicrobialShadowEvaluation,
  evaluateCheckpointFork,
  withoutLongShadow
} from './pairedBiomass';

describe('checkpoint shadow evaluation', () => {
  it('forks one verified prefix and remains deterministic', () => {
    const first = createMicrobialShadowEvaluation('checkpoint-analysis');
    const second = createMicrobialShadowEvaluation('checkpoint-analysis');
    expect(first).toEqual(second);
    expect(first.evaluation.comparison.kind).toBe('checkpoint-control-shadow');
    expect(first.run.fork?.parentCheckpointHash).toBe(first.checkpoint.hash);
    expect(first.comparisonRun.fork?.parentCheckpointHash).toBe(first.checkpoint.hash);
    expect(first.run.snapshots.slice(0, first.checkpoint.tick + 1)).toEqual(
      first.comparisonRun.snapshots.slice(0, first.checkpoint.tick + 1)
    );
    expect(first.evaluation.checks.filter((check) => check.status === 'fail')).toEqual([]);
  });

  it('removes only the post-checkpoint shadow input from control', () => {
    const bundle = createMicrobialShadowEvaluation('comparison-input');
    expect(bundle.comparisonRun.config).toEqual(withoutLongShadow(bundle.run.config));
    expect(bundle.comparisonRun.events.some((event) => event.id === 'long-shadow')).toBe(false);
    expect(bundle.run.manifest.environmentProvider).toBe(bundle.comparisonRun.manifest.environmentProvider);
    expect(bundle.run.fork?.role).toBe('shadow');
    expect(bundle.comparisonRun.fork?.role).toBe('control');
  });

  it('fails hard when a stored stock is negative', () => {
    const bundle = createMicrobialShadowEvaluation('invalid-analysis');
    bundle.run.snapshots[250].resources.carbon = -1;
    const evaluation = evaluateCheckpointFork(
      bundle.checkpoint,
      bundle.run,
      bundle.comparisonRun,
      bundle.run,
      simulate('invalid-analysis')
    );
    expect(evaluation.status).toBe('invalid');
    expect(evaluation.checks.find((check) => check.id === 'non-negative-stocks')?.status).toBe('fail');
  });

  it('reports the richer resilience vector and unavailable accounting checks honestly', () => {
    const evaluation = createMicrobialShadowEvaluation('metrics').evaluation;
    expect(evaluation.metrics.integratedBiomassLoss).toBeGreaterThanOrEqual(0);
    expect(evaluation.metrics.postReturnVolatilityPercent).toBeGreaterThanOrEqual(0);
    expect(evaluation.metrics.peakStressPercent).toBeGreaterThanOrEqual(0);
    expect(evaluation.metrics.retainedFunctions.length).toBeGreaterThan(0);
    expect(evaluation.explanation.map((step) => step.id)).toEqual(
      expect.arrayContaining(['fork', 'first-resource', 'first-population', 'bottleneck', 'outcome'])
    );
    expect(evaluation.checks.filter((check) => check.status === 'not-checked').map((check) => check.id)).toEqual([
      'matter-balance',
      'accounting-debt'
    ]);
  });

  it('rejects a fork with an unrelated seed or corrupted checkpoint', () => {
    const run = simulate('one-seed');
    const checkpoint = createSimulationCheckpoint(run, run.config.shadowStartsAt - 1);
    const control = forkSimulation(checkpoint, {
      id: 'control/no-shadow',
      version: '0.1.0',
      role: 'control',
      appliedAt: checkpoint.tick + 1,
      description: 'Control',
      config: withoutLongShadow(run.config)
    });
    expect(() =>
      evaluateCheckpointFork(checkpoint, run, control, run, simulate('another-seed'))
    ).toThrow(/same master seed/);
    checkpoint.snapshots[0].resources.carbon += 1;
    expect(() =>
      forkSimulation(checkpoint, {
        id: 'control/tampered',
        version: '0.1.0',
        role: 'control',
        appliedAt: checkpoint.tick + 1,
        description: 'Tampered',
        config: withoutLongShadow(run.config)
      })
    ).toThrow(/content hash/);
  });
});
