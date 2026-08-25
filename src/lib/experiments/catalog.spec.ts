import { describe, expect, it } from 'vitest';
import { createSimulationCheckpoint, simulate } from '../core';
import { EXPERIMENTS } from './catalog';
import { computeExperimentManifestHash, validateExperiment, validateExperimentCatalogue } from './validate';

describe('experiment catalogue', () => {
  it('promotes the microbial flask only with reproducible inputs and checkpoint hashes', () => {
    const experiment = EXPERIMENTS[0];
    const run = simulate(experiment.masterSeed);

    expect(experiment.status).toBe('reference');
    expect(validateExperimentCatalogue(EXPERIMENTS)).toEqual([]);
    expect(computeExperimentManifestHash(experiment)).toBe(experiment.manifestHash);
    for (const checkpoint of experiment.checkpoints) {
      expect(createSimulationCheckpoint(run, checkpoint.tick).hash).toBe(checkpoint.expectedHash);
    }
  });

  it('rejects a silently changed reference experiment', () => {
    const experiment = {
      ...EXPERIMENTS[0],
      questions: [...EXPERIMENTS[0].questions, 'An unversioned new question']
    };
    expect(validateExperiment(experiment)).toContain(
      'Experiment manifest hash does not match its canonical content.'
    );
  });

  it('rejects a reference checkpoint without an expected hash', () => {
    const experiment = {
      ...EXPERIMENTS[0],
      manifestHash: undefined,
      checkpoints: [{ tick: 24, note: 'Missing hash.' }]
    };
    expect(validateExperiment(experiment)).toEqual(expect.arrayContaining([
      'Every reference checkpoint requires an expected content hash.',
      'Reference experiments require a manifest hash.'
    ]));
  });
});