import { stableChecksum } from '../core';

export interface WorkloadProfile {
  storedSnapshots: number;
  peakProcessedNodes: number;
  peakActiveNodes: number;
  processedNodeTicks: number;
  activeNodeTicks: number;
  flowRecords: number;
  eventRecords: number;
  historyCharacters: number;
}

export type WorkloadMetric = keyof WorkloadProfile;

export interface WorkloadLimit {
  metric: WorkloadMetric;
  label: string;
  maximum: number;
  unit: string;
  reason: string;
}

export interface WorkloadBudgetDefinition {
  id: string;
  version: string;
  title: string;
  limits: readonly WorkloadLimit[];
}

export interface CompiledWorkloadBudget extends WorkloadBudgetDefinition {
  hash: string;
}

export interface WorkloadLimitResult extends WorkloadLimit {
  actual: number;
  passed: boolean;
}

export interface WorkloadBudgetReport {
  valid: boolean;
  passed: number;
  failed: number;
  budget: { id: string; version: string; hash: string };
  profile: WorkloadProfile;
  results: readonly WorkloadLimitResult[];
}

export type DevicePerformanceRating = 'quick' | 'comfortable' | 'slow';

export interface DeviceBenchmarkTargets {
  referenceHistoryMaximumMs: number;
  responseFamilyMaximumMs: number;
}

export interface DeviceBenchmarkDefinition {
  id: string;
  version: string;
  title: string;
  quick: DeviceBenchmarkTargets;
  comfortable: DeviceBenchmarkTargets;
}

export interface CompiledDeviceBenchmark extends DeviceBenchmarkDefinition {
  hash: string;
}

export interface DeviceBenchmarkContext {
  engineVersion: string;
  runtimeLabel: string;
  timingSource: string;
  warmupRuns: number;
  workload: {
    budget: { id: string; version: string; hash: string };
    profile: WorkloadProfile;
  };
}

export interface DevicePerformanceObservation {
  benchmark: { id: string; version: string; hash: string };
  engineVersion: string;
  runtimeLabel: string;
  timingSource: string;
  warmupRuns: number;
  workload: DeviceBenchmarkContext['workload'];
  sampleCount: number;
  referenceHistoryMedianMs: number;
  responseFamilyMedianMs: number;
  referenceHistoriesPerSecond: number;
  rating: DevicePerformanceRating;
  ratingExplanation: string;
  populationCapacityEstimate: null;
  populationCapacityReason: string;
}

const STABLE_ID = /^[a-z0-9][a-z0-9/-]*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function validateWorkloadProfile(profile: WorkloadProfile): void {
  if (Object.values(profile).some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error('Workload profile values must be non-negative integers.');
  }
}

export function compileWorkloadBudget(
  definition: WorkloadBudgetDefinition
): CompiledWorkloadBudget {
  const issues: string[] = [];
  if (!STABLE_ID.test(definition.id)) issues.push('Workload budget id must be stable and namespaced.');
  if (!SEMVER.test(definition.version)) issues.push('Workload budget version must be semantic.');
  if (!definition.title.trim()) issues.push('Workload budget title is required.');
  if (!definition.limits.length) issues.push('Workload budget requires at least one limit.');
  const metrics = new Set<WorkloadMetric>();
  for (const limit of definition.limits) {
    if (metrics.has(limit.metric)) issues.push(`Duplicate workload limit: ${limit.metric}.`);
    metrics.add(limit.metric);
    if (!limit.label.trim() || !limit.unit.trim() || !limit.reason.trim()) {
      issues.push(`Workload limit ${limit.metric} requires label, unit and reason.`);
    }
    if (!Number.isFinite(limit.maximum) || limit.maximum <= 0) {
      issues.push(`Workload limit ${limit.metric} must be finite and positive.`);
    }
  }
  if (issues.length) throw new Error(`Invalid workload budget:\n${issues.join('\n')}`);
  const snapshot = JSON.parse(JSON.stringify(definition)) as WorkloadBudgetDefinition;
  return { ...snapshot, hash: stableChecksum('workload-budget/v1', snapshot) };
}

export function compileDeviceBenchmark(
  definition: DeviceBenchmarkDefinition
): CompiledDeviceBenchmark {
  const issues: string[] = [];
  if (!STABLE_ID.test(definition.id)) issues.push('Device benchmark id must be stable and namespaced.');
  if (!SEMVER.test(definition.version)) issues.push('Device benchmark version must be semantic.');
  if (!definition.title.trim()) issues.push('Device benchmark title is required.');
  for (const [label, targets] of [
    ['quick', definition.quick],
    ['comfortable', definition.comfortable]
  ] as const) {
    if (
      !Number.isFinite(targets.referenceHistoryMaximumMs) ||
      targets.referenceHistoryMaximumMs <= 0 ||
      !Number.isFinite(targets.responseFamilyMaximumMs) ||
      targets.responseFamilyMaximumMs <= 0
    ) {
      issues.push(`Device benchmark ${label} targets must be finite and positive.`);
    }
  }
  if (
    definition.comfortable.referenceHistoryMaximumMs < definition.quick.referenceHistoryMaximumMs ||
    definition.comfortable.responseFamilyMaximumMs < definition.quick.responseFamilyMaximumMs
  ) {
    issues.push('Comfortable targets cannot be stricter than quick targets.');
  }
  if (issues.length) throw new Error(`Invalid device benchmark:\n${issues.join('\n')}`);
  const snapshot = JSON.parse(JSON.stringify(definition)) as DeviceBenchmarkDefinition;
  return { ...snapshot, hash: stableChecksum('device-benchmark/v1', snapshot) };
}

export function evaluateWorkloadBudget(
  profile: WorkloadProfile,
  budget: CompiledWorkloadBudget
): WorkloadBudgetReport {
  validateWorkloadProfile(profile);
  const results = budget.limits.map((limit) => ({
    ...limit,
    actual: profile[limit.metric],
    passed: profile[limit.metric] <= limit.maximum
  }));
  const failed = results.filter(({ passed }) => !passed).length;
  return {
    valid: failed === 0,
    passed: results.length - failed,
    failed,
    budget: { id: budget.id, version: budget.version, hash: budget.hash },
    profile: { ...profile },
    results
  };
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function summarizeDevicePerformance(
  referenceHistorySamplesMs: readonly number[],
  responseFamilySamplesMs: readonly number[],
  benchmark: CompiledDeviceBenchmark,
  context: DeviceBenchmarkContext
): DevicePerformanceObservation {
  if (
    !referenceHistorySamplesMs.length ||
    referenceHistorySamplesMs.length !== responseFamilySamplesMs.length ||
    [...referenceHistorySamplesMs, ...responseFamilySamplesMs].some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new Error('Device performance requires equal, positive timing samples.');
  }
  if (
    !context.engineVersion.trim() ||
    !context.runtimeLabel.trim() ||
    !context.timingSource.trim() ||
    !Number.isInteger(context.warmupRuns) ||
    context.warmupRuns < 0 ||
    !STABLE_ID.test(context.workload.budget.id) ||
    !SEMVER.test(context.workload.budget.version) ||
    !context.workload.budget.hash.trim()
  ) {
    throw new Error('Device performance context must identify the engine, runtime, timing policy and workload budget.');
  }
  validateWorkloadProfile(context.workload.profile);
  const referenceHistoryMedianMs = median(referenceHistorySamplesMs);
  const responseFamilyMedianMs = median(responseFamilySamplesMs);
  const rating: DevicePerformanceRating =
    referenceHistoryMedianMs <= benchmark.quick.referenceHistoryMaximumMs &&
    responseFamilyMedianMs <= benchmark.quick.responseFamilyMaximumMs
      ? 'quick'
      : referenceHistoryMedianMs <= benchmark.comfortable.referenceHistoryMaximumMs &&
          responseFamilyMedianMs <= benchmark.comfortable.responseFamilyMaximumMs
        ? 'comfortable'
        : 'slow';
  return {
    benchmark: { id: benchmark.id, version: benchmark.version, hash: benchmark.hash },
    engineVersion: context.engineVersion,
    runtimeLabel: context.runtimeLabel,
    timingSource: context.timingSource,
    warmupRuns: context.warmupRuns,
    workload: {
      budget: { ...context.workload.budget },
      profile: { ...context.workload.profile }
    },
    sampleCount: referenceHistorySamplesMs.length,
    referenceHistoryMedianMs,
    responseFamilyMedianMs,
    referenceHistoriesPerSecond: 1000 / referenceHistoryMedianMs,
    rating,
    ratingExplanation:
      rating === 'quick'
        ? 'The reference history and nine-case comparison both complete within the quick-response target.'
        : rating === 'comfortable'
          ? 'The work is practical on this device, though the full comparison may be noticeable.'
          : 'This workload is slow on this device; reduce resolved work or move it off the main interaction path.',
    populationCapacityEstimate: null,
    populationCapacityReason:
      'Not estimated yet: this prototype processes four authored guilds rather than a scalable variable-node workload, so linear extrapolation would be misleading.'
  };
}
