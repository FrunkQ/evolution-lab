import { describe, expect, it } from 'vitest';
import {
  compileDeviceBenchmark,
  compileWorkloadBudget,
  evaluateWorkloadBudget,
  summarizeDevicePerformance
} from './performance';
import type { DeviceBenchmarkContext, WorkloadBudgetDefinition } from './performance';

const budgetDefinition: WorkloadBudgetDefinition = {
  id: 'performance/test-browser',
  version: '0.1.0',
  title: 'Test browser budget',
  limits: [
    {
      metric: 'peakProcessedNodes',
      label: 'Peak nodes',
      maximum: 500,
      unit: 'nodes',
      reason: 'Bound sparse graph work.'
    },
    {
      metric: 'historyCharacters',
      label: 'Stored history',
      maximum: 10000,
      unit: 'characters',
      reason: 'Bound retained browser memory.'
    }
  ]
};

const budget = compileWorkloadBudget(budgetDefinition);
const benchmark = compileDeviceBenchmark({
  id: 'performance/test-device',
  version: '0.1.0',
  title: 'Test device timing',
  quick: { referenceHistoryMaximumMs: 100, responseFamilyMaximumMs: 1000 },
  comfortable: { referenceHistoryMaximumMs: 500, responseFamilyMaximumMs: 5000 }
});

const profile = {
  storedSnapshots: 10,
  peakProcessedNodes: 4,
  peakActiveNodes: 3,
  processedNodeTicks: 40,
  activeNodeTicks: 24,
  flowRecords: 18,
  accountingRecords: 12,
  eventRecords: 3,
  historyCharacters: 8000
};

const context: DeviceBenchmarkContext = {
  engineVersion: '1.0.0',
  runtimeLabel: 'Test Browser 1',
  timingSource: 'test monotonic clock',
  warmupRuns: 1,
  workload: {
    budget: { id: budget.id, version: budget.version, hash: budget.hash },
    profile
  }
};

describe('workload and device performance contracts', () => {
  it('content-addresses an authored budget and reports every measured limit', () => {
    const first = compileWorkloadBudget(budgetDefinition);
    const second = compileWorkloadBudget(budgetDefinition);
    const report = evaluateWorkloadBudget(profile, first);
    expect(first).toEqual(second);
    expect(first.hash).toMatch(/^workload-budget\/v1-/);
    expect(report).toMatchObject({ valid: true, passed: 2, failed: 0 });
    expect(report.results.map(({ metric, actual, passed }) => ({ metric, actual, passed }))).toEqual([
      { metric: 'peakProcessedNodes', actual: 4, passed: true },
      { metric: 'historyCharacters', actual: 8000, passed: true }
    ]);
  });

  it('fails a workload limit without changing or hiding the measured profile', () => {
    const report = evaluateWorkloadBudget(
      { ...profile, peakProcessedNodes: 501 },
      budget
    );
    expect(report).toMatchObject({ valid: false, failed: 1 });
    expect(report.profile.peakProcessedNodes).toBe(501);
    expect(report.results[0]).toMatchObject({ actual: 501, passed: false });
  });

  it('versions the rating policy and retains the exact local measurement context', () => {
    const quick = summarizeDevicePerformance([20, 22, 21], [300, 330, 310], benchmark, context);
    expect(quick).toMatchObject({
      benchmark: { id: benchmark.id, version: benchmark.version, hash: benchmark.hash },
      engineVersion: '1.0.0',
      runtimeLabel: 'Test Browser 1',
      timingSource: 'test monotonic clock',
      warmupRuns: 1,
      sampleCount: 3,
      referenceHistoryMedianMs: 21,
      responseFamilyMedianMs: 310,
      rating: 'quick',
      populationCapacityEstimate: null
    });
    expect(quick.workload.profile).toEqual(profile);
    expect(quick.populationCapacityReason).toContain('misleading');
    expect(summarizeDevicePerformance([300, 350, 400], [2000, 2400, 2200], benchmark, context).rating).toBe('comfortable');
    expect(summarizeDevicePerformance([700, 800, 900], [6000, 6500, 7000], benchmark, context).rating).toBe('slow');
  });

  it('rejects invalid budgets, benchmark policies, timing samples and context', () => {
    expect(() => compileWorkloadBudget({
      id: 'performance/duplicate',
      version: '0.1.0',
      title: 'Duplicate',
      limits: [budget.limits[0], budget.limits[0]]
    })).toThrow(/Duplicate workload/);
    expect(() => compileDeviceBenchmark({
      id: 'performance/backwards',
      version: '0.1.0',
      title: 'Backwards targets',
      quick: { referenceHistoryMaximumMs: 500, responseFamilyMaximumMs: 5000 },
      comfortable: { referenceHistoryMaximumMs: 100, responseFamilyMaximumMs: 1000 }
    })).toThrow(/cannot be stricter/);
    expect(() => summarizeDevicePerformance([1], [], benchmark, context)).toThrow(/equal, positive/);
    expect(() => summarizeDevicePerformance([1], [1], benchmark, { ...context, runtimeLabel: '' })).toThrow(/context/);
  });
});
