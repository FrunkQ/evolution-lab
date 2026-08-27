import { createSimulationCheckpoint, forkSimulation, simulate, validateAccountingFrames, validateSimulationCheckpoint, DEFAULT_CONFIG } from '../core';
import type { ResourceKey, SimulationCheckpoint, SimulationConfig, SimulationRun, WorldSnapshot } from '../core';
import { runEvaluationGates } from '../evaluation';
import type { EvaluationGateResult } from '../evaluation';
import { MICROBIAL_SHADOW_PROFILE, microbialThreshold } from './microbialProfile';

export type EvaluationTone = 'good' | 'caution' | 'problem';
export type EvaluationCheck = EvaluationGateResult;
export interface EvaluationQuestion { id: 'survival' | 'recovery' | 'change' | 'fragility' | 'function'; question: string; answer: string; detail: string; tone: EvaluationTone; }
export interface LineageOutcome { lineageId: string; label: string; withShadow: number; withoutShadow: number; differencePercent: number | null; stillPresent: boolean; }
export interface ComparisonExplanationStep { id: string; tick: number; label: string; summary: string; evidence: string; }
export interface PairedBiomassMetrics {
  lowestRetentionPercent: number; lowestRetentionTick: number; recoveryTick: number | null; recoveryDaysAfterLightReturns: number | null;
  averageBiomassLossPercent: number; integratedBiomassLoss: number; endDifferencePercent: number; postReturnVolatilityPercent: number;
  peakStressPercent: number; peakStressTick: number; lowestProductiveFluxRetentionPercent: number;
  lineagesStillPresent: number; comparedLineages: number; retainedFunctionPercent: number;
  retainedFunctions: readonly string[]; lostFunctions: readonly string[];
}
export interface PairedBiomassEvaluation {
  id: string; version: string; profile: { id: string; version: string; hash: string };
  status: 'recovered' | 'survived' | 'collapsed' | 'invalid'; headline: string; summary: string; claimLevel: string;
  comparison: { kind: 'checkpoint-control-shadow'; seed: string; parentCheckpointHash: string; checkpointTick: number; changedInput: string; unchangedBasis: readonly string[]; startTick: number; endTick: number; recoveryThresholdPercent: number; recoverySustainDays: number; };
  metrics: PairedBiomassMetrics; questions: readonly EvaluationQuestion[]; checks: readonly EvaluationCheck[];
  lineages: readonly LineageOutcome[]; explanation: readonly ComparisonExplanationStep[];
  factIds: readonly string[]; limitationIds: readonly string[]; limitations: readonly string[];
}
export interface MicrobialShadowEvaluationBundle { run: SimulationRun; comparisonRun: SimulationRun; checkpoint: SimulationCheckpoint; evaluation: PairedBiomassEvaluation; }

const RECOVERY_THRESHOLD = microbialThreshold('recovery-retention');
const RECOVERY_SUSTAIN_DAYS = microbialThreshold('recovery-sustain-days');
const SURVIVAL_THRESHOLD = microbialThreshold('survival-retention');
const RUNAWAY_WINDOW_DAYS = microbialThreshold('runaway-window-days');
const RUNAWAY_GROWTH_FACTOR = microbialThreshold('runaway-growth-factor');
const RUNAWAY_DAILY_GROWTH = microbialThreshold('runaway-daily-growth');
const DIFFERENCE_EPSILON = microbialThreshold('stored-difference-epsilon');

const round = (value: number, digits = 1) => { const scale = 10 ** digits; return Math.round(value * scale) / scale; };
export const totalActiveBiomass = (snapshot: WorldSnapshot) => snapshot.populations.filter((p) => p.active).reduce((sum, p) => sum + p.biomass, 0);
export const productiveBiomassFlux = (snapshot: WorldSnapshot) => snapshot.populations.filter((p) => p.active).reduce((sum, p) => sum + Math.max(0, p.productivity), 0);
export function biomassWeightedStress(snapshot: WorldSnapshot): number {
  const active = snapshot.populations.filter((p) => p.active), total = active.reduce((sum, p) => sum + p.biomass, 0);
  return total <= 0 ? 0 : active.reduce((sum, p) => sum + p.stress * p.biomass, 0) / total;
}
const runNumbers = (run: SimulationRun) => run.snapshots.flatMap((s) => [
  ...Object.values(s.resources),
  ...Object.values(s.signatures),
  ...s.populations.flatMap((p) => [p.biomass, p.productivity, p.stress]),
  ...s.flows.map((f) => f.amount),
  s.accounting.openingMinorUnits,
  s.accounting.importedMinorUnits,
  s.accounting.exportedMinorUnits,
  s.accounting.closingMinorUnits,
  s.accounting.residualMinorUnits,
  s.accounting.transactionResidualMinorUnits,
  s.accounting.adjustmentDebtMinorUnits,
  ...s.accounting.transactions.flatMap((transaction) => [
    transaction.boundaryDeltaMinorUnits,
    transaction.residualMinorUnits,
    transaction.adjustmentDebtMinorUnits,
    ...transaction.postings.map((posting) => posting.deltaMinorUnits)
  ])
]);
const hasNegativeStock = (run: SimulationRun) => run.snapshots.some((s) => Object.values(s.resources).some((v) => v < 0) || Object.values(s.signatures).some((v) => v < 0) || s.populations.some((p) => p.biomass < 0) || s.flows.some((f) => f.amount < 0));
function hasRunaway(run: SimulationRun, start: number): boolean {
  const window = run.snapshots.filter((s) => s.tick >= start).map(totalActiveBiomass).slice(-RUNAWAY_WINDOW_DAYS);
  if (window.length < RUNAWAY_WINDOW_DAYS || window[0] <= 0) return false;
  return window.at(-1)! > window[0] * RUNAWAY_GROWTH_FACTOR &&
    window.slice(1).every((value, index) => (value - window[index]) / window[index] > RUNAWAY_DAILY_GROWTH);
}
function deviation(values: readonly number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}
const configDifferences = (a: SimulationConfig, b: SimulationConfig) => (Object.keys(a) as (keyof SimulationConfig)[]).filter((key) => a[key] !== b[key]);
function functionsAtEnd(run: SimulationRun): Map<string, string> {
  const active = new Set(run.snapshots.at(-1)!.populations.filter((population) => population.active && population.biomass > 0).map((population) => population.lineageId));
  return new Map(run.lineages.filter((lineage) => active.has(lineage.id)).flatMap((lineage) => lineage.capabilities.map((capability) => [capability.id, capability.label] as const)));
}
const prefixMatches = (checkpoint: SimulationCheckpoint, run: SimulationRun) =>
  run.fork?.parentCheckpointHash === checkpoint.hash &&
  JSON.stringify(run.snapshots.filter((snapshot) => snapshot.tick <= checkpoint.tick)) === JSON.stringify(checkpoint.snapshots) &&
  JSON.stringify(run.events.filter((event) => event.tick <= checkpoint.tick)) === JSON.stringify(checkpoint.events);
function firstResourceDifference(shadow: SimulationRun, control: SimulationRun, start: number) {
  for (const snapshot of shadow.snapshots) {
    if (snapshot.tick < start) continue;
    const other = control.snapshots[snapshot.tick];
    if (!other) continue;
    for (const key of Object.keys(snapshot.resources) as ResourceKey[]) {
      if (Math.abs(snapshot.resources[key] - other.resources[key]) > DIFFERENCE_EPSILON) return { tick: snapshot.tick, key, shadow: snapshot.resources[key], control: other.resources[key] };
    }
  }
}
function firstPopulationDifference(shadow: SimulationRun, control: SimulationRun, start: number) {
  for (const snapshot of shadow.snapshots) {
    if (snapshot.tick < start) continue;
    const other = control.snapshots[snapshot.tick];
    if (!other) continue;
    for (const population of snapshot.populations) {
      const comparison = other.populations.find((candidate) => candidate.lineageId === population.lineageId);
      if (comparison && Math.abs(population.productivity - comparison.productivity) > DIFFERENCE_EPSILON) {
        return { tick: snapshot.tick, label: shadow.lineages.find((lineage) => lineage.id === population.lineageId)?.shortName ?? population.lineageId, shadow: population.productivity, control: comparison.productivity };
      }
    }
  }
}

export const withoutLongShadow = (config: SimulationConfig = DEFAULT_CONFIG): SimulationConfig => ({
  ...config,
  shadowStartsAt: config.duration + 1,
  shadowEndsAt: config.duration + 1,
  shadowLightFraction: 1
});

export function evaluateCheckpointFork(checkpoint: SimulationCheckpoint, shadow: SimulationRun, control: SimulationRun, repeat: SimulationRun, uninterrupted: SimulationRun): PairedBiomassEvaluation {
  if ([control, repeat, uninterrupted].some((run) => run.seed !== shadow.seed) || checkpoint.seed !== shadow.seed) throw new Error('Checkpoint evaluation requires the same master seed.');
  if (shadow.snapshots.length !== control.snapshots.length) throw new Error('Checkpoint evaluation requires aligned same-time snapshots.');
  const start = shadow.fork?.appliedAt ?? shadow.config.shadowStartsAt, end = shadow.config.shadowEndsAt;
  const pairs = shadow.snapshots.map((snapshot, index) => {
    const comparison = control.snapshots[index];
    if (!comparison || comparison.tick !== snapshot.tick) throw new Error(`Missing same-time comparison snapshot for day ${snapshot.tick}.`);
    const observed = totalActiveBiomass(snapshot), baseline = totalActiveBiomass(comparison), baselineFlux = productiveBiomassFlux(comparison);
    return { tick: snapshot.tick, observed, baseline, retention: baseline > 0 ? observed / baseline : 1, fluxRetention: baselineFlux > 0 ? productiveBiomassFlux(snapshot) / baselineFlux : 1 };
  }).filter((pair) => pair.tick >= start);
  const lowest = pairs.reduce((left, right) => right.retention < left.retention ? right : left);
  const lowestFlux = pairs.reduce((left, right) => right.fluxRetention < left.fluxRetention ? right : left);
  const recoveryStart = end + 1;
  let recoveryTick: number | null = null;
  for (let index = 0; index < pairs.length; index += 1) {
    if (pairs[index].tick < recoveryStart) continue;
    const window = pairs.slice(index, index + RECOVERY_SUSTAIN_DAYS);
    if (window.length === RECOVERY_SUSTAIN_DAYS && window.every((pair) => pair.retention >= RECOVERY_THRESHOLD)) {
      recoveryTick = pairs[index].tick;
      break;
    }
  }
  const integratedLoss = pairs.reduce((sum, pair) => sum + Math.max(0, pair.baseline - pair.observed), 0);
  const averageLoss = pairs.reduce((sum, pair) => sum + Math.max(0, 1 - pair.retention), 0) / Math.max(1, pairs.length);
  const final = pairs.at(-1)!, shadowEnd = shadow.snapshots.at(-1)!, controlEnd = control.snapshots.at(-1)!;
  const lineages: LineageOutcome[] = shadow.lineages.map((lineage) => {
    const observed = shadowEnd.populations.find((population) => population.lineageId === lineage.id);
    const baseline = controlEnd.populations.find((population) => population.lineageId === lineage.id);
    return { lineageId: lineage.id, label: lineage.shortName, withShadow: observed?.biomass ?? 0, withoutShadow: baseline?.biomass ?? 0, differencePercent: baseline && baseline.biomass > 0 ? round(((observed?.biomass ?? 0) / baseline.biomass - 1) * 100) : null, stillPresent: Boolean(observed?.active && observed.biomass > 0) };
  });
  const stresses = shadow.snapshots.filter((snapshot) => snapshot.tick >= start).map((snapshot) => ({ tick: snapshot.tick, stress: biomassWeightedStress(snapshot) }));
  const peakStress = stresses.reduce((left, right) => right.stress > left.stress ? right : left);
  const shadowFunctions = functionsAtEnd(shadow), controlFunctions = functionsAtEnd(control);
  const retained = [...controlFunctions].filter(([id]) => shadowFunctions.has(id)).map(([, label]) => label).sort();
  const lost = [...controlFunctions].filter(([id]) => !shadowFunctions.has(id)).map(([, label]) => label).sort();
  const retainedPercent = controlFunctions.size ? retained.length / controlFunctions.size * 100 : 100;
  const differences = configDifferences(shadow.config, control.config);
  const allowedDifferences: (keyof SimulationConfig)[] = ['shadowStartsAt', 'shadowEndsAt', 'shadowLightFraction'];
  const forkIntegrity = prefixMatches(checkpoint, shadow) && prefixMatches(checkpoint, control) && shadow.fork?.role === 'shadow' && control.fork?.role === 'control' && shadow.fork.appliedAt === checkpoint.tick + 1 && control.fork.appliedAt === checkpoint.tick + 1;
  const branchIsolation = shadow.manifest.environmentProvider === control.manifest.environmentProvider &&
    differences.length === allowedDifferences.length && allowedDifferences.every((key) => differences.includes(key));

  const shadowAccounting = validateAccountingFrames(shadow.snapshots.map(({ accounting }) => accounting));
  const controlAccounting = validateAccountingFrames(control.snapshots.map(({ accounting }) => accounting));
  const gateReport = runEvaluationGates(MICROBIAL_SHADOW_PROFILE, [
    { gateId: 'checkpoint-integrity', passed: validateSimulationCheckpoint(checkpoint), evidence: checkpoint.hash },
    { gateId: 'fork-prefix', passed: forkIntegrity },
    { gateId: 'branch-isolation', passed: branchIsolation, evidence: differences.join(', ') },
    { gateId: 'resume-equivalence', passed: JSON.stringify(shadow.snapshots) === JSON.stringify(uninterrupted.snapshots) && JSON.stringify(shadow.events) === JSON.stringify(uninterrupted.events) },
    { gateId: 'finite-state', passed: [...runNumbers(shadow), ...runNumbers(control)].every(Number.isFinite) },
    { gateId: 'non-negative-stocks', passed: !hasNegativeStock(shadow) && !hasNegativeStock(control) },
    { gateId: 'repeatability', passed: JSON.stringify(shadow) === JSON.stringify(repeat) },
    { gateId: 'unsupported-growth', passed: !hasRunaway(shadow, start) && !hasRunaway(control, start) },
    {
      gateId: 'matter-balance',
      passed: shadowAccounting.balanced && controlAccounting.balanced,
      evidence: `Maximum residual: ${Math.max(shadowAccounting.maximumResidualMinorUnits, controlAccounting.maximumResidualMinorUnits)} minor units; ledger structure: ${shadowAccounting.structuralIntegrity && controlAccounting.structuralIntegrity ? 'pass' : 'fail'}; interval continuity: ${shadowAccounting.continuity && controlAccounting.continuity ? 'pass' : 'fail'}.`
    },
    {
      gateId: 'accounting-debt',
      passed: shadowAccounting.debtFree && controlAccounting.debtFree,
      evidence: `Total adjustment debt: ${shadowAccounting.totalAdjustmentDebtMinorUnits + controlAccounting.totalAdjustmentDebtMinorUnits} centi-units.`
    }
  ]);
  const invalid = !gateReport.valid, survived = lowest.retention >= SURVIVAL_THRESHOLD, recovered = recoveryTick !== null;
  const status: PairedBiomassEvaluation['status'] = invalid ? 'invalid' : !survived ? 'collapsed' : recovered ? 'recovered' : 'survived';
  const low = round(lowest.retention * 100), avgLoss = round(averageLoss * 100), endDiff = round((final.retention - 1) * 100);
  const present = lineages.filter((lineage) => lineage.stillPresent).length, recoveryDays = recoveryTick === null ? null : recoveryTick - recoveryStart;
  const volatility = round(deviation(pairs.filter((pair) => pair.tick >= recoveryStart).map((pair) => pair.retention)) * 100);
  const headline = status === 'recovered' ? 'The community bends, then rebuilds.' : status === 'survived' ? 'The community survives, but does not return close to its control.' : status === 'collapsed' ? 'The long shadow pushes the community past the survival floor.' : 'This comparison failed a hard validity gate.';
  const questions: EvaluationQuestion[] = [
    { id: 'survival', question: 'Did it survive?', answer: survived ? `Yes - ${present} of ${lineages.length} represented populations remain present.` : 'Not by this prototype threshold.', detail: `At its lowest point, active biomass was ${low}% of same-time control.`, tone: survived ? 'good' : 'problem' },
    { id: 'recovery', question: 'Did it recover?', answer: recovered ? `Yes - it stayed within ${round((1 - RECOVERY_THRESHOLD) * 100)}% of control from day ${recoveryTick}.` : 'Not within the stored window.', detail: recovered ? `${recoveryDays} day${recoveryDays === 1 ? '' : 's'} after full light returned.` : `Requires ${RECOVERY_SUSTAIN_DAYS} consecutive days at ${round(RECOVERY_THRESHOLD * 100)}% of control.`, tone: recovered ? 'good' : 'caution' },
    { id: 'change', question: 'How much was lost?', answer: `${round(integratedLoss)} biomass-days were absent versus control.`, detail: `Average proportional loss: ${avgLoss}%. End difference: ${Math.abs(endDiff)}% ${endDiff < 0 ? 'below' : 'above'} control.`, tone: avgLoss < 20 ? 'good' : 'caution' },
    { id: 'fragility', question: 'How unstable was it?', answer: `Post-return deviation varied by ${volatility}% around its average.`, detail: `Stress peaked at ${round(peakStress.stress * 100)}% on day ${peakStress.tick}; productive flow fell to ${round(lowestFlux.fluxRetention * 100)}% of control.`, tone: peakStress.stress < 0.4 ? 'good' : peakStress.stress < 0.7 ? 'caution' : 'problem' },
    { id: 'function', question: 'What still worked?', answer: `${retained.length} of ${controlFunctions.size} represented capabilities were retained.`, detail: lost.length ? `Lost from active guilds: ${lost.join(', ')}.` : 'No authored capability disappeared from active guilds.', tone: retainedPercent === 100 ? 'good' : retainedPercent >= 70 ? 'caution' : 'problem' }
  ];
  const resource = firstResourceDifference(shadow, control, start), population = firstPopulationDifference(shadow, control, start);
  const explanation: ComparisonExplanationStep[] = [
    { id: 'fork', tick: start, label: 'The futures separate', summary: 'Both histories resume from one verified checkpoint; only usable light changes.', evidence: `Parent ${checkpoint.hash}; shadow activates on day ${start}.` },
    ...(resource ? [{ id: 'first-resource', tick: resource.tick, label: `First resource difference: ${resource.key}`, summary: `Shadow stores ${resource.shadow}; control stores ${resource.control}.`, evidence: `Earliest resource-ledger difference above ${DIFFERENCE_EPSILON} stored units.` }] : []),
    ...(population ? [{ id: 'first-population', tick: population.tick, label: `First population response: ${population.label}`, summary: `Net productivity is ${population.shadow} with shadow and ${population.control} in control.`, evidence: `Earliest productivity difference above ${DIFFERENCE_EPSILON} biomass units per day.` }] : []),
    { id: 'bottleneck', tick: lowest.tick, label: 'Deepest aggregate bottleneck', summary: `Living mass reaches ${low}% of same-time control.`, evidence: `Productive flow reaches ${round(lowestFlux.fluxRetention * 100)}% of control.` },
    { id: 'outcome', tick: recoveryTick ?? final.tick, label: recovered ? 'Aggregate recovery is sustained' : 'Stored window ends without recovery', summary: recovered ? `At least ${round(RECOVERY_THRESHOLD * 100)}% of control for ${RECOVERY_SUSTAIN_DAYS} days.` : 'The sustained-recovery threshold is not reached.', evidence: `${retained.length} of ${controlFunctions.size} represented capabilities remain active.` }
  ];
  return {
    id: 'biology/microbial-long-shadow-evaluation', version: '0.4.0',
    profile: { id: MICROBIAL_SHADOW_PROFILE.id, version: MICROBIAL_SHADOW_PROFILE.version, hash: MICROBIAL_SHADOW_PROFILE.hash },
    status, headline,
    summary: 'Control and long-shadow futures resume from one content-hashed checkpoint and are compared on the same simulated day.',
    claimLevel: 'Conceptual population-aggregate prototype: mechanisms and causal direction, not calibrated rates or exact ecology.',
    comparison: { kind: 'checkpoint-control-shadow', seed: shadow.seed, parentCheckpointHash: checkpoint.hash, checkpointTick: checkpoint.tick, changedInput: `Scripted usable light falls to ${round(shadow.config.shadowLightFraction * 100)}% from day ${start} through day ${end}.`, unchangedBasis: ['Content-hashed history and exact state through the checkpoint', 'Master seed, engine, scenario and provider versions', 'Initial resources, authored lineages and nutrient pulse', 'Seasonal light outside the shadow window'], startTick: start, endTick: end, recoveryThresholdPercent: round(RECOVERY_THRESHOLD * 100), recoverySustainDays: RECOVERY_SUSTAIN_DAYS },
    metrics: { lowestRetentionPercent: low, lowestRetentionTick: lowest.tick, recoveryTick, recoveryDaysAfterLightReturns: recoveryDays, averageBiomassLossPercent: avgLoss, integratedBiomassLoss: round(integratedLoss), endDifferencePercent: endDiff, postReturnVolatilityPercent: volatility, peakStressPercent: round(peakStress.stress * 100), peakStressTick: peakStress.tick, lowestProductiveFluxRetentionPercent: round(lowestFlux.fluxRetention * 100), lineagesStillPresent: present, comparedLineages: lineages.length, retainedFunctionPercent: round(retainedPercent), retainedFunctions: retained, lostFunctions: lost },
    questions, checks: gateReport.results, lineages, explanation,
    factIds: ['checkpoint/parent-hash', ...MICROBIAL_SHADOW_PROFILE.metricIds.map((id) => `metric/${id}`), ...MICROBIAL_SHADOW_PROFILE.gates.filter(({ availability }) => availability === 'implemented').map(({ id }) => `check/${id}`)],
    limitationIds: MICROBIAL_SHADOW_PROFILE.limitationIds.map((id) => `limit/${id}`),
    limitations: ['Material closes only in declared model-mass centi-units; this is not calibrated SI chemistry.', 'Useful-energy conversion and dissipation are not yet a complete energy ledger.', 'The four lineages and capabilities are predefined rather than produced by open-ended evolution.', 'The scripted provider supplies explicit boundary inputs but does not prove System Lab physical conservation.']
  };
}

export function createMicrobialShadowEvaluation(seed: string, config: SimulationConfig = DEFAULT_CONFIG): MicrobialShadowEvaluationBundle {
  const uninterrupted = simulate(seed, config);
  const controlConfig = withoutLongShadow(config);
  const parentRun = simulate(seed, controlConfig);
  const checkpoint = createSimulationCheckpoint(parentRun, config.shadowStartsAt - 1);
  const shadowDefinition = { id: 'environment/long-shadow', version: '0.2.0', role: 'shadow' as const, appliedAt: checkpoint.tick + 1, description: `Reduce usable light to ${round(config.shadowLightFraction * 100)}% during the shadow window.`, config };
  const run = forkSimulation(checkpoint, shadowDefinition);
  const comparisonRun = forkSimulation(checkpoint, { id: 'control/no-long-shadow', version: '0.2.0', role: 'control', appliedAt: checkpoint.tick + 1, description: 'Continue seasonal light without the shadow.', config: controlConfig });
  const repeat = forkSimulation(checkpoint, shadowDefinition);
  return { run, comparisonRun, checkpoint, evaluation: evaluateCheckpointFork(checkpoint, run, comparisonRun, repeat, uninterrupted) };
}
