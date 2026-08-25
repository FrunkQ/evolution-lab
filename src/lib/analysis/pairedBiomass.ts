import { createSimulationCheckpoint, forkSimulation, simulate, validateSimulationCheckpoint, DEFAULT_CONFIG } from '../core';
import type { ResourceKey, SimulationCheckpoint, SimulationConfig, SimulationRun, WorldSnapshot } from '../core';

export type EvaluationStatus = 'pass' | 'fail' | 'not-checked';
export type EvaluationTone = 'good' | 'caution' | 'problem';
export interface EvaluationCheck { id: string; question: string; status: EvaluationStatus; summary: string; }
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
  id: string; version: string; status: 'recovered' | 'survived' | 'collapsed' | 'invalid'; headline: string; summary: string; claimLevel: string;
  comparison: { kind: 'checkpoint-control-shadow'; seed: string; parentCheckpointHash: string; checkpointTick: number; changedInput: string; unchangedBasis: readonly string[]; startTick: number; endTick: number; recoveryThresholdPercent: number; recoverySustainDays: number; };
  metrics: PairedBiomassMetrics; questions: readonly EvaluationQuestion[]; checks: readonly EvaluationCheck[];
  lineages: readonly LineageOutcome[]; explanation: readonly ComparisonExplanationStep[];
  factIds: readonly string[]; limitationIds: readonly string[]; limitations: readonly string[];
}
export interface MicrobialShadowEvaluationBundle { run: SimulationRun; comparisonRun: SimulationRun; checkpoint: SimulationCheckpoint; evaluation: PairedBiomassEvaluation; }

const RECOVERY_THRESHOLD = 0.9, RECOVERY_SUSTAIN_DAYS = 14, SURVIVAL_THRESHOLD = 0.1;
const round = (value: number, digits = 1) => { const scale = 10 ** digits; return Math.round(value * scale) / scale; };
export const totalActiveBiomass = (snapshot: WorldSnapshot) => snapshot.populations.filter((p) => p.active).reduce((sum, p) => sum + p.biomass, 0);
export const productiveBiomassFlux = (snapshot: WorldSnapshot) => snapshot.populations.filter((p) => p.active).reduce((sum, p) => sum + Math.max(0, p.productivity), 0);
export function biomassWeightedStress(snapshot: WorldSnapshot): number {
  const active = snapshot.populations.filter((p) => p.active), total = active.reduce((sum, p) => sum + p.biomass, 0);
  return total <= 0 ? 0 : active.reduce((sum, p) => sum + p.stress * p.biomass, 0) / total;
}
const runNumbers = (run: SimulationRun) => run.snapshots.flatMap((s) => [...Object.values(s.resources), ...Object.values(s.signatures), ...s.populations.flatMap((p) => [p.biomass, p.productivity, p.stress]), ...s.flows.map((f) => f.amount)]);
const hasNegativeStock = (run: SimulationRun) => run.snapshots.some((s) => Object.values(s.resources).some((v) => v < 0) || Object.values(s.signatures).some((v) => v < 0) || s.populations.some((p) => p.biomass < 0) || s.flows.some((f) => f.amount < 0));
function hasRunaway(run: SimulationRun, start: number): boolean {
  const window = run.snapshots.filter((s) => s.tick >= start).map(totalActiveBiomass).slice(-30);
  if (window.length < 30 || window[0] <= 0) return false;
  return window.at(-1)! > window[0] * 2.2 && window.slice(1).every((v, i) => (v - window[i]) / window[i] > 0.025);
}
function deviation(values: readonly number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}
const configDifferences = (a: SimulationConfig, b: SimulationConfig) => (Object.keys(a) as (keyof SimulationConfig)[]).filter((key) => a[key] !== b[key]);
function functionsAtEnd(run: SimulationRun): Map<string, string> {
  const active = new Set(run.snapshots.at(-1)!.populations.filter((p) => p.active && p.biomass > 0).map((p) => p.lineageId));
  return new Map(run.lineages.filter((l) => active.has(l.id)).flatMap((l) => l.capabilities.map((c) => [c.id, c.label] as const)));
}
const prefixMatches = (checkpoint: SimulationCheckpoint, run: SimulationRun) =>
  run.fork?.parentCheckpointHash === checkpoint.hash &&
  JSON.stringify(run.snapshots.filter((s) => s.tick <= checkpoint.tick)) === JSON.stringify(checkpoint.snapshots) &&
  JSON.stringify(run.events.filter((e) => e.tick <= checkpoint.tick)) === JSON.stringify(checkpoint.events);
function firstResourceDifference(shadow: SimulationRun, control: SimulationRun, start: number) {
  for (const snapshot of shadow.snapshots) {
    if (snapshot.tick < start) continue;
    const other = control.snapshots[snapshot.tick]; if (!other) continue;
    for (const key of Object.keys(snapshot.resources) as ResourceKey[]) {
      if (Math.abs(snapshot.resources[key] - other.resources[key]) > 0.01) return { tick: snapshot.tick, key, shadow: snapshot.resources[key], control: other.resources[key] };
    }
  }
}
function firstPopulationDifference(shadow: SimulationRun, control: SimulationRun, start: number) {
  for (const snapshot of shadow.snapshots) {
    if (snapshot.tick < start) continue;
    const other = control.snapshots[snapshot.tick]; if (!other) continue;
    for (const population of snapshot.populations) {
      const comparison = other.populations.find((p) => p.lineageId === population.lineageId);
      if (comparison && Math.abs(population.productivity - comparison.productivity) > 0.01) return { tick: snapshot.tick, label: shadow.lineages.find((l) => l.id === population.lineageId)?.shortName ?? population.lineageId, shadow: population.productivity, control: comparison.productivity };
    }
  }
}
export const withoutLongShadow = (config: SimulationConfig = DEFAULT_CONFIG): SimulationConfig => ({ ...config, shadowStartsAt: config.duration + 1, shadowEndsAt: config.duration + 1 });

export function evaluateCheckpointFork(checkpoint: SimulationCheckpoint, shadow: SimulationRun, control: SimulationRun, repeat: SimulationRun, uninterrupted: SimulationRun): PairedBiomassEvaluation {
  if ([control, repeat, uninterrupted].some((run) => run.seed !== shadow.seed) || checkpoint.seed !== shadow.seed) throw new Error('Checkpoint evaluation requires the same master seed.');
  if (shadow.snapshots.length !== control.snapshots.length) throw new Error('Checkpoint evaluation requires aligned same-time snapshots.');
  const start = shadow.fork?.appliedAt ?? shadow.config.shadowStartsAt, end = shadow.config.shadowEndsAt;
  const pairs = shadow.snapshots.map((snapshot, i) => {
    const comparison = control.snapshots[i];
    if (!comparison || comparison.tick !== snapshot.tick) throw new Error(`Missing same-time comparison snapshot for day ${snapshot.tick}.`);
    const observed = totalActiveBiomass(snapshot), baseline = totalActiveBiomass(comparison), baselineFlux = productiveBiomassFlux(comparison);
    return { tick: snapshot.tick, observed, baseline, retention: baseline > 0 ? observed / baseline : 1, fluxRetention: baselineFlux > 0 ? productiveBiomassFlux(snapshot) / baselineFlux : 1 };
  }).filter((p) => p.tick >= start);
  const lowest = pairs.reduce((a, b) => b.retention < a.retention ? b : a);
  const lowestFlux = pairs.reduce((a, b) => b.fluxRetention < a.fluxRetention ? b : a);
  const recoveryStart = end + 1;
  let recoveryTick: number | null = null;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].tick < recoveryStart) continue;
    const window = pairs.slice(i, i + RECOVERY_SUSTAIN_DAYS);
    if (window.length === RECOVERY_SUSTAIN_DAYS && window.every((p) => p.retention >= RECOVERY_THRESHOLD)) { recoveryTick = pairs[i].tick; break; }
  }
  const integratedLoss = pairs.reduce((sum, p) => sum + Math.max(0, p.baseline - p.observed), 0);
  const averageLoss = pairs.reduce((sum, p) => sum + Math.max(0, 1 - p.retention), 0) / Math.max(1, pairs.length);
  const final = pairs.at(-1)!, shadowEnd = shadow.snapshots.at(-1)!, controlEnd = control.snapshots.at(-1)!;
  const lineages: LineageOutcome[] = shadow.lineages.map((l) => {
    const a = shadowEnd.populations.find((p) => p.lineageId === l.id), b = controlEnd.populations.find((p) => p.lineageId === l.id);
    return { lineageId: l.id, label: l.shortName, withShadow: a?.biomass ?? 0, withoutShadow: b?.biomass ?? 0, differencePercent: b && b.biomass > 0 ? round(((a?.biomass ?? 0) / b.biomass - 1) * 100) : null, stillPresent: Boolean(a?.active && a.biomass > 0) };
  });
  const stresses = shadow.snapshots.filter((s) => s.tick >= start).map((s) => ({ tick: s.tick, stress: biomassWeightedStress(s) }));
  const peakStress = stresses.reduce((a, b) => b.stress > a.stress ? b : a);
  const shadowFunctions = functionsAtEnd(shadow), controlFunctions = functionsAtEnd(control);
  const retained = [...controlFunctions].filter(([id]) => shadowFunctions.has(id)).map(([, label]) => label).sort();
  const lost = [...controlFunctions].filter(([id]) => !shadowFunctions.has(id)).map(([, label]) => label).sort();
  const retainedPercent = controlFunctions.size ? retained.length / controlFunctions.size * 100 : 100;
  const differences = configDifferences(shadow.config, control.config);
  const forkIntegrity = prefixMatches(checkpoint, shadow) && prefixMatches(checkpoint, control) && shadow.fork?.role === 'shadow' && control.fork?.role === 'control' && shadow.fork.appliedAt === checkpoint.tick + 1 && control.fork.appliedAt === checkpoint.tick + 1;
  const branchIsolation = shadow.manifest.environmentProvider === control.manifest.environmentProvider && differences.length === 2 && differences.includes('shadowStartsAt') && differences.includes('shadowEndsAt');
  const checks: EvaluationCheck[] = [
    { id: 'checkpoint-integrity', question: 'Does the shared checkpoint match its content hash?', status: validateSimulationCheckpoint(checkpoint) ? 'pass' : 'fail', summary: 'The saved prefix, exact state, manifest and history are checked before either future resumes.' },
    { id: 'fork-prefix', question: 'Are both histories identical before the change?', status: forkIntegrity ? 'pass' : 'fail', summary: 'Both branches copy the same checkpoint prefix and activate on the next stored day.' },
    { id: 'branch-isolation', question: 'Did we alter only the declared shadow input?', status: branchIsolation ? 'pass' : 'fail', summary: 'Seed, provider and pre-fork state stay pinned; only the shadow-window fields differ.' },
    { id: 'resume-equivalence', question: 'Does resume reproduce the uninterrupted history?', status: JSON.stringify(shadow.snapshots) === JSON.stringify(uninterrupted.snapshots) && JSON.stringify(shadow.events) === JSON.stringify(uninterrupted.events) ? 'pass' : 'fail', summary: 'Checkpoint resume must not alter the ordinary shadow outcome.' },
    { id: 'finite-state', question: 'Did every stored number remain usable?', status: [...runNumbers(shadow), ...runNumbers(control)].every(Number.isFinite) ? 'pass' : 'fail', summary: 'All stored resources, populations, flows and signatures must remain finite.' },
    { id: 'non-negative-stocks', question: 'Did any stored stock go below zero?', status: hasNegativeStock(shadow) || hasNegativeStock(control) ? 'fail' : 'pass', summary: 'Resource stocks, biomass, signatures and recorded flows are checked.' },
    { id: 'repeatability', question: 'Did the same checkpoint fork repeat exactly?', status: JSON.stringify(shadow) === JSON.stringify(repeat) ? 'pass' : 'fail', summary: 'The complete shadow branch is compared with an immediate repeat.' },
    { id: 'unsupported-growth', question: 'Did either future enter unsupported runaway growth?', status: hasRunaway(shadow, start) || hasRunaway(control, start) ? 'fail' : 'pass', summary: 'Rejects a thirty-day tail growing above 2.5% daily while more than doubling.' },
    { id: 'matter-balance', question: 'Can we account for all matter across the boundary?', status: 'not-checked', summary: 'A complete unit-aware conservation ledger is not implemented.' },
    { id: 'accounting-debt', question: 'Can we rule out stock created by prototype floors and caps?', status: 'not-checked', summary: 'Bounds are not yet emitted as accounting entries.' }
  ];
  const invalid = checks.some((c) => c.status === 'fail'), survived = lowest.retention >= SURVIVAL_THRESHOLD, recovered = recoveryTick !== null;
  const status: PairedBiomassEvaluation['status'] = invalid ? 'invalid' : !survived ? 'collapsed' : recovered ? 'recovered' : 'survived';
  const low = round(lowest.retention * 100), avgLoss = round(averageLoss * 100), endDiff = round((final.retention - 1) * 100);
  const present = lineages.filter((l) => l.stillPresent).length, recoveryDays = recoveryTick === null ? null : recoveryTick - recoveryStart;
  const volatility = round(deviation(pairs.filter((p) => p.tick >= recoveryStart).map((p) => p.retention)) * 100);
  const headline = status === 'recovered' ? 'The community bends, then rebuilds.' : status === 'survived' ? 'The community survives, but does not return close to its control.' : status === 'collapsed' ? 'The long shadow pushes the community past the survival floor.' : 'This comparison failed a hard validity gate.';
  const questions: EvaluationQuestion[] = [
    { id: 'survival', question: 'Did it survive?', answer: survived ? `Yes - ${present} of ${lineages.length} represented populations remain present.` : 'Not by this prototype threshold.', detail: `At its lowest point, active biomass was ${low}% of same-time control.`, tone: survived ? 'good' : 'problem' },
    { id: 'recovery', question: 'Did it recover?', answer: recovered ? `Yes - it stayed within 10% of control from day ${recoveryTick}.` : 'Not within the stored window.', detail: recovered ? `${recoveryDays} day${recoveryDays === 1 ? '' : 's'} after full light returned.` : `Requires ${RECOVERY_SUSTAIN_DAYS} consecutive days at 90% of control.`, tone: recovered ? 'good' : 'caution' },
    { id: 'change', question: 'How much was lost?', answer: `${round(integratedLoss)} biomass-days were absent versus control.`, detail: `Average proportional loss: ${avgLoss}%. End difference: ${Math.abs(endDiff)}% ${endDiff < 0 ? 'below' : 'above'} control.`, tone: avgLoss < 20 ? 'good' : 'caution' },
    { id: 'fragility', question: 'How unstable was it?', answer: `Post-return deviation varied by ${volatility}% around its average.`, detail: `Stress peaked at ${round(peakStress.stress * 100)}% on day ${peakStress.tick}; productive flow fell to ${round(lowestFlux.fluxRetention * 100)}% of control.`, tone: peakStress.stress < 0.4 ? 'good' : peakStress.stress < 0.7 ? 'caution' : 'problem' },
    { id: 'function', question: 'What still worked?', answer: `${retained.length} of ${controlFunctions.size} represented capabilities were retained.`, detail: lost.length ? `Lost from active guilds: ${lost.join(', ')}.` : 'No authored capability disappeared from active guilds.', tone: retainedPercent === 100 ? 'good' : retainedPercent >= 70 ? 'caution' : 'problem' }
  ];
  const resource = firstResourceDifference(shadow, control, start), population = firstPopulationDifference(shadow, control, start);
  const explanation: ComparisonExplanationStep[] = [
    { id: 'fork', tick: start, label: 'The futures separate', summary: 'Both histories resume from one verified checkpoint; only usable light changes.', evidence: `Parent ${checkpoint.hash}; shadow activates on day ${start}.` },
    ...(resource ? [{ id: 'first-resource', tick: resource.tick, label: `First resource difference: ${resource.key}`, summary: `Shadow stores ${resource.shadow}; control stores ${resource.control}.`, evidence: 'Earliest resource-ledger difference above 0.01 stored units.' }] : []),
    ...(population ? [{ id: 'first-population', tick: population.tick, label: `First population response: ${population.label}`, summary: `Net productivity is ${population.shadow} with shadow and ${population.control} in control.`, evidence: 'Earliest productivity difference above 0.01 biomass units per day.' }] : []),
    { id: 'bottleneck', tick: lowest.tick, label: 'Deepest aggregate bottleneck', summary: `Living mass reaches ${low}% of same-time control.`, evidence: `Productive flow reaches ${round(lowestFlux.fluxRetention * 100)}% of control.` },
    { id: 'outcome', tick: recoveryTick ?? final.tick, label: recovered ? 'Aggregate recovery is sustained' : 'Stored window ends without recovery', summary: recovered ? `At least 90% of control for ${RECOVERY_SUSTAIN_DAYS} days.` : 'The sustained-recovery threshold is not reached.', evidence: `${retained.length} of ${controlFunctions.size} represented capabilities remain active.` }
  ];
  return {
    id: 'biology/microbial-long-shadow-evaluation', version: '0.2.0', status, headline,
    summary: 'Control and long-shadow futures resume from one content-hashed checkpoint and are compared on the same simulated day.',
    claimLevel: 'Conceptual population-aggregate prototype: mechanisms and causal direction, not calibrated rates or exact ecology.',
    comparison: { kind: 'checkpoint-control-shadow', seed: shadow.seed, parentCheckpointHash: checkpoint.hash, checkpointTick: checkpoint.tick, changedInput: `Scripted light falls to 30% from day ${start} through day ${end}.`, unchangedBasis: ['Content-hashed history and exact state through the checkpoint', 'Master seed, engine, scenario and provider versions', 'Initial resources, authored lineages and nutrient pulse', 'Seasonal light outside the shadow window'], startTick: start, endTick: end, recoveryThresholdPercent: 90, recoverySustainDays: RECOVERY_SUSTAIN_DAYS },
    metrics: { lowestRetentionPercent: low, lowestRetentionTick: lowest.tick, recoveryTick, recoveryDaysAfterLightReturns: recoveryDays, averageBiomassLossPercent: avgLoss, integratedBiomassLoss: round(integratedLoss), endDifferencePercent: endDiff, postReturnVolatilityPercent: volatility, peakStressPercent: round(peakStress.stress * 100), peakStressTick: peakStress.tick, lowestProductiveFluxRetentionPercent: round(lowestFlux.fluxRetention * 100), lineagesStillPresent: present, comparedLineages: lineages.length, retainedFunctionPercent: round(retainedPercent), retainedFunctions: retained, lostFunctions: lost },
    questions, checks, lineages, explanation,
    factIds: ['checkpoint/parent-hash', 'metric/lowest-retention', 'metric/recovery-time', 'metric/integrated-biomass-loss', 'metric/post-return-volatility', 'metric/peak-stress', 'metric/productive-flux-retention', 'metric/retained-functions', 'check/checkpoint-integrity', 'check/fork-prefix', 'check/branch-isolation', 'check/resume-equivalence', 'check/finite-state', 'check/non-negative-stocks', 'check/repeatability', 'check/unsupported-growth'],
    limitationIds: ['limit/no-conservation-ledger', 'limit/no-bound-adjustment-ledger', 'limit/no-calibrated-units', 'limit/predefined-lineages'],
    limitations: ['Biomass and flux use experimental units; complete matter and energy conservation are not yet testable.', 'Prototype floors and caps are not yet accounting entries, so hidden adjustment debt remains unknown.', 'The four lineages and capabilities are predefined rather than produced by open-ended evolution.', 'The scripted provider removes light; it does not resolve planetary physics.']
  };
}
export function createMicrobialShadowEvaluation(seed: string, config: SimulationConfig = DEFAULT_CONFIG): MicrobialShadowEvaluationBundle {
  const uninterrupted = simulate(seed, config), checkpoint = createSimulationCheckpoint(uninterrupted, config.shadowStartsAt - 1);
  const shadowDefinition = { id: 'environment/long-shadow', version: '0.1.0', role: 'shadow' as const, appliedAt: checkpoint.tick + 1, description: 'Reduce usable light to 30% during the shadow window.', config };
  const run = forkSimulation(checkpoint, shadowDefinition);
  const comparisonRun = forkSimulation(checkpoint, { id: 'control/no-long-shadow', version: '0.1.0', role: 'control', appliedAt: checkpoint.tick + 1, description: 'Continue seasonal light without the shadow.', config: withoutLongShadow(config) });
  const repeat = forkSimulation(checkpoint, shadowDefinition);
  return { run, comparisonRun, checkpoint, evaluation: evaluateCheckpointFork(checkpoint, run, comparisonRun, repeat, uninterrupted) };
}
