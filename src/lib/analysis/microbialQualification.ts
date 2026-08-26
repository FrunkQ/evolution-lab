import {
  createSimulationCheckpoint,
  DEFAULT_CONFIG,
  simulate,
  stableChecksum
} from '../core';
import {
  compileProviderFixture,
  DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE,
  EXOBIOLOGY_PROVIDER_REQUIREMENTS,
  exobiologyFixtureToSimulationConfig,
  replaceProviderValue
} from '../contracts';
import {
  compileExperimentQualification,
  evaluateWorkloadBudget,
  computeExperimentManifestHash,
  EXPERIMENTS,
  validateExperiment
} from '../experiments';
import type {
  EvolutionExperiment,
  ExperimentQualificationReport,
  ExperimentQualificationSummary,
  QualificationCheck
} from '../experiments';
import { MICROBIAL_SHADOW_PROFILE } from './microbialProfile';
import { createMicrobialShadowEvaluation } from './pairedBiomass';
import { MICROBIAL_BROWSER_WORKLOAD_BUDGET, profileMicrobialRunWorkload } from './microbialPerformance';
import { createMicrobialShadowResponseFamily } from './microbialSweep';

export const MICROBIAL_QUALIFICATION_SEEDS = [
  'fish-and-strawberries',
  'qualification/dim-start',
  'qualification/recycler-pressure',
  'qualification/late-bottleneck',
  'qualification/replay-edge'
] as const;

export const MICROBIAL_QUALIFICATION_CLAIM =
  'This qualifies deterministic framework plumbing and declared prototype behaviour. It does not validate the biology as calibrated science.';

export const MICROBIAL_QUALIFICATION_LIMITATIONS = [
  'Complete unit-aware matter and energy conservation is still unavailable.',
  'Prototype floor and cap adjustments are not yet emitted as accounting entries.',
  'The suite samples five named seeds; it is not a statistical calibration study.',
  'The four lineage definitions remain authored content.'
] as const;

export const MICROBIAL_REFERENCE_QUALIFICATION_SUMMARY: ExperimentQualificationSummary = {
  id: 'qualification/biology/microbial-reference',
  version: '0.1.0',
  hash: 'experiment-qualification/v1-7ad9732d',
  experimentId: 'lab/microbial-flask-001',
  valid: true,
  passed: 10,
  failed: 0,
  seedCount: MICROBIAL_QUALIFICATION_SEEDS.length,
  claimLevel: MICROBIAL_QUALIFICATION_CLAIM,
  limitations: MICROBIAL_QUALIFICATION_LIMITATIONS,
  workload: {
    budgetHash: MICROBIAL_BROWSER_WORKLOAD_BUDGET.hash,
    storedSnapshots: 361,
    peakProcessedNodes: 4,
    processedNodeTicks: 1444,
    historyCharacters: 519076,
    limitsPassed: 6,
    limitsTotal: 6
  }
};

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function lowLightFixture() {
  const draft = JSON.parse(JSON.stringify(DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE));
  delete draft.hash;
  const mean = draft.values['prototype/mean-usable-light'];
  const amplitude = draft.values['prototype/light-cycle-amplitude'];
  if (mean?.shape !== 'scalar' || amplitude?.shape !== 'scalar') {
    throw new Error('The Exobiology qualification requires the declared prototype light controls.');
  }
  const withMean = replaceProviderValue(draft, 'prototype/mean-usable-light', { ...mean, value: 12 });
  const withFlatCycle = replaceProviderValue(withMean, 'prototype/light-cycle-amplitude', { ...amplitude, value: 0 });
  return compileProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, withFlatCycle);
}

export function createMicrobialReferenceQualification(
  experiment: EvolutionExperiment = EXPERIMENTS[0]
): ExperimentQualificationReport {
  if (!experiment.manifestHash || !experiment.providerInput) {
    throw new Error('The microbial qualification requires a reference experiment with pinned manifest and provider input.');
  }

  const fixture = DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE;
  const config = exobiologyFixtureToSimulationConfig(fixture, DEFAULT_CONFIG);
  const referenceRun = simulate(experiment.masterSeed, config);
  const repeatedRun = simulate(experiment.masterSeed, config);
  const workload = profileMicrobialRunWorkload(referenceRun);
  const workloadReport = evaluateWorkloadBudget(workload, MICROBIAL_BROWSER_WORKLOAD_BUDGET);
  const expectedCheckpoints = experiment.checkpoints.map((checkpoint) => ({
    tick: checkpoint.tick,
    expected: checkpoint.expectedHash,
    actual: createSimulationCheckpoint(referenceRun, checkpoint.tick).hash
  }));
  const evaluationBundle = createMicrobialShadowEvaluation(experiment.masterSeed, config);
  const implementedGates = evaluationBundle.evaluation.checks.filter(({ status }) => status !== 'not-checked');
  const unavailableGates = evaluationBundle.evaluation.checks.filter(({ status }) => status === 'not-checked');
  const family = createMicrobialShadowResponseFamily(experiment.masterSeed, config);
  const repeatedFamily = createMicrobialShadowResponseFamily(experiment.masterSeed, config);
  const alternateFixture = lowLightFixture();
  const alternateRun = simulate(
    experiment.masterSeed,
    exobiologyFixtureToSimulationConfig(alternateFixture, DEFAULT_CONFIG)
  );

  const seedResults = MICROBIAL_QUALIFICATION_SEEDS.map((seed) => {
    const first = simulate(seed, config);
    const second = simulate(seed, config);
    const evaluation = createMicrobialShadowEvaluation(seed, config).evaluation;
    return {
      seed,
      replayed: same(first, second),
      evaluationValid: evaluation.status !== 'invalid'
    };
  });

  const checks: QualificationCheck[] = [
    {
      id: 'identity/reference-manifest',
      kind: 'identity',
      label: 'Reference identity is internally consistent',
      passed: validateExperiment(experiment).length === 0 && computeExperimentManifestHash(experiment) === experiment.manifestHash,
      evidence: `${experiment.id}@${experiment.version} · ${experiment.manifestHash}`
    },
    {
      id: 'input/provider-fixture',
      kind: 'input',
      label: 'The reference run pins its exact physical-input dataset',
      passed:
        experiment.providerInput.fixtureHash === fixture.hash &&
        referenceRun.manifest.providerInput?.fixtureHash === fixture.hash &&
        compileProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, JSON.parse(JSON.stringify(fixture))).hash === fixture.hash,
      evidence: `${fixture.profile.id}@${fixture.profile.version} · ${fixture.hash}`
    },
    {
      id: 'replay/reference-run',
      kind: 'replay',
      label: 'The complete reference history replays exactly',
      passed: same(referenceRun, repeatedRun),
      evidence: `${referenceRun.snapshots.length} snapshots and ${referenceRun.events.length} events match for seed ${experiment.masterSeed}.`
    },
    {
      id: 'checkpoint/reference-hashes',
      kind: 'checkpoint',
      label: 'Every promoted checkpoint matches its expected content hash',
      passed: expectedCheckpoints.every(({ expected, actual }) => expected === actual),
      evidence: expectedCheckpoints.map(({ tick, actual }) => `D${tick} ${actual}`).join(' · ')
    },
    {
      id: 'fork/paired-futures',
      kind: 'fork',
      label: 'Control and shadow futures resume from one verified prefix',
      passed:
        evaluationBundle.evaluation.status !== 'invalid' &&
        implementedGates.every(({ status }) => status === 'pass'),
      evidence: `${implementedGates.length}/${implementedGates.length} available hard gates pass; ${unavailableGates.length} model-fidelity gates remain visibly unavailable.`
    },
    {
      id: 'evaluation/response-family',
      kind: 'evaluation',
      label: 'The severity-by-duration response family is deterministic and valid',
      passed:
        same(family, repeatedFamily) &&
        family.cases.length === 9 &&
        family.cases.every(({ outcome }) => outcome.valid) &&
        new Set(family.cases.map(({ manifestHash }) => manifestHash)).size === family.cases.length,
      evidence: `${family.cases.length} cases · ${family.hash}`
    },
    {
      id: 'input/declared-change',
      kind: 'input',
      label: 'Changing a declared input changes the pinned history',
      passed:
        alternateFixture.hash !== fixture.hash &&
        alternateRun.manifest.configHash !== referenceRun.manifest.configHash &&
        !same(alternateRun.snapshots, referenceRun.snapshots) &&
        alternateRun.manifest.providerInput?.fixtureHash === alternateFixture.hash,
      evidence: `${fixture.hash} → ${alternateFixture.hash}; both histories retain explicit input identity.`
    },
    {
      id: 'replay/multi-seed-suite',
      kind: 'replay',
      label: 'Named seed cases replay and pass available validity gates',
      passed: seedResults.every(({ replayed, evaluationValid }) => replayed && evaluationValid),
      evidence: seedResults.map(({ seed, replayed, evaluationValid }) => `${seed}: ${replayed && evaluationValid ? 'pass' : 'fail'}`).join(' · ')
    },
    {
      id: 'performance/reference-budget',
      kind: 'coverage',
      label: 'The reference history stays inside its authored browser workload budget',
      passed: workloadReport.valid,
      evidence: workload.peakProcessedNodes + ' peak processed nodes · ' + workload.processedNodeTicks + ' node-days · ' + workload.historyCharacters + ' stored JSON characters · ' + workloadReport.passed + '/' + workloadReport.results.length + ' limits pass.'
    },
    {
      id: 'coverage/causal-history',
      kind: 'coverage',
      label: 'The comparison retains an inspectable causal trail',
      passed:
        referenceRun.events.every(({ causes }) => causes.length > 0) &&
        ['fork', 'first-resource', 'first-population', 'bottleneck', 'outcome'].every((id) =>
          evaluationBundle.evaluation.explanation.some((step) => step.id === id)
        ),
      evidence: `${referenceRun.events.length} recorded events and ${evaluationBundle.evaluation.explanation.length} comparison steps retain causes.`
    }
  ];

  return compileExperimentQualification({
    id: 'qualification/biology/microbial-reference',
    version: '0.1.0',
    experiment: {
      id: experiment.id,
      version: experiment.version,
      manifestHash: experiment.manifestHash
    },
    seeds: MICROBIAL_QUALIFICATION_SEEDS,
    artifacts: [
      { id: fixture.id, version: fixture.version, hash: fixture.hash },
      {
        id: MICROBIAL_SHADOW_PROFILE.id,
        version: MICROBIAL_SHADOW_PROFILE.version,
        hash: MICROBIAL_SHADOW_PROFILE.hash
      },
      { id: family.id, version: family.version, hash: family.hash },
      { id: MICROBIAL_BROWSER_WORKLOAD_BUDGET.id, version: MICROBIAL_BROWSER_WORKLOAD_BUDGET.version, hash: MICROBIAL_BROWSER_WORKLOAD_BUDGET.hash },
      {
        id: 'checkpoint/biology/microbial-shadow-parent',
        version: '0.1.0',
        hash: evaluationBundle.checkpoint.hash
      },
      {
        id: 'run/biology/microbial-reference',
        version: experiment.version,
        hash: stableChecksum('simulation-run/v1', referenceRun)
      }
    ],
    checks,
    claimLevel: MICROBIAL_QUALIFICATION_CLAIM,
    limitations: MICROBIAL_QUALIFICATION_LIMITATIONS
  });
}