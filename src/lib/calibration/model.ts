import { stableChecksum } from '../core';
import type {
  CandidateEvaluationRecord,
  CompiledTuningSpec,
  OpenAICompatibleEndpoint,
  StructuredOutputMode,
  TuningCandidateProposal,
  TuningModelObservation,
  TuningModelResponse
} from './types';

export interface TuningPromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'text'>>;

export class TuningModelRequestError extends Error {
  constructor(
    message: string,
    readonly observation: TuningModelObservation,
    readonly rawContent?: string
  ) {
    super(message);
    this.name = 'TuningModelRequestError';
  }
}

function proposalShape(spec: CompiledTuningSpec) {
  const first = spec.parameters.find(({ authority }) => authority !== 'frozen');
  return {
    hypothesis: 'One concise, falsifiable reason this change may improve the declared vector.',
    changes: [{ parameterId: first?.id ?? 'none', value: first?.baseline ?? 0, unit: first?.unit ?? 'none' }]
  };
}

function proposalJsonSchema(spec: CompiledTuningSpec) {
  const editable = spec.parameters.filter(({ authority }) => authority !== 'frozen');
  return {
    type: 'object',
    additionalProperties: false,
    required: ['hypothesis', 'changes'],
    properties: {
      hypothesis: { type: 'string', minLength: 1 },
      changes: {
        type: 'array',
        minItems: 1,
        maxItems: Math.min(2, Math.max(1, editable.length)),
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['parameterId', 'value', 'unit'],
          properties: {
            parameterId: { enum: editable.map(({ id }) => id) },
            value: { type: 'number' },
            unit: { enum: [...new Set(editable.map(({ unit }) => unit))] }
          }
        }
      }
    }
  };
}

export function createTuningPrompt(
  spec: CompiledTuningSpec,
  baseline: CandidateEvaluationRecord
): TuningPromptMessage[] {
  const compactSpec = {
    id: spec.id,
    version: spec.version,
    hash: spec.hash,
    purpose: spec.purpose,
    parameters: spec.parameters,
    objectives: spec.objectives,
    hardGateIds: spec.hardGateIds,
    limitations: spec.limitations
  };
  const compactBaseline = {
    valid: baseline.valid,
    suite: baseline.suite,
    gates: baseline.gates.map(({ id, passed }) => ({ id, passed })),
    fitnessVector: baseline.fitnessVector.map(({ id, unit, direction, summary }) => ({ id, unit, direction, summary }))
  };
  return [
    {
      role: 'system',
      content: 'You propose one bounded simulation-parameter candidate. You are not a scientific authority and cannot edit code, provider facts, frozen values, bounds, units, gates, objectives or test seeds. Return JSON only. Prefer one or two changes with a clear causal hypothesis; never optimise a hidden scalar reward.'
    },
    {
      role: 'user',
      content: `TUNING SPEC\n${JSON.stringify(compactSpec)}\n\nBASELINE CALIBRATION RESULT\n${JSON.stringify(compactBaseline)}\n\nReturn exactly this shape and no additional keys:\n${JSON.stringify(proposalShape(spec))}`
    }
  ];
}

export function parseTuningProposal(content: string): TuningCandidateProposal {
  const trimmed = content.trim();
  const unfenced = trimmed.startsWith('```') ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '') : trimmed;
  let value: unknown;
  try {
    value = JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('Model response did not contain a JSON candidate proposal.');
    value = JSON.parse(unfenced.slice(start, end + 1));
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Model proposal must be a JSON object.');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !['hypothesis', 'changes'].includes(key))) throw new Error('Model proposal contains undeclared fields.');
  if (typeof record.hypothesis !== 'string' || !record.hypothesis.trim() || !Array.isArray(record.changes)) throw new Error('Model proposal requires a hypothesis and changes array.');
  const changes = record.changes.map((change) => {
    if (!change || typeof change !== 'object' || Array.isArray(change)) throw new Error('Each model-proposed change must be an object.');
    const item = change as Record<string, unknown>;
    if (Object.keys(item).some((key) => !['parameterId', 'value', 'unit'].includes(key)) || typeof item.parameterId !== 'string' || typeof item.value !== 'number' || typeof item.unit !== 'string') throw new Error('Each model-proposed change requires only parameterId, numeric value and unit.');
    return { parameterId: item.parameterId, value: item.value, unit: item.unit };
  });
  return { hypothesis: record.hypothesis, changes };
}

function endpointUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

export async function requestTuningProposal(
  endpoint: OpenAICompatibleEndpoint,
  messages: readonly TuningPromptMessage[],
  fetcher: FetchLike = fetch,
  now: () => number = () => performance.now(),
  responseMode: StructuredOutputMode = 'json-schema'
): Promise<TuningModelResponse> {
  if (!/^https?:\/\//.test(endpoint.baseUrl)) throw new Error('Model endpoint baseUrl must use http or https.');
  if (!endpoint.providerId.trim() || !endpoint.modelId.trim()) throw new Error('Model endpoint requires provider and model identity.');
  if (endpoint.maxTokens !== undefined && (!Number.isInteger(endpoint.maxTokens) || endpoint.maxTokens < 1)) {
    throw new Error('Model endpoint maxTokens must be a positive integer.');
  }
  const promptHash = stableChecksum('tuning-model-prompt/v1', messages);
  const started = now();
  const response = await fetcher(endpointUrl(endpoint.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {})
    },
    body: JSON.stringify({
      model: endpoint.modelId,
      messages,
      temperature: endpoint.temperature ?? 0,
      max_tokens: endpoint.maxTokens ?? 400,
      ...(endpoint.seed === undefined ? {} : { seed: endpoint.seed }),
      ...(endpoint.jsonMode === false || responseMode === 'text'
        ? {}
        : responseMode === 'json-object'
          ? { response_format: { type: 'json_object' } }
          : {
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'evolution_tuning_candidate',
                  strict: true,
                  schema: proposalJsonSchemaFromMessages(messages)
                }
              }
            })
    })
  });
  const raw = await response.text();
  const elapsedMilliseconds = Math.max(0, now() - started);
  const rawObservation: TuningModelObservation = {
    providerId: endpoint.providerId,
    endpointKind: endpoint.endpointKind,
    modelId: endpoint.modelId,
    responseMode,
    promptHash,
    responseHash: stableChecksum('tuning-model-response-raw/v1', raw),
    usage: {},
    elapsedMilliseconds
  };
  if (!response.ok) {
    throw new TuningModelRequestError(
      `Model endpoint returned HTTP ${response.status}: ${raw.slice(0, 300)}`,
      rawObservation
    );
  }
  let payload: {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new TuningModelRequestError('Model endpoint returned invalid JSON.', rawObservation);
  }
  const observation: TuningModelObservation = {
    ...rawObservation,
    ...(payload.model ? { returnedModelId: payload.model } : {}),
    usage: {
      ...(payload.usage?.prompt_tokens === undefined ? {} : { promptTokens: payload.usage.prompt_tokens }),
      ...(payload.usage?.completion_tokens === undefined ? {} : { completionTokens: payload.usage.completion_tokens }),
      ...(payload.usage?.total_tokens === undefined ? {} : { totalTokens: payload.usage.total_tokens }),
      ...(payload.usage?.cost === undefined ? {} : { cost: payload.usage.cost })
    }
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new TuningModelRequestError('Model endpoint did not return chat-completion text.', observation);
  }
  let proposal: TuningCandidateProposal;
  try {
    proposal = parseTuningProposal(content);
  } catch (error) {
    throw new TuningModelRequestError(
      error instanceof Error ? error.message : String(error),
      { ...observation, responseHash: stableChecksum('tuning-model-response-raw/v1', content) },
      content
    );
  }
  return {
    ...observation,
    responseHash: stableChecksum('tuning-model-response/v1', { content, proposal }),
    proposal,
  };
}


function proposalJsonSchemaFromMessages(messages: readonly TuningPromptMessage[]) {
  const user = messages.find(({ role }) => role === 'user')?.content ?? '';
  const marker = 'TUNING SPEC\n';
  const end = '\n\nBASELINE CALIBRATION RESULT';
  const startIndex = user.indexOf(marker);
  const endIndex = user.indexOf(end);
  if (startIndex < 0 || endIndex <= startIndex) {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['hypothesis', 'changes'],
      properties: {
        hypothesis: { type: 'string', minLength: 1 },
        changes: { type: 'array', minItems: 1, maxItems: 2 }
      }
    };
  }
  const compact = JSON.parse(user.slice(startIndex + marker.length, endIndex)) as Pick<CompiledTuningSpec, 'parameters'>;
  return proposalJsonSchema({ parameters: compact.parameters } as CompiledTuningSpec);
}
