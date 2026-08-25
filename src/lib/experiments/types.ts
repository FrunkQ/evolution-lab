export type ExperimentStatus = 'draft' | 'reference' | 'retired';

export interface ExperimentCheckpoint {
  tick: number;
  expectedHash?: string;
  note: string;
}

export interface EvolutionExperiment {
  id: string;
  version: string;
  title: string;
  summary: string;
  status: ExperimentStatus;
  manifestHash?: string;
  masterSeed: string;
  environmentProvider: string;
  rulePackIds: string[];
  tags: string[];
  questions: string[];
  lessons: string[];
  checkpoints: ExperimentCheckpoint[];
}
