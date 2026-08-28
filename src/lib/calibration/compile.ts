import { stableChecksum } from '../core';
import type {
  CompiledTuningSpec,
  TuningCandidateDefinition,
  TuningCandidateRecord,
  TuningSpecDefinition
} from './types';

const STABLE_ID = /^[a-z0-9][a-z0-9/-]*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function duplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  return [...new Set(ids.filter((id) => seen.has(id) || !seen.add(id)))];
}

function artifactIsComplete(artifact: { id: string; version: string; hash: string }): boolean {
  return STABLE_ID.test(artifact.id) && SEMVER.test(artifact.version) && Boolean(artifact.hash.trim());
}

export function createBaselineTuningValues(
  spec: Pick<CompiledTuningSpec, 'parameters'>
): Record<string, number> {
  return Object.fromEntries(spec.parameters.map(({ id, baseline }) => [id, baseline]));
}

export function compileTuningSpec(definition: TuningSpecDefinition): CompiledTuningSpec {
  const issues: string[] = [];
  if (!STABLE_ID.test(definition.id)) issues.push('Tuning spec id must be stable and namespaced.');
  if (!SEMVER.test(definition.version)) issues.push('Tuning spec version must be semantic.');
  if (!definition.title.trim() || !definition.purpose.trim()) issues.push('Tuning spec requires a title and purpose.');
  if (!artifactIsComplete(definition.baseArtifact)) issues.push('Base artifact identity must be complete.');
  if (!artifactIsComplete(definition.evaluationProfile)) issues.push('Evaluation profile identity must be complete.');
  if (!definition.parameters.length) issues.push('Tuning spec requires at least one parameter.');
  if (!definition.objectives.length) issues.push('Tuning spec requires at least one fitness objective.');
  if (!definition.hardGateIds.length) issues.push('Tuning spec requires at least one hard gate.');

  for (const [label, ids] of [
    ['parameter', definition.parameters.map(({ id }) => id)],
    ['objective', definition.objectives.map(({ id }) => id)],
    ['hard gate', definition.hardGateIds],
    ['suite', definition.suites.map(({ id }) => id)]
  ] as const) {
    const duplicates = duplicateIds(ids);
    if (duplicates.length) issues.push(`Duplicate ${label} ids: ${duplicates.join(', ')}.`);
  }

  for (const parameter of definition.parameters) {
    if (!STABLE_ID.test(parameter.id)) issues.push(`Parameter ${parameter.id || '(missing id)'} must have a stable id.`);
    if (!parameter.label.trim() || !parameter.description.trim() || !parameter.unit.trim()) issues.push(`Parameter ${parameter.id} must declare readable semantics and units.`);
    if (![parameter.baseline, parameter.minimum, parameter.maximum, parameter.step].every(Number.isFinite)) issues.push(`Parameter ${parameter.id} values must be finite.`);
    if (parameter.minimum > parameter.baseline || parameter.baseline > parameter.maximum) issues.push(`Parameter ${parameter.id} baseline must lie inside its bounds.`);
    if (parameter.step <= 0) issues.push(`Parameter ${parameter.id} step must be positive.`);
    if (parameter.authority === 'conditionally-learnable' && !parameter.condition?.trim()) issues.push(`Conditionally learnable parameter ${parameter.id} must declare its condition.`);
  }
  for (const objective of definition.objectives) {
    if (!STABLE_ID.test(objective.id) || !objective.label.trim() || !objective.description.trim() || !objective.unit.trim()) issues.push(`Objective ${objective.id || '(missing id)'} must declare stable identity, semantics and units.`);
  }
  for (const gateId of definition.hardGateIds) if (!STABLE_ID.test(gateId)) issues.push(`Hard gate ${gateId} must have a stable id.`);

  const suitesById = new Map(definition.suites.map((suite) => [suite.id, suite]));
  for (const required of ['smoke', 'calibration', 'held-out', 'release'] as const) {
    if (!suitesById.has(required)) issues.push(`Tuning spec requires a ${required} suite.`);
  }
  for (const suite of definition.suites) {
    if (!suite.label.trim() || !suite.purpose.trim() || !suite.seeds.length || suite.seeds.some((seed) => !seed.trim())) issues.push(`Suite ${suite.id} requires readable semantics and named seeds.`);
    const duplicateSeeds = duplicateIds(suite.seeds);
    if (duplicateSeeds.length) issues.push(`Suite ${suite.id} has duplicate seeds: ${duplicateSeeds.join(', ')}.`);
  }
  const calibrationSeeds = new Set(suitesById.get('calibration')?.seeds ?? []);
  const leakedSeeds = (suitesById.get('held-out')?.seeds ?? []).filter((seed) => calibrationSeeds.has(seed));
  if (leakedSeeds.length) issues.push(`Calibration and held-out suites overlap: ${leakedSeeds.join(', ')}.`);

  if (issues.length) throw new Error(`Invalid tuning spec:\n${issues.join('\n')}`);
  const snapshot = JSON.parse(JSON.stringify(definition)) as TuningSpecDefinition;
  snapshot.parameters = [...snapshot.parameters].sort((left, right) => left.id.localeCompare(right.id));
  snapshot.objectives = [...snapshot.objectives].sort((left, right) => left.id.localeCompare(right.id));
  return {
    ...snapshot,
    hash: stableChecksum('tuning-spec/v1', snapshot)
  };
}

export function compileTuningCandidate(
  spec: CompiledTuningSpec,
  definition: TuningCandidateDefinition
): TuningCandidateRecord {
  const issues: string[] = [];
  if (!STABLE_ID.test(definition.id)) issues.push('Candidate id must be stable and namespaced.');
  if (!SEMVER.test(definition.version)) issues.push('Candidate version must be semantic.');
  if (definition.spec.id !== spec.id || definition.spec.version !== spec.version || definition.spec.hash !== spec.hash) issues.push('Candidate must pin the exact tuning spec.');
  if (!definition.generator.id.trim() || !definition.generator.version.trim()) issues.push('Candidate generator identity must be complete.');
  if (!definition.hypothesis.trim()) issues.push('Candidate requires a testable hypothesis.');
  const duplicateChanges = duplicateIds(definition.changes.map(({ parameterId }) => parameterId));
  if (duplicateChanges.length) issues.push(`Duplicate candidate parameter changes: ${duplicateChanges.join(', ')}.`);

  const parameters = new Map(spec.parameters.map((parameter) => [parameter.id, parameter]));
  for (const change of definition.changes) {
    const parameter = parameters.get(change.parameterId);
    if (!parameter) {
      issues.push(`Candidate changes undeclared parameter ${change.parameterId}.`);
      continue;
    }
    if (parameter.authority === 'frozen') issues.push(`Candidate cannot change frozen parameter ${change.parameterId}.`);
    if (change.unit !== parameter.unit) issues.push(`Candidate unit for ${change.parameterId} must be ${parameter.unit}.`);
    if (!Number.isFinite(change.value) || change.value < parameter.minimum || change.value > parameter.maximum) issues.push(`Candidate value for ${change.parameterId} must be finite and between ${parameter.minimum} and ${parameter.maximum}.`);
  }
  if (issues.length) throw new Error(`Invalid tuning candidate:\n${issues.join('\n')}`);

  const snapshot = JSON.parse(JSON.stringify(definition)) as TuningCandidateDefinition;
  snapshot.changes = [...snapshot.changes].sort((left, right) => left.parameterId.localeCompare(right.parameterId));
  const changes = new Map(snapshot.changes.map((change) => [change.parameterId, change.value]));
  const resolvedValues = Object.fromEntries(spec.parameters.map((parameter) => [parameter.id, changes.get(parameter.id) ?? parameter.baseline]));
  return {
    ...snapshot,
    resolvedValues,
    hash: stableChecksum('tuning-candidate/v1', { ...snapshot, resolvedValues })
  };
}
