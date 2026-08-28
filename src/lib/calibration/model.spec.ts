import { describe, expect, it, vi } from 'vitest';
import { stableChecksum } from '../core';
import { recordTuningModelAttempt } from './attempts';
import { compileTuningSpec } from './compile';
import { evaluateTuningCandidate } from './evaluate';
import { createTuningPrompt, parseTuningProposal, requestTuningProposal, TuningModelRequestError } from './model';

const spec = compileTuningSpec({
  id: 'test/model-tuning', version: '1.0.0', title: 'Model test', purpose: 'Test the connector.',
  baseArtifact: { id: 'test/base', version: '1.0.0', hash: 'base' },
  evaluationProfile: { id: 'test/profile', version: '1.0.0', hash: 'profile' },
  parameters: [{ id: 'test/rate', label: 'Rate', description: 'A rate.', unit: 'ratio/day', authority: 'learnable', baseline: 1, minimum: 0, maximum: 2, step: 0.1 }],
  objectives: [{ id: 'survival', label: 'Survival', description: 'Survival.', unit: '%', direction: 'maximize' }],
  hardGateIds: ['finite-state'],
  suites: [
    { id: 'smoke', label: 'Smoke', purpose: 'Fast.', visibility: 'iterative', seeds: ['a'] },
    { id: 'calibration', label: 'Calibration', purpose: 'Visible.', visibility: 'iterative', seeds: ['a'] },
    { id: 'held-out', label: 'Held out', purpose: 'Unseen.', visibility: 'held-out', seeds: ['b'] },
    { id: 'release', label: 'Release', purpose: 'All.', visibility: 'held-out', seeds: ['a', 'b'] }
  ],
  limitations: ['Test.']
});
const candidate = { id: 'candidate/base', version: '1.0.0', spec: { id: spec.id, version: spec.version, hash: spec.hash }, parentCandidateHash: null, generator: { kind: 'human' as const, id: 'test', version: '1' }, hypothesis: 'Baseline.', changes: [], resolvedValues: { 'test/rate': 1 }, hash: 'candidate' };
const baseline = evaluateTuningCandidate(spec, candidate, 'calibration', (_, seed) => ({ seed, gates: [{ id: 'finite-state', passed: true, evidence: 'Finite.' }], metrics: [{ id: 'survival', value: 50 }], artifactHashes: [] }));

describe('OpenAI-compatible tuning connector', () => {
  it('parses strict JSON and rejects hallucinated fields', () => {
    expect(parseTuningProposal('{"hypothesis":"Test it.","changes":[{"parameterId":"test/rate","value":1.1,"unit":"ratio/day"}]}').changes).toHaveLength(1);
    expect(() => parseTuningProposal('{"hypothesis":"Test","changes":[],"promotion":"approved"}')).toThrow(/undeclared/);
    expect(() => parseTuningProposal('not json')).toThrow();
  });

  it('posts a strict JSON schema to LM Studio/OpenRouter-compatible endpoints', async () => {
    const messages = createTuningPrompt(spec, baseline);
    const fetcher = vi.fn(async (_input: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.response_format.type).toBe('json_schema');
      expect(body.response_format.json_schema.strict).toBe(true);
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
      return { ok: true, status: 200, text: async () => JSON.stringify({ model: 'google/gemma-4-26b-a4b', choices: [{ message: { content: '{"hypothesis":"Raise bounded growth slightly.","changes":[{"parameterId":"test/rate","value":1.1,"unit":"ratio/day"}]}' } }], usage: { prompt_tokens: 10, completion_tokens: 12, total_tokens: 22 } }) };
    });
    const ticks = [100, 125];
    const response = await requestTuningProposal({ providerId: 'lm-studio', endpointKind: 'local', baseUrl: 'http://localhost:1234/v1', modelId: 'google/gemma-4-26b-a4b' }, messages, fetcher, () => ticks.shift()!);
    expect(fetcher).toHaveBeenCalledWith('http://localhost:1234/v1/chat/completions', expect.any(Object));
    expect(response.elapsedMilliseconds).toBe(25);
    expect(response.usage.totalTokens).toBe(22);
    expect(response.promptHash).toBe(stableChecksum('tuning-model-prompt/v1', messages));
  });

  it('retains response identity and usage when malformed model text is rejected', async () => {
    const messages = createTuningPrompt(spec, baseline);
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        model: 'local/model',
        choices: [{ message: { content: 'I suggest increasing it.' } }],
        usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25, cost: 0 }
      })
    }));
    const endpoint = { providerId: 'lm-studio', endpointKind: 'local' as const, baseUrl: 'http://localhost:1234/v1', modelId: 'local/model' };
    let caught: TuningModelRequestError | undefined;
    try {
      await requestTuningProposal(endpoint, messages, fetcher, () => 10);
    } catch (error) {
      caught = error as TuningModelRequestError;
    }
    expect(caught).toBeInstanceOf(TuningModelRequestError);
    expect(caught?.observation.usage.totalTokens).toBe(25);
    expect(caught?.observation.responseHash).toMatch(/^tuning-model-response-raw\/v1-/);
    const attempt = recordTuningModelAttempt({
      endpoint,
      promptHash: stableChecksum('tuning-model-prompt/v1', messages),
      response: caught?.observation,
      schemaValid: false,
      candidateAccepted: false,
      rejectionReason: caught?.message,
      repeatedMistakes: ['non-json-or-schema-invalid-response']
    });
    expect(attempt.usage).toEqual({ promptTokens: 20, completionTokens: 5, totalTokens: 25, cost: 0 });
    expect(attempt.repeatedMistakes).toEqual(['non-json-or-schema-invalid-response']);
  });
});
