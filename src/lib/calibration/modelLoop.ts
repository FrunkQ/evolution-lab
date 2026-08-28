import { stableChecksum } from '../core';
import { recordTuningModelAttempt } from './attempts';
import {
  requestTuningProposal,
  TuningModelRequestError,
  type FetchLike,
  type TuningPromptMessage
} from './model';
import type {
  CompiledTuningSpec,
  OpenAICompatibleEndpoint,
  StructuredOutputMode,
  TuningCandidateAssessment,
  TuningCandidateProposal,
  TuningModelAttemptRecord,
  TuningModelLoopResult,
  TuningModelResponse
} from './types';

export interface TuningModelLoopOptions {
  maxAttempts?: number;
  fetcher?: FetchLike;
  now?: () => number;
}

export interface TuningModelProposalContext {
  attemptNumber: number;
  response: TuningModelResponse;
}

export type AssessTuningModelProposal = (
  proposal: TuningCandidateProposal,
  context: TuningModelProposalContext
) => TuningCandidateAssessment | Promise<TuningCandidateAssessment>;

const DEFAULT_OUTPUT_MODES: readonly StructuredOutputMode[] = ['json-schema', 'json-object', 'text'];

function validateLoopOptions(endpoint: OpenAICompatibleEndpoint, options: TuningModelLoopOptions) {
  const maxAttempts = options.maxAttempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 6) {
    throw new Error('Model loop maxAttempts must be an integer between 1 and 6.');
  }
  const modes = endpoint.outputModes ?? DEFAULT_OUTPUT_MODES;
  if (!modes.length || modes.some((mode) => !DEFAULT_OUTPUT_MODES.includes(mode))) {
    throw new Error('Model loop requires one or more supported output modes.');
  }
  return { maxAttempts, modes };
}

function mistakeTag(message: string, phase: 'request' | 'candidate'): string {
  const lower = message.toLowerCase();
  if (phase === 'candidate') return 'candidate-contract-rejection';
  if (lower.includes('http') && (lower.includes('response_format') || lower.includes('json'))) {
    return 'unsupported-structured-output-mode';
  }
  if (lower.includes('json') || lower.includes('undeclared fields')) {
    return 'non-json-or-schema-invalid-response';
  }
  return 'model-request-failure';
}

function correctionMessages(
  base: readonly TuningPromptMessage[],
  previousOutput: string | undefined,
  feedback: string
): TuningPromptMessage[] {
  return [
    ...base,
    ...(previousOutput ? [{ role: 'assistant' as const, content: previousOutput.slice(0, 8_000) }] : []),
    {
      role: 'user',
      content: `LOCAL REVIEW OF THE PREVIOUS ATTEMPT\n${feedback}\n\nThe previous attempt was not promoted and changed no simulation state. Return one revised candidate as JSON only, using exactly the original declared shape. Do not mention this review, add fields, alter frozen facts or reveal reasoning outside the hypothesis.`
    }
  ];
}

function calibrationFeedback(assessment: TuningCandidateAssessment): string {
  return JSON.stringify({
    scope: 'calibration-seeds-only; held-out results deliberately withheld',
    hardGatesPassed: assessment.calibration.valid,
    relationToBaseline: assessment.calibrationComparison.relation,
    deltas: assessment.calibrationComparison.deltas.map((delta) => ({
      objectiveId: delta.objectiveId,
      direction: delta.direction,
      unit: delta.unit,
      delta: delta.delta,
      preferred: delta.preferred
    }))
  });
}

export async function runTuningModelLoop(
  spec: CompiledTuningSpec,
  endpoint: OpenAICompatibleEndpoint,
  initialMessages: readonly TuningPromptMessage[],
  assessProposal: AssessTuningModelProposal,
  options: TuningModelLoopOptions = {}
): Promise<TuningModelLoopResult> {
  const { maxAttempts, modes } = validateLoopOptions(endpoint, options);
  const attempts: TuningModelAttemptRecord[] = [];
  const accepted: TuningCandidateAssessment[] = [];
  const seenMistakes = new Set<string>();
  const seenCandidateHashes = new Set<string>();
  const seenStrategySignatures = new Set<string>();
  let messages = [...initialMessages];
  let modeIndex = 0;
  let previousAttemptEvidenceHash: string | undefined;

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    const responseMode = modes[Math.min(modeIndex, modes.length - 1)];
    const promptHash = stableChecksum('tuning-model-prompt/v1', messages);
    let response: TuningModelResponse;
    try {
      response = await requestTuningProposal(
        endpoint,
        messages,
        options.fetcher,
        options.now,
        responseMode
      );
    } catch (error) {
      const observation = error instanceof TuningModelRequestError ? error.observation : undefined;
      const reason = error instanceof Error ? error.message : String(error);
      const tag = mistakeTag(reason, 'request');
      const attempt = recordTuningModelAttempt({
        endpoint,
        promptHash,
        ...(observation ? { response: observation } : {}),
        attemptNumber,
        responseMode,
        previousAttemptEvidenceHash,
        schemaValid: false,
        candidateAccepted: false,
        rejectionReason: reason,
        repeatedMistakes: seenMistakes.has(tag) ? [tag] : [],
        elapsedMilliseconds: observation?.elapsedMilliseconds ?? 0
      });
      attempts.push(attempt);
      previousAttemptEvidenceHash = attempt.canonicalEvidenceHash;
      seenMistakes.add(tag);
      modeIndex = Math.min(modeIndex + 1, modes.length - 1);
      messages = correctionMessages(initialMessages, error instanceof TuningModelRequestError ? error.rawContent : undefined, reason);
      continue;
    }

    let assessment: TuningCandidateAssessment;
    try {
      assessment = await assessProposal(response.proposal, { attemptNumber, response });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const tag = mistakeTag(reason, 'candidate');
      const attempt = recordTuningModelAttempt({
        endpoint,
        promptHash,
        response,
        attemptNumber,
        responseMode,
        previousAttemptEvidenceHash,
        schemaValid: true,
        candidateAccepted: false,
        rejectionReason: reason,
        repeatedMistakes: seenMistakes.has(tag) ? [tag] : []
      });
      attempts.push(attempt);
      previousAttemptEvidenceHash = attempt.canonicalEvidenceHash;
      seenMistakes.add(tag);
      messages = correctionMessages(initialMessages, JSON.stringify(response.proposal), reason);
      continue;
    }

    const strategySignature = assessment.candidate.changes
      .map((change) => {
        const baseline = spec.parameters.find(({ id }) => id === change.parameterId)?.baseline ?? change.value;
        return `${change.parameterId}:${Math.sign(change.value - baseline)}`;
      })
      .sort()
      .join('|');
    const repeatedMistakes = [
      ...(seenCandidateHashes.has(assessment.candidate.hash) ? ['repeated-candidate-hash'] : []),
      ...(strategySignature && seenStrategySignatures.has(strategySignature) ? ['repeated-parameter-direction'] : [])
    ];
    seenCandidateHashes.add(assessment.candidate.hash);
    if (strategySignature) seenStrategySignatures.add(strategySignature);
    const attempt = recordTuningModelAttempt({
      endpoint,
      promptHash,
      response,
      assessment,
      attemptNumber,
      responseMode,
      previousAttemptEvidenceHash,
      schemaValid: true,
      candidateAccepted: true,
      repeatedMistakes
    });
    attempts.push(attempt);
    accepted.push(assessment);
    previousAttemptEvidenceHash = attempt.canonicalEvidenceHash;
    messages = correctionMessages(initialMessages, JSON.stringify(response.proposal), calibrationFeedback(assessment));
  }

  return {
    schemaVersion: 'evolution-model-loop/0.1',
    spec: { id: spec.id, version: spec.version, hash: spec.hash },
    model: {
      providerId: endpoint.providerId,
      endpointKind: endpoint.endpointKind,
      requestedModelId: endpoint.modelId
    },
    maxAttempts,
    attempts,
    accepted,
    exhaustedWithoutValidCandidate: accepted.length === 0
  };
}
