import { describe, expect, it } from 'vitest';
import { compileRulePack } from './compile';
import { cloneDefaultRulePack, DEFAULT_RULE_PACK } from './defaultPack';
import type { RuleDefinition, RulePack } from './types';
import { validateRulePack } from './validate';

describe('declarative rulepacks', () => {
  it('validates and compiles the starter pack', () => {
    expect(validateRulePack(DEFAULT_RULE_PACK)).toEqual([]);
    const compiled = compileRulePack(DEFAULT_RULE_PACK);
    expect(compiled.orderedRules).toHaveLength(DEFAULT_RULE_PACK.rules.length);
    expect(compiled.candidatesByFact.get('resource.light.accessible')).toContain(
      'base/capability/light-harvesting'
    );
  });

  it('produces the same checksum regardless of source rule order', () => {
    const reversed = cloneDefaultRulePack();
    reversed.rules.reverse();
    expect(compileRulePack(reversed).checksum).toBe(compileRulePack(DEFAULT_RULE_PACK).checksum);
  });

  it('rejects duplicate and missing dependencies', () => {
    const invalid = cloneDefaultRulePack();
    invalid.rules.push({ ...invalid.rules[0] });
    invalid.rules[1].requires = ['missing/capability/example'];
    const codes = validateRulePack(invalid).map((issue) => issue.code);
    expect(codes).toContain('RULE_ID_DUPLICATE');
    expect(codes).toContain('RULE_REFERENCE_MISSING');
  });

  it('indexes a 500-entry pack without changing its public shape', () => {
    const rules: RuleDefinition[] = Array.from({ length: 500 }, (_, index) => ({
      id: `scale/capability/rule-${String(index).padStart(3, '0')}`,
      version: 1,
      kind: 'capability',
      name: `Scale rule ${index}`,
      summary: 'Generated scale fixture.',
      enabled: true,
      priority: index % 7,
      tags: ['scale'],
      requires: [],
      conditions: [{ fact: `environment.band.${index % 10}`, operator: 'exists' }],
      effects: [{ action: 'enable-capability', target: `capability/scale-${index}` }]
    }));
    const pack: RulePack = { ...cloneDefaultRulePack(), rules };
    const compiled = compileRulePack(pack);
    expect(compiled.orderedRules).toHaveLength(500);
    expect(compiled.candidatesByFact.get('environment.band.0')).toHaveLength(50);
    expect(compiled.orderedRules[0].id).toBe('scale/capability/rule-000');
  });
});
