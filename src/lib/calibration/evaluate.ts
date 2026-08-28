import { stableChecksum } from '../core';
import type {
  CandidateComparison,
  CandidateEvaluationRecord,
  CompiledTuningSpec,
  TuningCandidateRecord,
  TuningCaseResult,
  TuningMetricSummary,
  TuningSuiteId
} from './types';

export type TuningCaseEvaluator = (candidate: TuningCandidateRecord, seed: string) => TuningCaseResult;

const rounded = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

function summarize(values: readonly number[], direction: 'maximize' | 'minimize'): TuningMetricSummary {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const median = ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
  return {
    minimum: rounded(ordered[0]),
    median: rounded(median),
    mean: rounded(ordered.reduce((sum, value) => sum + value, 0) / ordered.length),
    maximum: rounded(ordered.at(-1)!),
    worst: rounded(direction === 'maximize' ? ordered[0] : ordered.at(-1)!)
  };
}

export function evaluateTuningCandidate(
  spec: CompiledTuningSpec,
  candidate: TuningCandidateRecord,
  suiteId: TuningSuiteId,
  evaluator: TuningCaseEvaluator
): CandidateEvaluationRecord {
  if (candidate.spec.id !== spec.id || candidate.spec.version !== spec.version || candidate.spec.hash !== spec.hash) throw new Error('Candidate evaluation requires an exact tuning-spec match.');
  const suite = spec.suites.find((item) => item.id === suiteId);
  if (!suite) throw new Error(`Tuning spec ${spec.id} has no ${suiteId} suite.`);
  const cases = suite.seeds.map((seed) => evaluator(candidate, seed));
  if (cases.some((item, index) => item.seed !== suite.seeds[index])) throw new Error('Tuning evaluator must return the requested seed identity.');

  for (const result of cases) {
    const gateIds = result.gates.map(({ id }) => id);
    const metricIds = result.metrics.map(({ id }) => id);
    if (new Set(gateIds).size !== gateIds.length || new Set(metricIds).size !== metricIds.length) throw new Error(`Tuning case ${result.seed} emitted duplicate observations.`);
    const missingGates = spec.hardGateIds.filter((id) => !gateIds.includes(id));
    const undeclaredGates = gateIds.filter((id) => !spec.hardGateIds.includes(id));
    const missingMetrics = spec.objectives.map(({ id }) => id).filter((id) => !metricIds.includes(id));
    const undeclaredMetrics = metricIds.filter((id) => !spec.objectives.some((objective) => objective.id === id));
    if (missingGates.length || undeclaredGates.length || missingMetrics.length || undeclaredMetrics.length) {
      throw new Error(`Tuning case ${result.seed} observation mismatch: missing gates [${missingGates}], undeclared gates [${undeclaredGates}], missing metrics [${missingMetrics}], undeclared metrics [${undeclaredMetrics}].`);
    }
    if (result.gates.some(({ evidence }) => !evidence.trim())) throw new Error(`Tuning case ${result.seed} gate evidence cannot be empty.`);
    if (result.metrics.some(({ value }) => !Number.isFinite(value))) throw new Error(`Tuning case ${result.seed} metrics must be finite.`);
  }

  const gates = spec.hardGateIds.map((id) => {
    const observations = cases.map((item) => ({ seed: item.seed, observation: item.gates.find((gate) => gate.id === id)! }));
    return {
      id,
      passed: observations.every(({ observation }) => observation.passed),
      failedSeeds: observations.filter(({ observation }) => !observation.passed).map(({ seed }) => seed),
      evidence: observations.map(({ seed, observation }) => ({ seed, detail: observation.evidence }))
    };
  });
  const fitnessVector = spec.objectives.map((objective) => {
    const values = cases.map((item) => ({ seed: item.seed, value: item.metrics.find((metric) => metric.id === objective.id)!.value }));
    return { ...objective, values, summary: summarize(values.map(({ value }) => value), objective.direction) };
  });
  const definition = {
    schemaVersion: 'evolution-candidate-evaluation/0.1' as const,
    id: `${spec.id}/${suite.id}`,
    version: '0.1.0',
    spec: { id: spec.id, version: spec.version, hash: spec.hash },
    candidate: { id: candidate.id, version: candidate.version, hash: candidate.hash },
    suite: { id: suite.id, label: suite.label, purpose: suite.purpose, visibility: suite.visibility, seeds: [...suite.seeds] },
    valid: gates.every(({ passed }) => passed),
    gates,
    fitnessVector,
    caseArtifactHashes: cases.map(({ seed, artifactHashes }) => ({ seed, hashes: [...artifactHashes] })),
    limitations: [...spec.limitations]
  };
  return { ...definition, hash: stableChecksum('candidate-evaluation/v1', definition) };
}

export function compareCandidateEvaluations(
  baseline: CandidateEvaluationRecord,
  candidate: CandidateEvaluationRecord
): CandidateComparison {
  if (baseline.spec.hash !== candidate.spec.hash || baseline.suite.id !== candidate.suite.id) throw new Error('Candidate comparison requires the same tuning spec and suite.');
  const deltas = baseline.fitnessVector.map((base) => {
    const next = candidate.fitnessVector.find(({ id }) => id === base.id);
    if (!next || next.direction !== base.direction || next.unit !== base.unit) throw new Error(`Candidate comparison is missing compatible objective ${base.id}.`);
    const delta = rounded(next.summary.mean - base.summary.mean);
    return {
      objectiveId: base.id,
      unit: base.unit,
      direction: base.direction,
      baselineMean: base.summary.mean,
      candidateMean: next.summary.mean,
      delta,
      preferred: base.direction === 'maximize' ? delta > 0 : delta < 0
    };
  });
  let relation: CandidateComparison['relation'];
  if (baseline.valid && !candidate.valid) relation = 'candidate-invalid';
  else if (!baseline.valid && candidate.valid) relation = 'candidate-restores-validity';
  else if (!baseline.valid && !candidate.valid) relation = 'candidate-invalid';
  else {
    const comparisons = deltas.map(({ direction, delta }) => direction === 'maximize' ? Math.sign(delta) : -Math.sign(delta));
    const anyBetter = comparisons.some((value) => value > 0);
    const anyWorse = comparisons.some((value) => value < 0);
    relation = anyBetter && !anyWorse ? 'candidate-dominates' : anyWorse && !anyBetter ? 'baseline-dominates' : anyBetter && anyWorse ? 'trade-off' : 'equivalent';
  }
  return { baselineHash: baseline.hash, candidateHash: candidate.hash, relation, deltas };
}
