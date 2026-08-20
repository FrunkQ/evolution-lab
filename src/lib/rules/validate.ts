import type { RuleDefinition, RulePack, RuleValidationIssue } from './types';

const RULE_ID = /^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9./-]*$/;

export function validateRule(rule: RuleDefinition): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  const add = (severity: RuleValidationIssue['severity'], code: string, message: string) =>
    issues.push({ severity, code, message, ruleId: rule.id });

  if (!RULE_ID.test(rule.id)) {
    add('error', 'RULE_ID_FORMAT', 'Use a namespaced lowercase ID such as pack/capability/example.');
  }
  if (!rule.name.trim()) add('error', 'RULE_NAME_REQUIRED', 'Rule name is required.');
  if (!rule.summary.trim()) add('warning', 'RULE_SUMMARY_RECOMMENDED', 'Add a human-readable summary.');
  if (!Number.isInteger(rule.priority)) add('error', 'RULE_PRIORITY_INTEGER', 'Priority must be an integer.');

  rule.conditions.forEach((condition, index) => {
    if (!condition.fact.trim()) {
      add('error', 'CONDITION_FACT_REQUIRED', `Condition ${index + 1} requires a fact path.`);
    }
    if (condition.operator !== 'exists' && condition.value === undefined) {
      add('error', 'CONDITION_VALUE_REQUIRED', `Condition ${index + 1} requires a value.`);
    }
  });

  rule.effects.forEach((effect, index) => {
    if (!effect.action.trim() || !effect.target.trim()) {
      add('error', 'EFFECT_TARGET_REQUIRED', `Effect ${index + 1} requires an action and target.`);
    }
  });

  return issues;
}

export function validateRulePack(pack: RulePack): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  if (!pack.manifest.id.trim()) {
    issues.push({ severity: 'error', code: 'PACK_ID_REQUIRED', message: 'Pack ID is required.' });
  }
  if (!pack.manifest.name.trim()) {
    issues.push({ severity: 'error', code: 'PACK_NAME_REQUIRED', message: 'Pack name is required.' });
  }

  const ids = new Set<string>();
  for (const rule of pack.rules) {
    issues.push(...validateRule(rule));
    if (ids.has(rule.id)) {
      issues.push({
        severity: 'error',
        code: 'RULE_ID_DUPLICATE',
        message: `Duplicate rule ID: ${rule.id}`,
        ruleId: rule.id
      });
    }
    ids.add(rule.id);
  }

  for (const rule of pack.rules) {
    for (const requiredId of rule.requires) {
      if (!ids.has(requiredId)) {
        issues.push({
          severity: 'error',
          code: 'RULE_REFERENCE_MISSING',
          message: `${rule.id} requires missing rule ${requiredId}.`,
          ruleId: rule.id
        });
      }
    }
  }

  return issues;
}
