import {
  DEFAULT_CONFIG,
  MICROBIAL_RUNTIME_PARAMETER_BASELINE,
  MICROBIAL_RUNTIME_PARAMETER_IDS,
  stableChecksum
} from '../core';
import type { SimulationConfig } from '../core';
import {
  compileTuningCandidate,
  compileTuningSpec,
  compareCandidateEvaluations,
  evaluateTuningCandidate
} from '../calibration';
import type {
  CompiledTuningSpec,
  TuningCandidateAssessment,
  TuningCandidateDefinition,
  TuningCandidateRecord,
  TuningParameterChange,
  TuningSuiteId
} from '../calibration';
import { DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE } from '../contracts';
import { EXPERIMENTS } from '../experiments';
import { MICROBIAL_QUALIFICATION_SEEDS } from './microbialQualification';
import { MICROBIAL_SHADOW_PROFILE } from './microbialProfile';
import { profileMicrobialRunWorkload } from './microbialPerformance';
import { createMicrobialShadowEvaluation } from './pairedBiomass';

const runtimeParameterIds = new Set<string>(Object.values(MICROBIAL_RUNTIME_PARAMETER_IDS));

function scalarFixtureValue(id: string): number {
  const value = DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE.values[id];
  if (!value || value.shape !== 'scalar') throw new Error(`Expected scalar provider value ${id}.`);
  return value.value;
}

export const MICROBIAL_TUNING_SPEC: CompiledTuningSpec = compileTuningSpec({
  id: 'biology/microbial-flask-tuning',
  version: '0.1.0',
  title: 'Microbial flask bounded candidate tuning',
  purpose:
    'Exercise deterministic propose, validate, compare and held-out review plumbing against a small uncalibrated aggregate ecology.',
  baseArtifact: {
    id: EXPERIMENTS[0].id,
    version: EXPERIMENTS[0].version,
    hash: EXPERIMENTS[0].manifestHash!
  },
  evaluationProfile: {
    id: MICROBIAL_SHADOW_PROFILE.id,
    version: MICROBIAL_SHADOW_PROFILE.version,
    hash: MICROBIAL_SHADOW_PROFILE.hash
  },
  parameters: [
    {
      id: MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverGrowthRate,
      label: 'Light-weaver growth rate',
      description: 'Potential daily biomass growth when the declared limiting factors allow it.',
      unit: 'ratio/day',
      authority: 'learnable',
      baseline: MICROBIAL_RUNTIME_PARAMETER_BASELINE[MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverGrowthRate],
      minimum: 0.02,
      maximum: 0.08,
      step: 0.002
    },
    {
      id: MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverMaintenanceRate,
      label: 'Light-weaver maintenance rate',
      description: 'Daily fraction of light-weaver biomass returned to tracked material reservoirs.',
      unit: 'ratio/day',
      authority: 'learnable',
      baseline: MICROBIAL_RUNTIME_PARAMETER_BASELINE[MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverMaintenanceRate],
      minimum: 0.004,
      maximum: 0.025,
      step: 0.001
    },
    {
      id: MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverLightHalfSaturation,
      label: 'Light response scale',
      description: 'Usable-light level that sets the prototype light-response scale.',
      unit: 'usable-light',
      authority: 'learnable',
      baseline: MICROBIAL_RUNTIME_PARAMETER_BASELINE[MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverLightHalfSaturation],
      minimum: 40,
      maximum: 120,
      step: 2
    },
    {
      id: 'provider/mean-usable-light',
      label: 'Provider mean usable light',
      description: 'Authoritative environmental forcing supplied by the selected physical-input fixture.',
      unit: 'usable-light',
      authority: 'frozen',
      baseline: scalarFixtureValue('prototype/mean-usable-light'),
      minimum: 0,
      maximum: 90,
      step: 1
    }
  ],
  objectives: [
    { id: 'productive-flux-retention', label: 'Productive flow retained', description: 'Lowest productive biomass flow versus same-time control.', unit: '%', direction: 'maximize' },
    { id: 'integrated-biomass-loss', label: 'Integrated biomass loss', description: 'Missing active biomass accumulated across the comparison window.', unit: 'model-mass-days', direction: 'minimize' },
    { id: 'peak-stress', label: 'Peak stress', description: 'Highest biomass-weighted population stress.', unit: '%', direction: 'minimize' },
    { id: 'post-return-volatility', label: 'Post-return volatility', description: 'Variation around the same-time control after full light returns.', unit: '%', direction: 'minimize' },
    { id: 'retained-functions', label: 'Functions retained', description: 'Represented active capabilities retained at the end of the run.', unit: '%', direction: 'maximize' },
    { id: 'history-characters', label: 'Stored history size', description: 'Deterministic serialized-history proxy for browser cost.', unit: 'characters', direction: 'minimize' }
  ],
  hardGateIds: MICROBIAL_SHADOW_PROFILE.gates
    .filter(({ availability }) => availability === 'implemented')
    .map(({ id }) => id),
  suites: [
    { id: 'smoke', label: 'Smoke', purpose: 'Fast contract and determinism feedback.', visibility: 'iterative', seeds: [MICROBIAL_QUALIFICATION_SEEDS[0]] },
    { id: 'calibration', label: 'Working set', purpose: 'Named seeds visible during candidate iteration.', visibility: 'iterative', seeds: MICROBIAL_QUALIFICATION_SEEDS.slice(0, 3) },
    { id: 'held-out', label: 'Held-out check', purpose: 'Unseen named seeds used only after a candidate is formed.', visibility: 'held-out', seeds: MICROBIAL_QUALIFICATION_SEEDS.slice(3) },
    { id: 'release', label: 'Release qualification', purpose: 'All named seeds used for checked release evidence.', visibility: 'held-out', seeds: MICROBIAL_QUALIFICATION_SEEDS }
  ],
  limitations: [
    'This tunes an authored aggregate prototype; it is not a scientific calibration or prediction.',
    'The five named seeds are engineering fixtures, not a representative biological dataset.',
    'Matter closes in declared model-mass units; useful energy is not yet a complete ledger.',
    'The current candidate boundary adjusts three existing light-weaver constants only.'
  ]
});

const specReference = () => ({
  id: MICROBIAL_TUNING_SPEC.id,
  version: MICROBIAL_TUNING_SPEC.version,
  hash: MICROBIAL_TUNING_SPEC.hash
});

export function createMicrobialTuningCandidate(
  changes: readonly TuningParameterChange[],
  hypothesis = 'Retain the authored baseline as the comparison reference.',
  generator: TuningCandidateDefinition['generator'] = { kind: 'human', id: 'evolution-lab/human', version: '0.1.0' },
  id = 'candidate/biology/microbial-human'
): TuningCandidateRecord {
  return compileTuningCandidate(MICROBIAL_TUNING_SPEC, {
    id,
    version: '0.1.0',
    spec: specReference(),
    parentCandidateHash: null,
    generator,
    hypothesis,
    changes
  });
}

export const MICROBIAL_BASELINE_CANDIDATE = createMicrobialTuningCandidate(
  [],
  'Retain the authored baseline as the comparison reference.',
  { kind: 'human', id: 'evolution-lab/baseline', version: '0.1.0' },
  'candidate/biology/microbial-baseline'
);

let baselineCalibrationCache: ReturnType<typeof evaluateMicrobialTuningCandidate> | undefined;
let baselineHeldOutCache: ReturnType<typeof evaluateMicrobialTuningCandidate> | undefined;

export function microbialConfigForCandidate(
  candidate: TuningCandidateRecord,
  config: SimulationConfig = DEFAULT_CONFIG
): SimulationConfig {
  if (candidate.spec.hash !== MICROBIAL_TUNING_SPEC.hash) throw new Error('Microbial runtime requires the exact tuning spec.');
  const values = Object.fromEntries(
    Object.entries(candidate.resolvedValues).filter(([id]) => runtimeParameterIds.has(id))
  );
  return {
    ...config,
    runtimeParameters: {
      schemaVersion: 'evolution-runtime-parameters/0.1',
      specId: candidate.spec.id,
      specVersion: candidate.spec.version,
      specHash: candidate.spec.hash,
      candidateHash: candidate.hash,
      values
    }
  };
}

export function evaluateMicrobialTuningCandidate(
  candidate: TuningCandidateRecord,
  suite: TuningSuiteId
) {
  return evaluateTuningCandidate(MICROBIAL_TUNING_SPEC, candidate, suite, (tested, seed) => {
    const bundle = createMicrobialShadowEvaluation(seed, microbialConfigForCandidate(tested));
    const { evaluation } = bundle;
    const workload = profileMicrobialRunWorkload(bundle.run);
    return {
      seed,
      gates: evaluation.checks.map((gate) => ({
        id: gate.id,
        passed: gate.status === 'pass',
        evidence: gate.evidence?.trim() || gate.summary
      })),
      metrics: [
        { id: 'productive-flux-retention', value: evaluation.metrics.lowestProductiveFluxRetentionPercent },
        { id: 'integrated-biomass-loss', value: evaluation.metrics.integratedBiomassLoss },
        { id: 'peak-stress', value: evaluation.metrics.peakStressPercent },
        { id: 'post-return-volatility', value: evaluation.metrics.postReturnVolatilityPercent },
        { id: 'retained-functions', value: evaluation.metrics.retainedFunctionPercent },
        { id: 'history-characters', value: workload.historyCharacters }
      ],
      artifactHashes: [
        bundle.checkpoint.hash,
        stableChecksum('simulation-run/v1', bundle.run),
        stableChecksum('simulation-run/v1', bundle.comparisonRun)
      ]
    };
  });
}

export function assessMicrobialTuningCandidate(candidate: TuningCandidateRecord): TuningCandidateAssessment {
  const baselineCalibration = baselineCalibrationCache ??= evaluateMicrobialTuningCandidate(MICROBIAL_BASELINE_CANDIDATE, 'calibration');
  const baselineHeldOut = baselineHeldOutCache ??= evaluateMicrobialTuningCandidate(MICROBIAL_BASELINE_CANDIDATE, 'held-out');
  const calibration = evaluateMicrobialTuningCandidate(candidate, 'calibration');
  const heldOut = evaluateMicrobialTuningCandidate(candidate, 'held-out');
  return {
    candidate,
    calibration,
    heldOut,
    calibrationComparison: compareCandidateEvaluations(baselineCalibration, calibration),
    heldOutComparison: compareCandidateEvaluations(baselineHeldOut, heldOut)
  };
}

export function createMicrobialCandidateTemplate() {
  return {
    spec: specReference(),
    candidate: {
      id: 'candidate/biology/your-candidate',
      version: '0.1.0',
      spec: specReference(),
      parentCandidateHash: MICROBIAL_BASELINE_CANDIDATE.hash,
      generator: { kind: 'human', id: 'your-tool', version: '0.1.0' },
      hypothesis: 'State one testable reason for one bounded change.',
      changes: [
        {
          parameterId: MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverGrowthRate,
          value: MICROBIAL_RUNTIME_PARAMETER_BASELINE[MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverGrowthRate],
          unit: 'ratio/day'
        }
      ]
    }
  };
}
