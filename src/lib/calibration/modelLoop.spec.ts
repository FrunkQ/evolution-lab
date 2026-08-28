import { describe, expect, it, vi } from 'vitest';
import { compileTuningCandidate, compileTuningSpec } from './compile';
import { compareCandidateEvaluations, evaluateTuningCandidate } from './evaluate';
import { createTuningPrompt } from './model';
import { runTuningModelLoop } from './modelLoop';

const spec = compileTuningSpec({
  id: 'test/model-loop',
  version: '1.0.0',
  title: 'Model loop',
  purpose: 'Test bounded correction and evaluation feedback.',
  baseArtifact: { id: 'test/base', version: '1.0.0', hash: 'base' },
  evaluationProfile: { id: 'test/profile', version: '1.0.0', hash: 'profile' },
  parameters: [
    { id: 'test/rate', label: 'Rate', description: 'A bounded rate.', unit: 'ratio/day', authority: 'learnable', baseline: 1, minimum: 0.5, maximum: 1.5, step: 0.1 }
  ],
  objectives: [
    { id: 'retained-function', label: 'Retained function', description: 'A synthetic response.', unit: '%', direction: 'maximize' }
  ],
  hardGateIds: ['finite-state'],
  suites: [
    { id: 'smoke', label: 'Smoke', purpose: 'Fast.', visibility: 'iterative', seeds: ['a'] },
    { id: 'calibration', label: 'Calibration', purpose: 'Working evidence.', visibility: 'iterative', seeds: ['a'] },
    { id: 'held-out', label: 'Held out', purpose: 'Unseen evidence.', visibility: 'held-out', seeds: ['b'] },
    { id: 'release', label: 'Release', purpose: 'All evidence.', visibility: 'held-out', seeds: ['a', 'b'] }
  ],
  limitations: ['Synthetic fixture.']
});

const baselineCandidate = compileTuningCandidate(spec, {
  id: 'candidate/test/baseline',
  version: '1.0.0',
  spec: { id: spec.id, version: spec.version, hash: spec.hash },
  parentCandidateHash: null,
  generator: { kind: 'human', id: 'test/baseline', version: '1.0.0' },
  hypothesis: 'Baseline.',
  changes: []
});

function evaluate(candidate: typeof baselineCandidate, suite: 'calibration' | 'held-out') {
  return evaluateTuningCandidate(spec, candidate, suite, (tested, seed) => ({
    seed,
    gates: [{ id: 'finite-state', passed: true, evidence: 'Finite.' }],
    metrics: [{ id: 'retained-function', value: tested.resolvedValues['test/rate'] * 50 }],
    artifactHashes: [`artifact/${seed}/${tested.hash}`]
  }));
}

const baselineCalibration = evaluate(baselineCandidate, 'calibration');
const baselineHeldOut = evaluate(baselineCandidate, 'held-out');
const messages = createTuningPrompt(spec, baselineCalibration);

function assessor(proposal: { hypothesis: string; changes: readonly { parameterId: string; value: number; unit: string }[] }, attemptNumber: number) {
  const candidate = compileTuningCandidate(spec, {
    id: `candidate/test/attempt-${attemptNumber}`,
    version: '1.0.0',
    spec: { id: spec.id, version: spec.version, hash: spec.hash },
    parentCandidateHash: null,
    generator: { kind: 'local-llm', id: 'test/model', version: '1.0.0' },
    hypothesis: proposal.hypothesis,
    changes: proposal.changes
  });
  const calibration = evaluate(candidate, 'calibration');
  const heldOut = evaluate(candidate, 'held-out');
  return {
    candidate,
    calibration,
    heldOut,
    calibrationComparison: compareCandidateEvaluations(baselineCalibration, calibration),
    heldOutComparison: compareCandidateEvaluations(baselineHeldOut, heldOut)
  };
}

describe('bounded tuning model loop', () => {
  it('falls back output mode, feeds back the exact rejection and chains attempt evidence', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const replies = [
      { model: 'local/model', choices: [{ message: { content: 'I would increase it.' } }], usage: { total_tokens: 12 } },
      { model: 'local/model', choices: [{ message: { content: '{"hypothesis":"Increase the bounded response.","changes":[{"parameterId":"test/rate","value":1.1,"unit":"ratio/day"}]}' } }], usage: { total_tokens: 18 } }
    ];
    const fetcher = vi.fn(async (_input: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return { ok: true, status: 200, text: async () => JSON.stringify(replies.shift()) };
    });
    const result = await runTuningModelLoop(
      spec,
      { providerId: 'lm-studio', endpointKind: 'local', baseUrl: 'http://localhost:1234/v1', modelId: 'local/model' },
      messages,
      (proposal, context) => assessor(proposal, context.attemptNumber),
      { maxAttempts: 2, fetcher, now: () => 0 }
    );

    expect((bodies[0].response_format as { type: string }).type).toBe('json_schema');
    expect((bodies[1].response_format as { type: string }).type).toBe('json_object');
    expect(JSON.stringify(bodies[1].messages)).toContain('Model response did not contain a JSON candidate proposal.');
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].candidateAccepted).toBe(false);
    expect(result.attempts[1].candidateAccepted).toBe(true);
    expect(result.attempts[1].previousAttemptEvidenceHash).toBe(result.attempts[0].canonicalEvidenceHash);
    expect(result.accepted).toHaveLength(1);
    expect(result.exhaustedWithoutValidCandidate).toBe(false);
  });

  it('uses calibration feedback for revision while withholding held-out values', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const replies = [1.1, 1.2].map((value) => ({
      model: 'local/model',
      choices: [{ message: { content: JSON.stringify({ hypothesis: `Try ${value}.`, changes: [{ parameterId: 'test/rate', value, unit: 'ratio/day' }] }) } }]
    }));
    const fetcher = vi.fn(async (_input: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return { ok: true, status: 200, text: async () => JSON.stringify(replies.shift()) };
    });
    const result = await runTuningModelLoop(
      spec,
      { providerId: 'lm-studio', endpointKind: 'local', baseUrl: 'http://localhost:1234/v1', modelId: 'local/model' },
      messages,
      (proposal, context) => assessor(proposal, context.attemptNumber),
      { maxAttempts: 2, fetcher, now: () => 0 }
    );

    const revisionPrompt = JSON.stringify(bodies[1].messages);
    expect(revisionPrompt).toContain('calibration-seeds-only; held-out results deliberately withheld');
    expect(revisionPrompt).not.toContain(baselineHeldOut.hash);
    expect(result.accepted).toHaveLength(2);
    expect(revisionPrompt).not.toContain(result.accepted[0].heldOut.hash);
    expect(revisionPrompt).not.toContain('heldOutComparison');
    expect(result.attempts.every(({ responseMode }) => responseMode === 'json-schema')).toBe(true);
    expect(result.attempts[1].repeatedMistakes).toContain('repeated-parameter-direction');
  });

  it('exhausts json-schema, json-object and text modes without treating failure as a candidate', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetcher = vi.fn(async (_input: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ model: 'local/model', choices: [{ message: { content: 'Still not JSON.' } }] })
      };
    });
    const result = await runTuningModelLoop(
      spec,
      { providerId: 'lm-studio', endpointKind: 'local', baseUrl: 'http://localhost:1234/v1', modelId: 'local/model' },
      messages,
      (proposal, context) => assessor(proposal, context.attemptNumber),
      { maxAttempts: 3, fetcher, now: () => 0 }
    );

    expect((bodies[0].response_format as { type: string }).type).toBe('json_schema');
    expect((bodies[1].response_format as { type: string }).type).toBe('json_object');
    expect(bodies[2]).not.toHaveProperty('response_format');
    expect(result.accepted).toHaveLength(0);
    expect(result.exhaustedWithoutValidCandidate).toBe(true);
    expect(result.attempts[0].repeatedMistakes).toEqual([]);
    expect(result.attempts[1].repeatedMistakes).toEqual(['non-json-or-schema-invalid-response']);
  });
});
