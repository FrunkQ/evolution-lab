import { readFile } from 'node:fs/promises';
import {
  compileTuningCandidate,
  createTuningPrompt,
  recordTuningModelAttempt,
  requestTuningProposal,
  TuningModelRequestError
} from '../src/lib/calibration/index.ts';
import {
  assessMicrobialTuningCandidate,
  createMicrobialCandidateTemplate,
  createMicrobialTuningCandidate,
  evaluateMicrobialTuningCandidate,
  MICROBIAL_BASELINE_CANDIDATE,
  MICROBIAL_TUNING_SPEC
} from '../src/lib/analysis/microbialTuning.ts';
import { stableChecksum } from '../src/lib/core/index.ts';
import type {
  OpenAICompatibleEndpoint,
  TuningCandidateDefinition,
  TuningSuiteId
} from '../src/lib/calibration/index.ts';

const commands = ['template', 'baseline', 'evaluate', 'model'] as const;
type Command = (typeof commands)[number];

const output = (value: unknown) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
const suite = (value: string | undefined, fallback: TuningSuiteId): TuningSuiteId => {
  const selected = value ?? fallback;
  if (!['smoke', 'calibration', 'held-out', 'release'].includes(selected)) {
    throw new Error(`Unknown suite ${selected}.`);
  }
  return selected as TuningSuiteId;
};

async function readCandidate(path: string) {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as
    | TuningCandidateDefinition
    | { candidate: TuningCandidateDefinition };
  return compileTuningCandidate(
    MICROBIAL_TUNING_SPEC,
    'candidate' in parsed ? parsed.candidate : parsed
  );
}

function endpointFromEnvironment(): OpenAICompatibleEndpoint {
  return {
    providerId: process.env.EVOLUTION_TUNER_PROVIDER_ID ?? 'lm-studio',
    endpointKind: process.env.EVOLUTION_TUNER_ENDPOINT_KIND === 'remote' ? 'remote' : 'local',
    baseUrl: process.env.EVOLUTION_TUNER_BASE_URL ?? 'http://localhost:1234/v1',
    modelId: process.env.EVOLUTION_TUNER_MODEL ?? 'google/gemma-4-26b-a4b',
    ...(process.env.EVOLUTION_TUNER_API_KEY ? { apiKey: process.env.EVOLUTION_TUNER_API_KEY } : {}),
    temperature: 0,
    seed: 104729,
    jsonMode: true,
    maxTokens: Number(process.env.EVOLUTION_TUNER_MAX_TOKENS ?? 400)
  };
}

async function run(command: Command, args: string[]) {
  if (command === 'template') {
    output({ schemaVersion: 'evolution-tuning-template/0.1', tuningSpec: MICROBIAL_TUNING_SPEC, candidate: createMicrobialCandidateTemplate().candidate });
    return;
  }
  if (command === 'baseline') {
    const selectedSuite = suite(args[0], 'calibration');
    output({ candidate: MICROBIAL_BASELINE_CANDIDATE, evaluation: evaluateMicrobialTuningCandidate(MICROBIAL_BASELINE_CANDIDATE, selectedSuite) });
    return;
  }
  if (command === 'evaluate') {
    if (!args[0]) throw new Error('evaluate requires a candidate JSON file.');
    const candidate = await readCandidate(args[0]);
    const selectedSuite = suite(args[1], 'release');
    const baseline = evaluateMicrobialTuningCandidate(MICROBIAL_BASELINE_CANDIDATE, selectedSuite);
    const evaluation = evaluateMicrobialTuningCandidate(candidate, selectedSuite);
    const assessment = assessMicrobialTuningCandidate(candidate);
    output({ candidate, baseline, evaluation, assessment });
    return;
  }

  const endpoint = endpointFromEnvironment();
  const baseline = evaluateMicrobialTuningCandidate(MICROBIAL_BASELINE_CANDIDATE, 'calibration');
  const messages = createTuningPrompt(MICROBIAL_TUNING_SPEC, baseline);
  const promptHash = stableChecksum('tuning-model-prompt/v1', messages);
  const started = performance.now();
  let response;
  try {
    response = await requestTuningProposal(endpoint, messages);
  } catch (error) {
    const observation = error instanceof TuningModelRequestError ? error.observation : undefined;
    const attempt = recordTuningModelAttempt({
      endpoint,
      promptHash,
      ...(observation ? { response: observation } : {}),
      schemaValid: false,
      candidateAccepted: false,
      rejectionReason: error instanceof Error ? error.message : String(error),
      repeatedMistakes: ['non-json-or-schema-invalid-response'],
      elapsedMilliseconds: performance.now() - started
    });
    output({ ok: false, attempt });
    process.exitCode = 2;
    return;
  }
  let candidate;
  try {
    candidate = createMicrobialTuningCandidate(
      response.proposal.changes,
      response.proposal.hypothesis,
      {
        kind: endpoint.endpointKind === 'local' ? 'local-llm' : 'remote-llm',
        id: `${endpoint.providerId}/${endpoint.modelId}`.toLowerCase().replace(/[^a-z0-9/-]+/g, '-'),
        version: 'openai-chat-completions/1'
      },
      `candidate/model/${endpoint.modelId}`.toLowerCase().replace(/[^a-z0-9/-]+/g, '-')
    );
  } catch (error) {
    const attempt = recordTuningModelAttempt({
      endpoint,
      promptHash,
      response,
      schemaValid: true,
      candidateAccepted: false,
      rejectionReason: error instanceof Error ? error.message : String(error)
    });
    output({ ok: false, proposal: response.proposal, attempt });
    process.exitCode = 2;
    return;
  }
  const assessment = assessMicrobialTuningCandidate(candidate);
  const attempt = recordTuningModelAttempt({
    endpoint,
    promptHash,
    response,
    assessment,
    schemaValid: true,
    candidateAccepted: true
  });
  output({ attempt, proposal: response.proposal, assessment });
}

const command = process.argv[2] as Command | undefined;
if (!command || !commands.includes(command)) {
  output({
    error: 'Usage: npm run tune -- <template|baseline [suite]|evaluate file [suite]|model>',
    environment: [
      'EVOLUTION_TUNER_BASE_URL',
      'EVOLUTION_TUNER_MODEL',
      'EVOLUTION_TUNER_PROVIDER_ID',
      'EVOLUTION_TUNER_ENDPOINT_KIND',
      'EVOLUTION_TUNER_API_KEY (read only; never printed)'
    ]
  });
  process.exitCode = 1;
} else {
  run(command, process.argv.slice(3)).catch((error: unknown) => {
    output({ ok: false, error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  });
}
