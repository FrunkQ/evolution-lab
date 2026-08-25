export type VocabularyLayer = 'story' | 'ecology' | 'chemistry';
export type TreeLens = 'ancestry' | 'resources' | 'capabilities';

export type ResourceKey = 'light' | 'carbon' | 'minerals' | 'oxygen' | 'detritus';

export type ResourceLedger = Record<ResourceKey, number>;

export interface VocabularyText {
  story: string;
  ecology: string;
  chemistry: string;
}

export interface Capability {
  id: string;
  label: string;
  kind: 'metabolism' | 'survival' | 'interaction' | 'structure';
  cost: string;
}

export interface LineageDefinition {
  id: string;
  parentId?: string;
  emergedAt: number;
  color: string;
  shortName: string;
  vocabulary: VocabularyText;
  habitat: string;
  capabilities: Capability[];
}

export interface PopulationState {
  lineageId: string;
  biomass: number;
  productivity: number;
  stress: number;
  active: boolean;
}

export interface FlowRecord {
  source: string;
  target: string;
  amount: number;
  resource: string;
  color: string;
}

export type EventKind = 'origin' | 'innovation' | 'environment' | 'ecology' | 'legacy';

export interface SimulationEvent {
  id: string;
  tick: number;
  kind: EventKind;
  title: string;
  summary: string;
  causes: string[];
  affectedLineageIds: string[];
}

export interface SignatureState {
  oxygenation: number;
  oxidizedMinerals: number;
  organicSediment: number;
}

export interface WorldSnapshot {
  tick: number;
  resources: ResourceLedger;
  populations: PopulationState[];
  flows: FlowRecord[];
  signatures: SignatureState;
  events: SimulationEvent[];
}

export interface SimulationConfig {
  duration: number;
  nutrientPulseAt: number;
  shadowStartsAt: number;
  shadowEndsAt: number;
  shadowLightFraction: number;
  meanUsableLight?: number;
  lightCycleAmplitude?: number;
  lightCycleDays?: number;
  providerInput?: {
    profileId: string;
    profileVersion: string;
    fixtureHash: string;
  };
}

export interface EnvironmentFrame {
  tick: number;
  light: number;
  inflows: Partial<ResourceLedger>;
  events: SimulationEvent[];
}

export interface EnvironmentProvider {
  id: string;
  version: string;
  frameAt(tick: number, config: SimulationConfig): EnvironmentFrame;
}

export interface RunManifest {
  masterSeed: string;
  scopedSeed: string;
  seedPath: string[];
  engineVersion: string;
  schemaVersion: string;
  scenarioId: string;
  environmentProvider: string;
  configHash: string;
  providerInput?: {
    profileId: string;
    profileVersion: string;
    fixtureHash: string;
  };
}

export interface SimulationForkManifest {
  parentCheckpointHash: string;
  role: 'control' | 'shadow';
  perturbationId: string;
  perturbationVersion: string;
  perturbationHash: string;
  appliedAt: number;
  description: string;
}

export interface SimulationCheckpoint {
  format: 'evolution-checkpoint/0.1';
  tick: number;
  hash: string;
  seed: string;
  manifest: RunManifest;
  config: SimulationConfig;
  lineages: LineageDefinition[];
  snapshots: WorldSnapshot[];
  events: SimulationEvent[];
}

export interface SimulationPerturbation {
  id: string;
  version: string;
  role: SimulationForkManifest['role'];
  appliedAt: number;
  description: string;
  config: SimulationConfig;
}

export interface SimulationRun {
  seed: string;
  manifest: RunManifest;
  config: SimulationConfig;
  lineages: LineageDefinition[];
  snapshots: WorldSnapshot[];
  events: SimulationEvent[];
  fork?: SimulationForkManifest;
}
