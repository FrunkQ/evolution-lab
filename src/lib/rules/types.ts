import type { VocabularyText } from '../core/types';

export type RuleKind =
  | 'resource'
  | 'gradient'
  | 'capability'
  | 'transformation'
  | 'innovation'
  | 'signature'
  | 'visual';

export type RuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'exists';

export interface RuleCondition {
  fact: string;
  operator: RuleOperator;
  value?: string | number | boolean;
  unit?: string;
}

export interface RuleEffect {
  action: string;
  target: string;
  value?: string | number | boolean;
  unit?: string;
}

export interface RuleDefinition {
  id: string;
  version: number;
  kind: RuleKind;
  name: string;
  summary: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  requires: string[];
  conditions: RuleCondition[];
  effects: RuleEffect[];
  vocabulary?: Partial<VocabularyText>;
}

export interface RulePackManifest {
  id: string;
  name: string;
  version: string;
  schemaVersion: 'evolution-rulepack/0.1';
  engineRange: string;
  description: string;
  authors: string[];
  dependencies: Array<{ id: string; version: string }>;
  seedNamespace: string;
}

export interface RulePack {
  manifest: RulePackManifest;
  rules: RuleDefinition[];
}

export interface RuleValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  ruleId?: string;
}

export interface CompiledRulePack {
  manifest: RulePackManifest;
  checksum: string;
  orderedRules: RuleDefinition[];
  byId: Map<string, RuleDefinition>;
  byKind: Map<RuleKind, RuleDefinition[]>;
  dependantsByRuleId: Map<string, string[]>;
  candidatesByFact: Map<string, string[]>;
}
