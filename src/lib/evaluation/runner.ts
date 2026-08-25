import { stableChecksum } from '../core';
import type {
  CompiledEvaluationProfile,
  EvaluationGateObservation,
  EvaluationGateReport,
  EvaluationProfileDefinition
} from './types';

function duplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });
}

export function compileEvaluationProfile(
  definition: EvaluationProfileDefinition
): CompiledEvaluationProfile {
  const issues: string[] = [];
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(definition.id)) issues.push('Profile id must be stable and namespaced.');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(definition.version)) issues.push('Profile version must be semantic.');

  for (const [label, ids] of [
    ['threshold', definition.thresholds.map(({ id }) => id)],
    ['gate', definition.gates.map(({ id }) => id)],
    ['metric', definition.metricIds],
    ['question', definition.questionIds],
    ['limitation', definition.limitationIds]
  ] as const) {
    const duplicates = duplicateIds(ids);
    if (duplicates.length) issues.push('Duplicate ' + label + ' ids: ' + [...new Set(duplicates)].join(', ') + '.');
  }

  for (const threshold of definition.thresholds) {
    if (!Number.isFinite(threshold.value)) issues.push('Threshold ' + threshold.id + ' must be finite.');
    if (!threshold.unit.trim()) issues.push('Threshold ' + threshold.id + ' must declare a unit.');
  }

  for (const gate of definition.gates) {
    if (!gate.version.trim()) issues.push('Gate ' + gate.id + ' must declare a version.');
  }

  if (issues.length) throw new Error('Invalid evaluation profile:\n' + issues.join('\n'));
  return {
    ...definition,
    thresholds: definition.thresholds.map((threshold) => ({ ...threshold })),
    gates: definition.gates.map((gate) => ({ ...gate })),
    metricIds: [...definition.metricIds],
    questionIds: [...definition.questionIds],
    limitationIds: [...definition.limitationIds],
    hash: stableChecksum('evaluation-profile/v1', definition)
  };
}

export function thresholdValue(profile: CompiledEvaluationProfile, id: string): number {
  const threshold = profile.thresholds.find((candidate) => candidate.id === id);
  if (!threshold) throw new Error('Evaluation profile ' + profile.id + ' has no threshold ' + id + '.');
  return threshold.value;
}

export function runEvaluationGates(
  profile: CompiledEvaluationProfile,
  observations: readonly EvaluationGateObservation[]
): EvaluationGateReport {
  const observationIds = observations.map(({ gateId }) => gateId);
  const duplicates = duplicateIds(observationIds);
  if (duplicates.length) throw new Error('Duplicate gate observations: ' + [...new Set(duplicates)].join(', ') + '.');

  const definitions = new Map(profile.gates.map((gate) => [gate.id, gate]));
  for (const observation of observations) {
    if (!definitions.has(observation.gateId)) {
      throw new Error('Gate observation ' + observation.gateId + ' is not declared by ' + profile.id + '.');
    }
  }

  const byId = new Map(observations.map((observation) => [observation.gateId, observation]));
  const results = profile.gates.map((gate) => {
    if (gate.availability === 'unavailable') return { ...gate, status: 'not-checked' as const };
    const observation = byId.get(gate.id);
    if (!observation) {
      return {
        ...gate,
        status: 'fail' as const,
        evidence: 'The implemented gate did not emit an observation.'
      };
    }
    return {
      ...gate,
      status: observation.passed ? 'pass' as const : 'fail' as const,
      ...(observation.evidence ? { evidence: observation.evidence } : {})
    };
  });

  const failed = results.filter(({ status }) => status === 'fail').length;
  return {
    valid: failed === 0,
    passed: results.filter(({ status }) => status === 'pass').length,
    failed,
    unavailable: results.filter(({ status }) => status === 'not-checked').length,
    results
  };
}