import { DEFAULT_CONFIG, simulate } from '../core';
import type { SimulationConfig, SimulationRun, WorldSnapshot } from '../core';

export type EvaluationStatus = 'pass' | 'fail' | 'not-checked';
export type EvaluationTone = 'good' | 'caution' | 'problem';

export interface EvaluationCheck { id: string; question: string; status: EvaluationStatus; summary: string; }
export interface EvaluationQuestion { id: 'survival' | 'recovery' | 'change' | 'fragility'; question: string; answer: string; detail: string; tone: EvaluationTone; }
export interface LineageOutcome { lineageId: string; label: string; withShadow: number; withoutShadow: number; differencePercent: number | null; stillPresent: boolean; }
export interface PairedBiomassMetrics { lowestRetentionPercent: number; lowestRetentionTick: number; recoveryTick: number | null; recoveryDaysAfterLightReturns: number | null; averageBiomassLossPercent: number; endDifferencePercent: number; lineagesStillPresent: number; comparedLineages: number; }
export interface PairedBiomassEvaluation {
  id: string;
  version: string;
  status: 'recovered' | 'survived' | 'collapsed' | 'invalid';
  headline: string;
  summary: string;
  claimLevel: string;
  comparison: { kind: 'paired-deterministic-rerun'; seed: string; changedInput: string; unchangedBasis: readonly string[]; startTick: number; endTick: number; recoveryThresholdPercent: number; recoverySustainDays: number; };
  metrics: PairedBiomassMetrics;
  questions: readonly EvaluationQuestion[];
  checks: readonly EvaluationCheck[];
  lineages: readonly LineageOutcome[];
  factIds: readonly string[];
  limitationIds: readonly string[];
  limitations: readonly string[];
}
export interface MicrobialShadowEvaluationBundle { run: SimulationRun; comparisonRun: SimulationRun; evaluation: PairedBiomassEvaluation; }

const RECOVERY_THRESHOLD = 0.9;
const RECOVERY_SUSTAIN_DAYS = 14;
const SURVIVAL_THRESHOLD = 0.1;
const round = (value: number, digits = 1) => { const scale = 10 ** digits; return Math.round(value * scale) / scale; };

function totalActiveBiomass(snapshot: WorldSnapshot): number {
  return snapshot.populations.filter((population) => population.active).reduce((sum, population) => sum + population.biomass, 0);
}

function runNumbers(run: SimulationRun): number[] {
  return run.snapshots.flatMap((snapshot) => [
    ...Object.values(snapshot.resources),
    ...Object.values(snapshot.signatures),
    ...snapshot.populations.flatMap((population) => [population.biomass, population.productivity, population.stress]),
    ...snapshot.flows.map((flow) => flow.amount)
  ]);
}

function hasNegativeStock(run: SimulationRun): boolean {
  return run.snapshots.some((snapshot) =>
    Object.values(snapshot.resources).some((value) => value < 0) ||
    Object.values(snapshot.signatures).some((value) => value < 0) ||
    snapshot.populations.some((population) => population.biomass < 0) ||
    snapshot.flows.some((flow) => flow.amount < 0)
  );
}

export function withoutLongShadow(config: SimulationConfig = DEFAULT_CONFIG): SimulationConfig {
  return { ...config, shadowStartsAt: config.duration + 1, shadowEndsAt: config.duration + 1 };
}

export function evaluatePairedBiomassRuns(withShadow: SimulationRun, withoutShadow: SimulationRun, repeatedWithShadow: SimulationRun): PairedBiomassEvaluation {
  if (withShadow.seed !== withoutShadow.seed || withShadow.seed !== repeatedWithShadow.seed) throw new Error('Paired biomass evaluation requires the same master seed.');
  if (withShadow.snapshots.length !== withoutShadow.snapshots.length) throw new Error('Paired biomass evaluation requires aligned same-time snapshots.');

  const startTick = withShadow.config.shadowStartsAt;
  const endTick = withShadow.config.shadowEndsAt;
  const pairs = withShadow.snapshots.map((snapshot, index) => {
    const comparison = withoutShadow.snapshots[index];
    if (!comparison || comparison.tick !== snapshot.tick) throw new Error(`Missing same-time comparison snapshot for day ${snapshot.tick}.`);
    const observed = totalActiveBiomass(snapshot);
    const control = totalActiveBiomass(comparison);
    return { tick: snapshot.tick, observed, control, retention: control > 0 ? observed / control : 1 };
  }).filter((pair) => pair.tick >= startTick);

  const lowest = pairs.reduce((current, pair) => pair.retention < current.retention ? pair : current);
  const recoveryStart = endTick + 1;
  let recoveryTick: number | null = null;
  for (let index = 0; index < pairs.length; index += 1) {
    const candidate = pairs[index];
    if (candidate.tick < recoveryStart) continue;
    const sustained = pairs.slice(index, index + RECOVERY_SUSTAIN_DAYS);
    if (sustained.length === RECOVERY_SUSTAIN_DAYS && sustained.every((pair) => pair.retention >= RECOVERY_THRESHOLD)) { recoveryTick = candidate.tick; break; }
  }

  const averageLoss = pairs.reduce((sum, pair) => sum + Math.max(0, 1 - pair.retention), 0) / Math.max(1, pairs.length);
  const finalPair = pairs.at(-1)!;
  const endWithShadow = withShadow.snapshots.at(-1)!;
  const endWithoutShadow = withoutShadow.snapshots.at(-1)!;
  const lineages: LineageOutcome[] = withShadow.lineages.map((lineage) => {
    const observed = endWithShadow.populations.find((population) => population.lineageId === lineage.id);
    const control = endWithoutShadow.populations.find((population) => population.lineageId === lineage.id);
    return {
      lineageId: lineage.id,
      label: lineage.shortName,
      withShadow: observed?.biomass ?? 0,
      withoutShadow: control?.biomass ?? 0,
      differencePercent: control && control.biomass > 0 ? round(((observed?.biomass ?? 0) / control.biomass - 1) * 100) : null,
      stillPresent: Boolean(observed?.active && observed.biomass > 0)
    };
  });

  const checks: EvaluationCheck[] = [
    { id: 'finite-state', question: 'Did every stored number remain usable?', status: [...runNumbers(withShadow), ...runNumbers(withoutShadow)].every(Number.isFinite) ? 'pass' : 'fail', summary: 'All stored resources, populations, flows and signatures must remain finite.' },
    { id: 'non-negative-stocks', question: 'Did any stored stock go below zero?', status: hasNegativeStock(withShadow) || hasNegativeStock(withoutShadow) ? 'fail' : 'pass', summary: 'Resource stocks, biomass, signatures and recorded flow amounts are checked.' },
    { id: 'repeatability', question: 'Did the same seeded run repeat exactly?', status: JSON.stringify(withShadow) === JSON.stringify(repeatedWithShadow) ? 'pass' : 'fail', summary: 'The complete stored run is compared with an immediate same-seed repeat.' },
    { id: 'matter-balance', question: 'Can we account for all matter across the boundary?', status: 'not-checked', summary: 'The prototype does not yet store a complete unit-aware conservation ledger.' },
    { id: 'growth-and-debt', question: 'Can we rule out hidden accounting debt or artificial clamping?', status: 'not-checked', summary: 'Prototype bounds exist, but a general divergence and accounting-debt check is not implemented.' }
  ];

  const invalid = checks.some((check) => check.status === 'fail');
  const survived = lowest.retention >= SURVIVAL_THRESHOLD;
  const recovered = recoveryTick !== null;
  const status: PairedBiomassEvaluation['status'] = invalid ? 'invalid' : !survived ? 'collapsed' : recovered ? 'recovered' : 'survived';
  const lowestPercent = round(lowest.retention * 100);
  const averageLossPercent = round(averageLoss * 100);
  const endDifferencePercent = round((finalPair.retention - 1) * 100);
  const presentCount = lineages.filter((lineage) => lineage.stillPresent).length;
  const recoveryDays = recoveryTick === null ? null : recoveryTick - recoveryStart;
  const headline = status === 'recovered' ? 'The community bends, then rebuilds.' : status === 'survived' ? 'The community survives, but does not return close to its comparison run.' : status === 'collapsed' ? 'The long shadow pushes the community past the authored survival floor.' : 'This comparison failed a basic run check.';

  const questions: EvaluationQuestion[] = [
    { id: 'survival', question: 'Did it survive?', answer: survived ? `Yes - ${presentCount} of ${lineages.length} represented populations remain present.` : 'Not by this prototype threshold.', detail: `At its lowest point, total active biomass was ${lowestPercent}% of the same-time run without the long shadow.`, tone: survived ? 'good' : 'problem' },
    { id: 'recovery', question: 'Did it recover?', answer: recovered ? `Yes - it stayed within 10% of the comparison from day ${recoveryTick}.` : 'Not within the stored time window.', detail: recovered ? `That is ${recoveryDays} day${recoveryDays === 1 ? '' : 's'} after full scripted light returned.` : `Recovery requires ${RECOVERY_SUSTAIN_DAYS} consecutive days at 90% or more of the same-time comparison.`, tone: recovered ? 'good' : 'caution' },
    { id: 'change', question: 'How much changed?', answer: `The shadowed run averaged ${averageLossPercent}% less total biomass after the disruption began.`, detail: `By day ${finalPair.tick}, it was ${Math.abs(endDifferencePercent)}% ${endDifferencePercent < 0 ? 'below' : 'above'} the no-shadow comparison.`, tone: averageLossPercent < 20 ? 'good' : 'caution' },
    { id: 'fragility', question: 'How fragile was it?', answer: lowestPercent >= 75 ? 'It retained most of its aggregate biomass.' : lowestPercent >= 40 ? 'It was strongly disrupted but retained a substantial living base.' : 'It approached the prototype collapse range.', detail: 'This is a comparison inside the toy model, not a calibrated ecological resilience score.', tone: lowestPercent >= 75 ? 'good' : lowestPercent >= 40 ? 'caution' : 'problem' }
  ];

  return {
    id: 'biology/microbial-long-shadow-evaluation', version: '0.1.0', status, headline,
    summary: 'The ordinary run is compared day-for-day with the same seeded setup in which the scripted long shadow is removed.',
    claimLevel: 'Conceptual, population-aggregate prototype: mechanisms and causal direction are the claim, not calibrated rates or exact ecology.',
    comparison: { kind: 'paired-deterministic-rerun', seed: withShadow.seed, changedInput: `Scripted light falls to 30% from day ${startTick} through day ${endTick}.`, unchangedBasis: ['Master seed', 'Engine, scenario and provider versions', 'Initial resources and authored lineages', 'Nutrient pulse and seasonal light outside the shadow'], startTick, endTick, recoveryThresholdPercent: RECOVERY_THRESHOLD * 100, recoverySustainDays: RECOVERY_SUSTAIN_DAYS },
    metrics: { lowestRetentionPercent: lowestPercent, lowestRetentionTick: lowest.tick, recoveryTick, recoveryDaysAfterLightReturns: recoveryDays, averageBiomassLossPercent: averageLossPercent, endDifferencePercent, lineagesStillPresent: presentCount, comparedLineages: lineages.length },
    questions, checks, lineages,
    factIds: ['metric/lowest-retention', 'metric/recovery-time', 'metric/integrated-biomass-loss', 'metric/end-difference', 'metric/lineage-presence', 'check/finite-state', 'check/non-negative-stocks', 'check/repeatability'],
    limitationIds: ['limit/not-checkpoint-fork', 'limit/no-conservation-ledger', 'limit/no-calibrated-units', 'limit/predefined-lineages'],
    limitations: ['These are paired full reruns from the same seed, not branches resumed from a shared checkpoint.', 'Aggregate biomass uses experimental units; complete matter and energy conservation are not yet testable.', 'The four lineages are predefined and retained above prototype floors rather than produced by open-ended evolution.', 'The scripted provider removes light; it does not resolve planetary physics.']
  };
}

export function createMicrobialShadowEvaluation(seed: string): MicrobialShadowEvaluationBundle {
  const run = simulate(seed);
  const comparisonRun = simulate(seed, withoutLongShadow(run.config));
  const repeatedRun = simulate(seed);
  return { run, comparisonRun, evaluation: evaluatePairedBiomassRuns(run, comparisonRun, repeatedRun) };
}
