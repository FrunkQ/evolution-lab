import { stableChecksum } from '../core';

export type QualificationCheckKind =
  | 'identity'
  | 'input'
  | 'replay'
  | 'checkpoint'
  | 'fork'
  | 'evaluation'
  | 'coverage';

export interface QualificationArtifact {
  id: string;
  version: string;
  hash: string;
}

export interface QualificationCheck {
  id: string;
  kind: QualificationCheckKind;
  label: string;
  passed: boolean;
  evidence: string;
}

export interface ExperimentQualificationDefinition {
  id: string;
  version: string;
  experiment: { id: string; version: string; manifestHash: string };
  seeds: readonly string[];
  artifacts: readonly QualificationArtifact[];
  checks: readonly QualificationCheck[];
  claimLevel: string;
  limitations: readonly string[];
}

export interface ExperimentQualificationReport extends ExperimentQualificationDefinition {
  valid: boolean;
  passed: number;
  failed: number;
  hash: string;
}

export interface ExperimentQualificationSummary {
  id: string;
  version: string;
  hash: string;
  experimentId: string;
  valid: boolean;
  passed: number;
  failed: number;
  seedCount: number;
  claimLevel: string;
  limitations: readonly string[];
  workload?: {
    budgetHash: string;
    storedSnapshots: number;
    peakProcessedNodes: number;
    processedNodeTicks: number;
    historyCharacters: number;
    limitsPassed: number;
    limitsTotal: number;
  };
}

const STABLE_ID = /^[a-z0-9][a-z0-9/-]*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function duplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });
}

export function compileExperimentQualification(
  definition: ExperimentQualificationDefinition
): ExperimentQualificationReport {
  const issues: string[] = [];
  if (!STABLE_ID.test(definition.id)) issues.push('Qualification id must be stable and namespaced.');
  if (!SEMVER.test(definition.version)) issues.push('Qualification version must be semantic.');
  if (!STABLE_ID.test(definition.experiment.id) || !SEMVER.test(definition.experiment.version) || !definition.experiment.manifestHash.trim()) {
    issues.push('Qualification experiment identity must be complete.');
  }
  if (!definition.seeds.length || definition.seeds.some((seed) => !seed.trim())) issues.push('Qualification requires at least one named seed.');
  if (!definition.checks.length) issues.push('Qualification requires at least one check.');

  for (const [label, ids] of [
    ['artifact', definition.artifacts.map(({ id }) => id)],
    ['check', definition.checks.map(({ id }) => id)]
  ] as const) {
    const duplicates = duplicateIds(ids);
    if (duplicates.length) issues.push(`Duplicate ${label} ids: ${[...new Set(duplicates)].join(', ')}.`);
  }
  for (const artifact of definition.artifacts) {
    if (!STABLE_ID.test(artifact.id) || !artifact.version.trim() || !artifact.hash.trim()) issues.push(`Artifact ${artifact.id || '(missing id)'} must have complete identity and hash.`);
  }
  for (const check of definition.checks) {
    if (!STABLE_ID.test(check.id) || !check.label.trim() || !check.evidence.trim()) issues.push(`Check ${check.id || '(missing id)'} must have stable identity, label and evidence.`);
  }
  if (!definition.claimLevel.trim()) issues.push('Qualification claim level is required.');

  if (issues.length) throw new Error(`Invalid experiment qualification:\n${issues.join('\n')}`);
  const snapshot = JSON.parse(JSON.stringify(definition)) as ExperimentQualificationDefinition;
  const passed = snapshot.checks.filter((check) => check.passed).length;
  const failed = snapshot.checks.length - passed;
  return {
    ...snapshot,
    valid: failed === 0,
    passed,
    failed,
    hash: stableChecksum('experiment-qualification/v1', snapshot)
  };
}