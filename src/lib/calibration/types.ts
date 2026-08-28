export type ParameterAuthority = 'learnable' | 'conditionally-learnable' | 'frozen';
export type TuningObjectiveDirection = 'maximize' | 'minimize';
export type TuningSuiteId = 'smoke' | 'calibration' | 'held-out' | 'release';

export interface TuningParameterDefinition {
  id: string;
  label: string;
  description: string;
  unit: string;
  authority: ParameterAuthority;
  baseline: number;
  minimum: number;
  maximum: number;
  step: number;
  condition?: string;
}

export interface TuningObjectiveDefinition {
  id: string;
  label: string;
  description: string;
  unit: string;
  direction: TuningObjectiveDirection;
}

export interface TuningSuiteDefinition {
  id: TuningSuiteId;
  label: string;
  purpose: string;
  visibility: 'iterative' | 'held-out';
  seeds: readonly string[];
}

export interface TuningArtifactReference {
  id: string;
  version: string;
  hash: string;
}

export interface TuningSpecDefinition {
  id: string;
  version: string;
  title: string;
  purpose: string;
  baseArtifact: TuningArtifactReference;
  evaluationProfile: TuningArtifactReference;
  parameters: readonly TuningParameterDefinition[];
  objectives: readonly TuningObjectiveDefinition[];
  hardGateIds: readonly string[];
  suites: readonly TuningSuiteDefinition[];
  limitations: readonly string[];
}

export interface CompiledTuningSpec extends TuningSpecDefinition {
  hash: string;
}

export interface TuningParameterChange {
  parameterId: string;
  value: number;
  unit: string;
}

export interface TuningCandidateGenerator {
  kind: 'human' | 'optimizer' | 'local-llm' | 'remote-llm';
  id: string;
  version: string;
}

export interface TuningCandidateDefinition {
  id: string;
  version: string;
  spec: TuningArtifactReference;
  parentCandidateHash: string | null;
  generator: TuningCandidateGenerator;
  hypothesis: string;
  changes: readonly TuningParameterChange[];
}

export interface TuningCandidateRecord extends TuningCandidateDefinition {
  resolvedValues: Readonly<Record<string, number>>;
  hash: string;
}

export interface TuningGateObservation {
  id: string;
  passed: boolean;
  evidence: string;
}

export interface TuningMetricObservation {
  id: string;
  value: number;
}

export interface TuningCaseResult {
  seed: string;
  gates: readonly TuningGateObservation[];
  metrics: readonly TuningMetricObservation[];
  artifactHashes: readonly string[];
}

export interface TuningGateSummary {
  id: string;
  passed: boolean;
  failedSeeds: readonly string[];
  evidence: readonly { seed: string; detail: string }[];
}

export interface TuningMetricSummary {
  minimum: number;
  median: number;
  mean: number;
  maximum: number;
  worst: number;
}

export interface TuningFitnessComponent extends TuningObjectiveDefinition {
  values: readonly { seed: string; value: number }[];
  summary: TuningMetricSummary;
}

export interface CandidateEvaluationRecord {
  schemaVersion: 'evolution-candidate-evaluation/0.1';
  id: string;
  version: string;
  spec: TuningArtifactReference;
  candidate: TuningArtifactReference;
  suite: Pick<TuningSuiteDefinition, 'id' | 'label' | 'purpose' | 'visibility' | 'seeds'>;
  valid: boolean;
  gates: readonly TuningGateSummary[];
  fitnessVector: readonly TuningFitnessComponent[];
  caseArtifactHashes: readonly { seed: string; hashes: readonly string[] }[];
  limitations: readonly string[];
  hash: string;
}

export type ParetoRelation =
  | 'candidate-dominates'
  | 'baseline-dominates'
  | 'trade-off'
  | 'equivalent'
  | 'candidate-invalid'
  | 'candidate-restores-validity';

export interface CandidateComparison {
  baselineHash: string;
  candidateHash: string;
  relation: ParetoRelation;
  deltas: readonly {
    objectiveId: string;
    unit: string;
    direction: TuningObjectiveDirection;
    baselineMean: number;
    candidateMean: number;
    delta: number;
    preferred: boolean;
  }[];
}

export interface TuningCandidateProposal {
  hypothesis: string;
  changes: readonly TuningParameterChange[];
}

export interface OpenAICompatibleEndpoint {
  providerId: string;
  endpointKind: 'local' | 'remote';
  baseUrl: string;
  modelId: string;
  apiKey?: string;
  temperature?: number;
  seed?: number;
  jsonMode?: boolean;
  maxTokens?: number;
}

export interface ModelUsageObservation {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
}

export interface TuningModelObservation {
  providerId: string;
  endpointKind: OpenAICompatibleEndpoint['endpointKind'];
  modelId: string;
  returnedModelId?: string;
  promptHash: string;
  responseHash?: string;
  usage: ModelUsageObservation;
  elapsedMilliseconds: number;
}

export interface TuningModelResponse extends TuningModelObservation {
  responseHash: string;
  proposal: TuningCandidateProposal;
}

export interface TuningCandidateAssessment {
  candidate: TuningCandidateRecord;
  calibration: CandidateEvaluationRecord;
  heldOut: CandidateEvaluationRecord;
  calibrationComparison: CandidateComparison;
  heldOutComparison: CandidateComparison;
}

export interface TuningModelAttemptRecord {
  schemaVersion: 'evolution-model-attempt/0.1';
  providerId: string;
  endpointKind: OpenAICompatibleEndpoint['endpointKind'];
  requestedModelId: string;
  returnedModelId?: string;
  promptHash: string;
  responseHash?: string;
  schemaValid: boolean;
  candidateAccepted: boolean;
  rejectionReason?: string;
  repeatedMistakes: readonly string[];
  candidateHash?: string;
  calibrationEvaluationHash?: string;
  heldOutEvaluationHash?: string;
  calibrationRelation?: ParetoRelation;
  heldOutRelation?: ParetoRelation;
  hardGatesPassed?: boolean;
  usage: ModelUsageObservation;
  elapsedMilliseconds: number;
  canonicalEvidenceHash: string;
}
