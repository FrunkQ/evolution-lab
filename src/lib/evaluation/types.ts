export type EvaluationGateStatus = 'pass' | 'fail' | 'not-checked';
export type EvaluationGateScope = 'universal' | 'profile';

export interface EvaluationThreshold {
  id: string;
  label: string;
  value: number;
  unit: string;
  description: string;
}

export interface EvaluationGateDefinition {
  id: string;
  version: string;
  scope: EvaluationGateScope;
  question: string;
  summary: string;
  availability: 'implemented' | 'unavailable';
}

export interface EvaluationGateObservation {
  gateId: string;
  passed: boolean;
  evidence?: string;
}

export interface EvaluationGateResult extends EvaluationGateDefinition {
  status: EvaluationGateStatus;
  evidence?: string;
}

export interface EvaluationProfileDefinition {
  id: string;
  version: string;
  title: string;
  comparisonKind: string;
  thresholds: readonly EvaluationThreshold[];
  gates: readonly EvaluationGateDefinition[];
  metricIds: readonly string[];
  questionIds: readonly string[];
  limitationIds: readonly string[];
}

export interface CompiledEvaluationProfile extends EvaluationProfileDefinition {
  hash: string;
}

export interface EvaluationGateReport {
  valid: boolean;
  passed: number;
  failed: number;
  unavailable: number;
  results: readonly EvaluationGateResult[];
}

export interface EvaluationAxis {
  id: string;
  label: string;
  unit: string;
  values: readonly number[];
}

export interface EvaluationFamilyCase<TParameters, TOutcome> {
  id: string;
  parameters: TParameters;
  manifestHash: string;
  outcome: TOutcome;
}

export interface EvaluationFamily<TParameters, TOutcome> {
  id: string;
  version: string;
  profile: Pick<CompiledEvaluationProfile, 'id' | 'version' | 'hash'>;
  axes: readonly EvaluationAxis[];
  cases: readonly EvaluationFamilyCase<TParameters, TOutcome>[];
  hash: string;
}