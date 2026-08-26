import { describe, expect, it } from 'vitest';
import { EXPERIMENTS } from '../experiments';
import { createMicrobialReferenceQualification, MICROBIAL_QUALIFICATION_SEEDS, MICROBIAL_REFERENCE_QUALIFICATION_SUMMARY } from './microbialQualification';

describe('microbial reference qualification', () => {
  it('binds the physical input, reference run, forks, evaluation family and seed suite into one deterministic report', () => {
    const first = createMicrobialReferenceQualification();
    const second = createMicrobialReferenceQualification();

    expect(first).toEqual(second);
    expect(first).toMatchObject({ valid: true, passed: 10, failed: 0 });
    expect(first.hash).toMatch(/^experiment-qualification\/v1-/);
    expect(first.seeds).toEqual(MICROBIAL_QUALIFICATION_SEEDS);
    expect(first.checks.every(({ evidence }) => evidence.length > 0)).toBe(true);
    expect({
      id: first.id,
      version: first.version,
      hash: first.hash,
      experimentId: first.experiment.id,
      valid: first.valid,
      passed: first.passed,
      failed: first.failed,
      seedCount: first.seeds.length,
      claimLevel: first.claimLevel,
      limitations: first.limitations,
      workload: {
        budgetHash: first.artifacts.find(({ id }) => id === 'performance/browser-reference-history')?.hash,
        storedSnapshots: 361,
        peakProcessedNodes: 4,
        processedNodeTicks: 1444,
        historyCharacters: 519076,
        limitsPassed: 6,
        limitsTotal: 6
      }
    }).toEqual(MICROBIAL_REFERENCE_QUALIFICATION_SUMMARY);
  }, 15_000);

  it('fails visibly if a promoted checkpoint no longer reproduces', () => {
    const experiment = {
      ...EXPERIMENTS[0],
      checkpoints: EXPERIMENTS[0].checkpoints.map((checkpoint, index) =>
        index === 0 ? { ...checkpoint, expectedHash: 'evolution-checkpoint-v1-tampered' } : checkpoint
      )
    };
    const report = createMicrobialReferenceQualification(experiment);
    expect(report.valid).toBe(false);
    expect(report.checks.find(({ id }) => id === 'checkpoint/reference-hashes')).toMatchObject({
      passed: false,
      evidence: expect.stringContaining('D24')
    });
  });

  it('keeps scientific limitations outside the framework pass/fail claim', () => {
    const report = createMicrobialReferenceQualification();
    expect(report.claimLevel).toContain('does not validate the biology');
    expect(report.limitations).toEqual(expect.arrayContaining([
      expect.stringContaining('conservation'),
      expect.stringContaining('five named seeds')
    ]));
  });
});