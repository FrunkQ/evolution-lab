import { describe, expect, it } from 'vitest';
import { compileEvaluationProfile, runEvaluationGates, thresholdValue } from './runner';
import type { EvaluationProfileDefinition } from './types';

const definition: EvaluationProfileDefinition = {
  id: 'test/paired-response',
  version: '0.1.0',
  title: 'Paired response test',
  comparisonKind: 'checkpoint-control-shadow',
  thresholds: [
    { id: 'recovery-floor', label: 'Recovery floor', value: 0.9, unit: 'ratio', description: 'Required retained output.' }
  ],
  gates: [
    { id: 'finite-state', version: '1', scope: 'universal', question: 'Finite?', summary: 'Numbers remain finite.', availability: 'implemented' },
    { id: 'domain-balance', version: '1', scope: 'profile', question: 'Balanced?', summary: 'Domain accounting closes.', availability: 'unavailable' }
  ],
  metricIds: ['retained-output'],
  questionIds: ['recovery'],
  limitationIds: ['no-domain-ledger']
};

describe('evaluation profile compiler and gate runner', () => {
  it('compiles to a stable hash and resolves typed thresholds', () => {
    const first = compileEvaluationProfile(definition);
    const second = compileEvaluationProfile(definition);
    expect(first).toEqual(second);
    expect(first.hash).toMatch(/^evaluation-profile\/v1-/);
    expect(thresholdValue(first, 'recovery-floor')).toBe(0.9);
  });

  it('reports implemented and unavailable gates without hiding either', () => {
    const report = runEvaluationGates(compileEvaluationProfile(definition), [
      { gateId: 'finite-state', passed: true, evidence: 'All stored values are finite.' }
    ]);
    expect(report).toMatchObject({ valid: true, passed: 1, failed: 0, unavailable: 1 });
    expect(report.results.map(({ id, scope, status }) => ({ id, scope, status }))).toEqual([
      { id: 'finite-state', scope: 'universal', status: 'pass' },
      { id: 'domain-balance', scope: 'profile', status: 'not-checked' }
    ]);
  });

  it('treats a missing implemented observation as invalid', () => {
    const report = runEvaluationGates(compileEvaluationProfile(definition), []);
    expect(report.valid).toBe(false);
    expect(report.results[0]).toMatchObject({ status: 'fail', evidence: expect.stringContaining('did not emit') });
  });

  it('rejects duplicate profile ids and undeclared observations', () => {
    expect(() => compileEvaluationProfile({ ...definition, metricIds: ['same', 'same'] })).toThrow(/Duplicate metric/);
    expect(() => runEvaluationGates(compileEvaluationProfile(definition), [{ gateId: 'unknown', passed: true }])).toThrow(/not declared/);
  });
});
