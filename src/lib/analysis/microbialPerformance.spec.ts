import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, simulate } from '../core';
import {
  DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE,
  exobiologyFixtureToSimulationConfig
} from '../contracts';
import { evaluateWorkloadBudget } from '../experiments';
import {
  benchmarkMicrobialReferenceDevice,
  MICROBIAL_BROWSER_WORKLOAD_BUDGET,
  MICROBIAL_REFERENCE_DEVICE_BENCHMARK,
  profileMicrobialRunWorkload
} from './microbialPerformance';

describe('microbial workload and device benchmark adapter', () => {
  it('profiles the promoted reference history deterministically inside its browser budget', () => {
    const config = exobiologyFixtureToSimulationConfig(
      DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE,
      DEFAULT_CONFIG
    );
    const first = profileMicrobialRunWorkload(simulate('fish-and-strawberries', config));
    const second = profileMicrobialRunWorkload(simulate('fish-and-strawberries', config));
    expect(first).toEqual(second);
    expect(first).toEqual({
      storedSnapshots: 361,
      peakProcessedNodes: 4,
      peakActiveNodes: 4,
      processedNodeTicks: 1444,
      activeNodeTicks: 1229,
      flowRecords: 2406,
      accountingRecords: 1960,
      eventRecords: 7,
      historyCharacters: 1585662
    });
    expect(evaluateWorkloadBudget(first, MICROBIAL_BROWSER_WORKLOAD_BUDGET)).toMatchObject({
      valid: true,
      passed: 7,
      failed: 0
    });
  });

  it('keeps elapsed timing local while retaining its benchmark and workload context', () => {
    let clock = 0;
    const observation = benchmarkMicrobialReferenceDevice(() => {
      clock += 10;
      return clock;
    }, 1, 'Test Browser 1', 'test monotonic clock');
    expect(observation).toMatchObject({
      benchmark: {
        id: MICROBIAL_REFERENCE_DEVICE_BENCHMARK.id,
        version: MICROBIAL_REFERENCE_DEVICE_BENCHMARK.version,
        hash: MICROBIAL_REFERENCE_DEVICE_BENCHMARK.hash
      },
      engineVersion: '0.5.0',
      runtimeLabel: 'Test Browser 1',
      timingSource: 'test monotonic clock',
      warmupRuns: 1,
      sampleCount: 1,
      referenceHistoryMedianMs: 10,
      responseFamilyMedianMs: 10,
      rating: 'quick',
      populationCapacityEstimate: null,
      workload: {
        budget: { hash: MICROBIAL_BROWSER_WORKLOAD_BUDGET.hash },
        profile: { peakProcessedNodes: 4, processedNodeTicks: 1444 }
      }
    });
    expect(observation.populationCapacityReason).toContain('four authored guilds');
  });

  it('bounds benchmark sample counts to avoid accidental browser lockups', () => {
    expect(() => benchmarkMicrobialReferenceDevice(() => 1, 0)).toThrow(/1 to 9/);
    expect(() => benchmarkMicrobialReferenceDevice(() => 1, 10)).toThrow(/1 to 9/);
  });
});
