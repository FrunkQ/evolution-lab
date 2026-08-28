import { stableChecksum } from '../core';
import type {
  OpenAICompatibleEndpoint,
  TuningCandidateAssessment,
  TuningModelAttemptRecord,
  TuningModelObservation
} from './types';

export interface TuningModelAttemptInput {
  endpoint: OpenAICompatibleEndpoint;
  promptHash: string;
  response?: TuningModelObservation;
  assessment?: TuningCandidateAssessment;
  attemptNumber?: number;
  responseMode?: TuningModelObservation['responseMode'];
  previousAttemptEvidenceHash?: string;
  schemaValid: boolean;
  candidateAccepted: boolean;
  rejectionReason?: string;
  repeatedMistakes?: readonly string[];
  elapsedMilliseconds?: number;
}

export function recordTuningModelAttempt(input: TuningModelAttemptInput): TuningModelAttemptRecord {
  if (!input.endpoint.providerId.trim() || !input.endpoint.modelId.trim() || !input.promptHash.trim()) {
    throw new Error('Model attempt requires provider, model and prompt identity.');
  }
  if (!input.schemaValid && !input.rejectionReason?.trim()) {
    throw new Error('Rejected model attempts require an explicit reason.');
  }
  if (input.candidateAccepted && !input.assessment) {
    throw new Error('Accepted model attempts require candidate evaluation evidence.');
  }
  const attemptNumber = input.attemptNumber ?? 1;
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error('Model attempt number must be a positive integer.');
  }
  if (input.repeatedMistakes?.some((mistake) => !mistake.trim())) {
    throw new Error('Repeated-mistake tags must not be blank.');
  }
  const assessment = input.assessment;
  const repeatedMistakes = [...new Set(input.repeatedMistakes ?? [])].sort();
  const canonicalEvidence = {
    attemptNumber,
    providerId: input.endpoint.providerId,
    endpointKind: input.endpoint.endpointKind,
    requestedModelId: input.endpoint.modelId,
    returnedModelId: input.response?.returnedModelId,
    responseMode: input.response?.responseMode ?? input.responseMode ?? 'json-schema',
    promptHash: input.promptHash,
    previousAttemptEvidenceHash: input.previousAttemptEvidenceHash,
    responseHash: input.response?.responseHash,
    schemaValid: input.schemaValid,
    candidateAccepted: input.candidateAccepted,
    rejectionReason: input.rejectionReason,
    repeatedMistakes,
    candidateHash: assessment?.candidate.hash,
    calibrationEvaluationHash: assessment?.calibration.hash,
    heldOutEvaluationHash: assessment?.heldOut.hash,
    calibrationRelation: assessment?.calibrationComparison.relation,
    heldOutRelation: assessment?.heldOutComparison.relation,
    hardGatesPassed: assessment
      ? assessment.calibration.valid && assessment.heldOut.valid
      : undefined
  };
  return {
    schemaVersion: 'evolution-model-attempt/0.2',
    ...canonicalEvidence,
    usage: input.response?.usage ?? {},
    elapsedMilliseconds: input.response?.elapsedMilliseconds ?? input.elapsedMilliseconds ?? 0,
    canonicalEvidenceHash: stableChecksum('tuning-model-attempt-evidence/v1', canonicalEvidence)
  };
}
