import { DEFAULT_CONFIG, simulate } from '../core';
import type { SimulationRun } from '../core';
import {
  DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE,
  exobiologyFixtureToSimulationConfig
} from '../contracts';
import { EXPERIMENTS } from '../experiments/catalog';
import {
  compileDeviceBenchmark,
  compileWorkloadBudget,
  summarizeDevicePerformance
} from '../experiments/performance';
import type { DevicePerformanceObservation, WorkloadProfile } from '../experiments/performance';
import { ENGINE_VERSION } from '../version';
import { createMicrobialShadowResponseFamily } from './microbialSweep';

export const MICROBIAL_BROWSER_WORKLOAD_BUDGET = compileWorkloadBudget({
  id: 'performance/browser-reference-history',
  version: '0.2.0',
  title: 'Browser reference-history structural budget',
  limits: [
    {
      metric: 'storedSnapshots',
      label: 'Stored time samples',
      maximum: 5000,
      unit: 'snapshots',
      reason: 'Bound retained time-series and checkpoint work in one detailed history.'
    },
    {
      metric: 'peakProcessedNodes',
      label: 'Peak processed nodes',
      maximum: 500,
      unit: 'aggregate nodes',
      reason: 'Match the declared ordinary-world browser envelope before a scalable node engine exists.'
    },
    {
      metric: 'processedNodeTicks',
      label: 'Processed node-days',
      maximum: 500000,
      unit: 'node-days',
      reason: 'Catch growth in combined resolution and active graph size.'
    },
    {
      metric: 'flowRecords',
      label: 'Stored flow records',
      maximum: 100000,
      unit: 'records',
      reason: 'Keep graph projections and retained history bounded.'
    },
    {
      metric: 'accountingRecords',
      label: 'Stored accounting transactions',
      maximum: 100000,
      unit: 'records',
      reason: 'Keep auditable postings practical before ledger compaction exists.'
    },
    {
      metric: 'eventRecords',
      label: 'Stored causal events',
      maximum: 10000,
      unit: 'events',
      reason: 'Keep inspectable causal history practical before event compaction exists.'
    },
    {
      metric: 'historyCharacters',
      label: 'Serialized history size',
      maximum: 10000000,
      unit: 'JSON characters',
      reason: 'Use a deterministic storage proxy until browser persistence and binary formats are selected.'
    }
  ]
});

export const MICROBIAL_REFERENCE_DEVICE_BENCHMARK = compileDeviceBenchmark({
  id: 'performance/browser-microbial-reference',
  version: '0.1.0',
  title: 'Microbial reference and nine-case response timing',
  quick: {
    referenceHistoryMaximumMs: 100,
    responseFamilyMaximumMs: 1000
  },
  comfortable: {
    referenceHistoryMaximumMs: 500,
    responseFamilyMaximumMs: 5000
  }
});

export function profileMicrobialRunWorkload(run: SimulationRun): WorkloadProfile {
  return {
    storedSnapshots: run.snapshots.length,
    peakProcessedNodes: Math.max(0, ...run.snapshots.map(({ populations }) => populations.length)),
    peakActiveNodes: Math.max(
      0,
      ...run.snapshots.map(({ populations }) => populations.filter(({ active }) => active).length)
    ),
    processedNodeTicks: run.snapshots.reduce((sum, { populations }) => sum + populations.length, 0),
    activeNodeTicks: run.snapshots.reduce(
      (sum, { populations }) => sum + populations.filter(({ active }) => active).length,
      0
    ),
    flowRecords: run.snapshots.reduce((sum, { flows }) => sum + flows.length, 0),
    accountingRecords: run.snapshots.reduce((sum, { accounting }) => sum + accounting.transactions.length, 0),
    eventRecords: run.events.length,
    historyCharacters: JSON.stringify(run).length
  };
}

const medianSamples = 3;
const warmupRuns = 1;

export function benchmarkMicrobialReferenceDevice(
  now: () => number,
  sampleCount = medianSamples,
  runtimeLabel = 'Runtime details not supplied',
  timingSource = 'Host monotonic clock'
): DevicePerformanceObservation {
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 9) {
    throw new Error('Device benchmark sample count must be an integer from 1 to 9.');
  }
  const config = exobiologyFixtureToSimulationConfig(
    DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE,
    DEFAULT_CONFIG
  );
  const referenceSeed = EXPERIMENTS[0].masterSeed;
  simulate('performance/warm-up', config);
  createMicrobialShadowResponseFamily('performance/warm-up', config);

  const referenceSamples: number[] = [];
  const familySamples: number[] = [];
  let measuredReferenceRun: SimulationRun | undefined;
  for (let index = 0; index < sampleCount; index += 1) {
    let started = now();
    measuredReferenceRun = simulate(referenceSeed, config);
    referenceSamples.push(Math.max(0.001, now() - started));

    started = now();
    createMicrobialShadowResponseFamily(referenceSeed, config);
    familySamples.push(Math.max(0.001, now() - started));
  }
  if (!measuredReferenceRun) throw new Error('Device benchmark produced no reference history.');
  return summarizeDevicePerformance(
    referenceSamples,
    familySamples,
    MICROBIAL_REFERENCE_DEVICE_BENCHMARK,
    {
      engineVersion: ENGINE_VERSION,
      runtimeLabel,
      timingSource,
      warmupRuns,
      workload: {
        budget: {
          id: MICROBIAL_BROWSER_WORKLOAD_BUDGET.id,
          version: MICROBIAL_BROWSER_WORKLOAD_BUDGET.version,
          hash: MICROBIAL_BROWSER_WORKLOAD_BUDGET.hash
        },
        profile: profileMicrobialRunWorkload(measuredReferenceRun)
      }
    }
  );
}
