import { readFile } from 'node:fs/promises';
import {
  compileTuningCandidate,
  createTuningPrompt,
  runTuningModelLoop
} from '../src/lib/calibration/index.ts';
import {
  assessMicrobialTuningCandidate,
  createMicrobialCandidateTemplate,
  createMicrobialTuningCandidate,
  evaluateMicrobialTuningCandidate,
  MICROBIAL_BASELINE_CANDIDATE,
  MICROBIAL_TUNING_SPEC
} from '../src/lib/analysis/microbialTuning.ts';
import type {
  OpenAICompatibleEndpoint,
  StructuredOutputMode,
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
  const providerId = process.env.EVOLUTION_TUNER_PROVIDER_ID ?? 'lm-studio';
  const defaultOutputModes = providerId === 'lm-studio' ? 'json-schema,text' : 'json-schema,json-object,text';
  const outputModes = (process.env.EVOLUTION_TUNER_OUTPUT_MODES ?? defaultOutputModes)
    .split(',')
    .map((mode) => mode.trim())
    .filter(Boolean) as StructuredOutputMode[];
  return {
    providerId,
    endpointKind: process.env.EVOLUTION_TUNER_ENDPOINT_KIND === 'remote' ? 'remote' : 'local',
    baseUrl: process.env.EVOLUTION_TUNER_BASE_URL ?? 'http://localhost:1234/v1',
    modelId: process.env.EVOLUTION_TUNER_MODEL ?? 'google/gemma-4-26b-a4b',
    ...(process.env.EVOLUTION_TUNER_API_KEY ? { apiKey: process.env.EVOLUTION_TUNER_API_KEY } : {}),
    temperature: 0,
    seed: 104729,
    jsonMode: true,
    maxTokens: Number(process.env.EVOLUTION_TUNER_MAX_TOKENS ?? 900),
    outputModes
  };
}

function summarizeAssessment(assessment: Awaited<ReturnType<typeof assessMicrobialTuningCandidate>>) {
  return {
    candidate: assessment.candidate,
    calibration: {
      evaluationHash: assessment.calibration.hash,
      valid: assessment.calibration.valid,
      relation: assessment.calibrationComparison.relation,
      deltas: assessment.calibrationComparison.deltas
    },
    heldOut: {
      evaluationHash: assessment.heldOut.hash,
      valid: assessment.heldOut.valid,
      relation: assessment.heldOutComparison.relation,
      deltas: assessment.heldOutComparison.deltas
    }
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
  const requestedAttempts = Number(args[0] ?? process.env.EVOLUTION_TUNER_MAX_ATTEMPTS ?? 3);
  const result = await runTuningModelLoop(
    MICROBIAL_TUNING_SPEC,
    endpoint,
    messages,
    (proposal, context) => {
      const candidate = createMicrobialTuningCandidate(
        proposal.changes,
        proposal.hypothesis,
        {
          kind: endpoint.endpointKind === 'local' ? 'local-llm' : 'remote-llm',
          id: `${endpoint.providerId}/${endpoint.modelId}`.toLowerCase().replace(/[^a-z0-9/-]+/g, '-'),
          version: 'openai-chat-completions/1'
        },
        `candidate/model/${endpoint.modelId}/attempt-${context.attemptNumber}`.toLowerCase().replace(/[^a-z0-9/-]+/g, '-')
      );
      const assessment = assessMicrobialTuningCandidate(candidate);
      return assessment;
    },
    { maxAttempts: requestedAttempts }
  );
  output({
    schemaVersion: result.schemaVersion,
    model: result.model,
    maxAttempts: result.maxAttempts,
    exhaustedWithoutValidCandidate: result.exhaustedWithoutValidCandidate,
    attempts: result.attempts,
    accepted: result.accepted.map(summarizeAssessment)
  });
  if (result.exhaustedWithoutValidCandidate) process.exitCode = 2;
}

const command = process.argv[2] as Command | undefined;
if (!command || !commands.includes(command)) {
  output({
    error: 'Usage: npm run tune -- <template|baseline [suite]|evaluate file [suite]|model [maxAttempts]>',
    environment: [
      'EVOLUTION_TUNER_BASE_URL',
      'EVOLUTION_TUNER_MODEL',
      'EVOLUTION_TUNER_PROVIDER_ID',
      'EVOLUTION_TUNER_ENDPOINT_KIND',
      'EVOLUTION_TUNER_API_KEY (read only; never printed)',
      'EVOLUTION_TUNER_OUTPUT_MODES (json-schema,json-object,text)',
      'EVOLUTION_TUNER_MAX_TOKENS',
      'EVOLUTION_TUNER_MAX_ATTEMPTS (1-6)'
    ]
  });
  process.exitCode = 1;
} else {
  run(command, process.argv.slice(3)).catch((error: unknown) => {
    output({ ok: false, error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  });
}
