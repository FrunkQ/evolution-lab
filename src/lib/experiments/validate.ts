import { stableChecksum } from '../core';
import type { EvolutionExperiment } from './types';

export function computeExperimentManifestHash(experiment: EvolutionExperiment): string {
  const { manifestHash: _manifestHash, ...content } = experiment;
  return stableChecksum('experiment-manifest/v1', content);
}

export function validateExperiment(experiment: EvolutionExperiment): readonly string[] {
  const issues: string[] = [];
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(experiment.id)) issues.push('Experiment id must be stable and namespaced.');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(experiment.version)) issues.push('Experiment version must be semantic.');
  if (experiment.status === 'reference') {
    if (!experiment.checkpoints.length) issues.push('Reference experiments require expected checkpoints.');
    if (experiment.checkpoints.some((checkpoint) => !checkpoint.expectedHash)) {
      issues.push('Every reference checkpoint requires an expected content hash.');
    }
    if (!experiment.manifestHash) issues.push('Reference experiments require a manifest hash.');
    else if (computeExperimentManifestHash(experiment) !== experiment.manifestHash) {
      issues.push('Experiment manifest hash does not match its canonical content.');
    }
  }
  return issues;
}

export function validateExperimentCatalogue(experiments: readonly EvolutionExperiment[]): readonly string[] {
  const ids = new Set<string>();
  return experiments.flatMap((experiment) => {
    const issues = validateExperiment(experiment).map((issue) => experiment.id + ': ' + issue);
    if (ids.has(experiment.id)) issues.push(experiment.id + ': Duplicate experiment id.');
    ids.add(experiment.id);
    return issues;
  });
}