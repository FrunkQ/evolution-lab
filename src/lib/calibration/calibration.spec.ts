import { describe, expect, it } from 'vitest';
import { compileTuningCandidate, compileTuningSpec } from './compile';
import { compareCandidateEvaluations, evaluateTuningCandidate } from './evaluate';

const definition = () => ({
  id: 'test/tuning',
  version: '1.0.0',
  title: 'Test tuning',
  purpose: 'Exercise the generic contract.',
  baseArtifact: { id: 'test/base', version: '1.0.0', hash: 'base-hash' },
  evaluationProfile: { id: 'test/profile', version: '1.0.0', hash: 'profile-hash' },
  parameters: [
    { id: 'test/rate', label: 'Rate', description: 'A bounded rate.', unit: 'ratio/day', authority: 'learnable' as const, baseline: 1, minimum: 0, maximum: 2, step: 0.1 },
    { id: 'provider/fact', label: 'Fact', description: 'Provider-owned fact.', unit: 'K', authority: 'frozen' as const, baseline: 280, minimum: 100, maximum: 500, step: 1 }
  ],
  objectives: [
    { id: 'survival', label: 'Survival', description: 'Retained function.', unit: '%', direction: 'maximize' as const },
    { id: 'cost', label: 'Cost', description: 'Stored cost.', unit: 'records', direction: 'minimize' as const }
  ],
  hardGateIds: ['finite-state'],
  suites: [
    { id: 'smoke' as const, label: 'Smoke', purpose: 'Fast.', visibility: 'iterative' as const, seeds: ['a'] },
    { id: 'calibration' as const, label: 'Calibration', purpose: 'Visible.', visibility: 'iterative' as const, seeds: ['a', 'b'] },
    { id: 'held-out' as const, label: 'Held out', purpose: 'Unseen.', visibility: 'held-out' as const, seeds: ['c'] },
    { id: 'release' as const, label: 'Release', purpose: 'All.', visibility: 'held-out' as const, seeds: ['a', 'b', 'c'] }
  ],
  limitations: ['Synthetic test only.']
});

const candidateDefinition = (spec: ReturnType<typeof compileTuningSpec>, changes: readonly { parameterId: string; value: number; unit: string }[] = [{ parameterId: 'test/rate', value: 1.2, unit: 'ratio/day' }]) => ({
  id: 'candidate/test',
  version: '1.0.0',
  spec: { id: spec.id, version: spec.version, hash: spec.hash },
  parentCandidateHash: null,
  generator: { kind: 'human' as const, id: 'test', version: '1' },
  hypothesis: 'A bounded change alters the vector.',
  changes
});

describe('deterministic tuning contracts', () => {
  it('compiles stable hashes and survives JSON round trips', () => {
    const first = compileTuningSpec(definition());
    const second = compileTuningSpec(JSON.parse(JSON.stringify(definition())));
    expect(first).toEqual(second);
    const candidate = compileTuningCandidate(first, candidateDefinition(first));
    expect(compileTuningCandidate(first, JSON.parse(JSON.stringify(candidateDefinition(first))))).toEqual(candidate);
  });

  it('rejects overlapping calibration seeds and invalid candidate changes', () => {
    const overlapping = definition();
    overlapping.suites[2].seeds = ['b'];
    expect(() => compileTuningSpec(overlapping)).toThrow(/overlap/);
    const spec = compileTuningSpec(definition());
    for (const [changes, message] of [
      [[{ parameterId: 'test/rate', value: 1, unit: 'ratio/day' }, { parameterId: 'test/rate', value: 1.1, unit: 'ratio/day' }], /Duplicate/],
      [[{ parameterId: 'unknown', value: 1, unit: 'ratio/day' }], /undeclared/],
      [[{ parameterId: 'test/rate', value: 3, unit: 'ratio/day' }], /between/],
      [[{ parameterId: 'test/rate', value: 1, unit: 'K' }], /must be ratio\/day/],
      [[{ parameterId: 'provider/fact', value: 300, unit: 'K' }], /frozen/]
    ] as const) {
      expect(() => compileTuningCandidate(spec, candidateDefinition(spec, changes))).toThrow(message);
    }
  });

  it('requires complete gate and metric evidence', () => {
    const spec = compileTuningSpec(definition());
    const candidate = compileTuningCandidate(spec, candidateDefinition(spec));
    expect(() => evaluateTuningCandidate(spec, candidate, 'smoke', (tested, seed) => ({
      seed,
      gates: [{ id: 'finite-state', passed: true, evidence: '' }],
      metrics: [{ id: 'survival', value: tested.resolvedValues['test/rate'] }],
      artifactHashes: []
    }))).toThrow(/missing metrics|evidence/);
  });

  it('never lets good metrics rescue a failed hard gate', () => {
    const spec = compileTuningSpec(definition());
    const candidate = compileTuningCandidate(spec, candidateDefinition(spec));
    const evaluation = evaluateTuningCandidate(spec, candidate, 'smoke', (_, seed) => ({
      seed,
      gates: [{ id: 'finite-state', passed: false, evidence: 'A non-finite value was observed.' }],
      metrics: [{ id: 'survival', value: 100 }, { id: 'cost', value: 0 }],
      artifactHashes: ['invalid-case']
    }));
    expect(evaluation.valid).toBe(false);
  });

  it('reports dominance, trade-offs and equivalence without a scalar reward', () => {
    const spec = compileTuningSpec(definition());
    const baseline = compileTuningCandidate(spec, candidateDefinition(spec, []));
    const candidate = compileTuningCandidate(spec, candidateDefinition(spec));
    const evaluate = (record: typeof candidate, survival: number, cost: number) => evaluateTuningCandidate(spec, record, 'smoke', (_, seed) => ({
      seed,
      gates: [{ id: 'finite-state', passed: true, evidence: 'Finite.' }],
      metrics: [{ id: 'survival', value: survival }, { id: 'cost', value: cost }],
      artifactHashes: []
    }));
    const base = evaluate(baseline, 50, 10);
    expect(compareCandidateEvaluations(base, evaluate(candidate, 60, 8)).relation).toBe('candidate-dominates');
    expect(compareCandidateEvaluations(base, evaluate(candidate, 60, 12)).relation).toBe('trade-off');
    expect(compareCandidateEvaluations(base, evaluate(candidate, 50, 10)).relation).toBe('equivalent');
  });
});
