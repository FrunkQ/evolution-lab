import { describe, expect, it } from 'vitest';
import {
  createSimulationCheckpoint,
  DEFAULT_CONFIG,
  MICROBIAL_RUNTIME_PARAMETER_IDS,
  simulate
} from '../core';
import { recordTuningModelAttempt } from '../calibration';
import { DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE, exobiologyFixtureToSimulationConfig } from '../contracts';
import { EXPERIMENTS } from '../experiments';
import {
  assessMicrobialTuningCandidate,
  createMicrobialTuningCandidate,
  evaluateMicrobialTuningCandidate,
  MICROBIAL_BASELINE_CANDIDATE,
  MICROBIAL_TUNING_SPEC,
  microbialConfigForCandidate
} from './microbialTuning';

describe('microbial candidate tuning adapter', () => {
  it('leaves the promoted default history and checkpoint hashes unchanged without a candidate', () => {
    const experiment = EXPERIMENTS[0];
    const run = simulate(
      experiment.masterSeed,
      exobiologyFixtureToSimulationConfig(DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE, DEFAULT_CONFIG)
    );
    expect(run.config.runtimeParameters).toBeUndefined();
    expect(experiment.checkpoints.map(({ tick }) => createSimulationCheckpoint(run, tick).hash)).toEqual(
      experiment.checkpoints.map(({ expectedHash }) => expectedHash)
    );
  });

  it('keeps calibration and held-out seeds separate', () => {
    const calibration = MICROBIAL_TUNING_SPEC.suites.find(({ id }) => id === 'calibration')!;
    const heldOut = MICROBIAL_TUNING_SPEC.suites.find(({ id }) => id === 'held-out')!;
    expect(calibration.seeds.some((seed) => heldOut.seeds.includes(seed))).toBe(false);
  });

  it('evaluates the baseline deterministically with all hard gates before the vector', () => {
    const first = evaluateMicrobialTuningCandidate(MICROBIAL_BASELINE_CANDIDATE, 'smoke');
    const second = evaluateMicrobialTuningCandidate(MICROBIAL_BASELINE_CANDIDATE, 'smoke');
    expect(first).toEqual(second);
    expect(first.valid).toBe(true);
    expect(first.gates).toHaveLength(10);
    expect(first.gates.every(({ passed }) => passed)).toBe(true);
    expect(first.fitnessVector.map(({ id }) => id)).toEqual([
      'history-characters',
      'integrated-biomass-loss',
      'peak-stress',
      'post-return-volatility',
      'productive-flux-retention',
      'retained-functions'
    ]);
  });

  it('pins a valid candidate into runtime identity and changes only candidate histories', () => {
    const candidate = createMicrobialTuningCandidate([
      {
        parameterId: MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverGrowthRate,
        value: 0.06,
        unit: 'ratio/day'
      }
    ], 'Faster bounded producer growth may retain more productive flow.');
    const config = microbialConfigForCandidate(candidate);
    expect(config.runtimeParameters?.candidateHash).toBe(candidate.hash);
    expect(config.runtimeParameters?.values[MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverGrowthRate]).toBe(0.06);
    expect(simulate('candidate-change', config).snapshots).not.toEqual(simulate('candidate-change', DEFAULT_CONFIG).snapshots);
    const first = evaluateMicrobialTuningCandidate(candidate, 'smoke');
    expect(first).toEqual(evaluateMicrobialTuningCandidate(candidate, 'smoke'));
    expect(assessMicrobialTuningCandidate(candidate).candidate.hash).toBe(candidate.hash);
  }, 15_000);

  it('does not let candidates modify provider-authoritative light', () => {
    expect(() => createMicrobialTuningCandidate([
      { parameterId: 'provider/mean-usable-light', value: 20, unit: 'usable-light' }
    ], 'Change the environment instead of the mechanism.')).toThrow(/frozen/);
  });

  it('keeps timing and token observations out of canonical model-attempt evidence', () => {
    const endpoint = { providerId: 'lm-studio', endpointKind: 'local' as const, baseUrl: 'http://localhost:1234/v1', modelId: 'google/gemma-4-26b-a4b' };
    const common = { endpoint, promptHash: 'prompt', schemaValid: false, candidateAccepted: false, rejectionReason: 'Malformed JSON.' };
    const first = recordTuningModelAttempt({ ...common, elapsedMilliseconds: 10 });
    const second = recordTuningModelAttempt({ ...common, elapsedMilliseconds: 999 });
    expect(first.canonicalEvidenceHash).toBe(second.canonicalEvidenceHash);
    expect(first.elapsedMilliseconds).not.toBe(second.elapsedMilliseconds);
  });
});
