import { stableChecksum } from './canonical';
import type { CompiledRulePack, RuleDefinition, RuleKind, RulePack } from './types';
import { validateRulePack } from './validate';

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const values = index.get(key) ?? [];
  values.push(value);
  index.set(key, values);
}

function canonicalRule(rule: RuleDefinition): RuleDefinition {
  return {
    ...rule,
    tags: [...rule.tags].sort(),
    requires: [...rule.requires].sort(),
    conditions: [...rule.conditions],
    effects: [...rule.effects]
  };
}

export function compileRulePack(pack: RulePack): CompiledRulePack {
  const errors = validateRulePack(pack).filter((issue) => issue.severity === 'error');
  if (errors.length > 0) {
    throw new Error(`Cannot compile rulepack: ${errors.map((issue) => issue.message).join(' ')}`);
  }

  const orderedRules = pack.rules
    .filter((rule) => rule.enabled)
    .map(canonicalRule)
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  const byId = new Map(orderedRules.map((rule) => [rule.id, rule]));
  const byKind = new Map<RuleKind, RuleDefinition[]>();
  const dependantsByRuleId = new Map<string, string[]>();
  const candidatesByFact = new Map<string, string[]>();

  for (const rule of orderedRules) {
    byKind.set(rule.kind, [...(byKind.get(rule.kind) ?? []), rule]);
    rule.requires.forEach((requiredId) => pushIndex(dependantsByRuleId, requiredId, rule.id));
    rule.conditions.forEach((condition) => pushIndex(candidatesByFact, condition.fact, rule.id));
  }

  for (const values of [...dependantsByRuleId.values(), ...candidatesByFact.values()]) {
    values.sort();
  }

  const canonicalPack = {
    manifest: pack.manifest,
    rules: [...pack.rules].map(canonicalRule).sort((a, b) => a.id.localeCompare(b.id))
  };

  return {
    manifest: pack.manifest,
    checksum: stableChecksum('rulepack-v1', canonicalPack),
    orderedRules,
    byId,
    byKind,
    dependantsByRuleId,
    candidatesByFact
  };
}

export function tryCompileRulePack(pack: RulePack): CompiledRulePack | undefined {
  try {
    return compileRulePack(pack);
  } catch {
    return undefined;
  }
}
