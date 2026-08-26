import { describe, expect, it } from 'vitest';
import { compileExperimentQualification } from './qualification';
import type { ExperimentQualificationDefinition } from './qualification';

const definition: ExperimentQualificationDefinition = {
  id: 'qualification/test-reference',
  version: '0.1.0',
  experiment: {
    id: 'lab/test-experiment',
    version: '1.0.0',
    manifestHash: 'experiment-manifest/v1-test'
  },
  seeds: ['one', 'two'],
  artifacts: [
    { id: 'provider/test-fixture', version: '1.0.0', hash: 'provider-fixture/v1-test' }
  ],
  checks: [
    {
      id: 'check/replay',
      kind: 'replay',
      label: 'Same seed replays',
      passed: true,
      evidence: 'Two complete histories are byte-equivalent.'
    }
  ],
  claimLevel: 'Framework integrity only; not scientific validation.',
  limitations: ['The domain model remains independently challengeable.']
};

describe('experiment qualification report', () => {
  it('compiles an immutable-input deterministic pass/fail summary', () => {
    const first = compileExperimentQualification(definition);
    const second = compileExperimentQualification(definition);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ valid: true, passed: 1, failed: 0 });
    expect(first.hash).toMatch(/^experiment-qualification\/v1-/);
  });

  it('makes any failed check fail the qualification without hiding its evidence', () => {
    const report = compileExperimentQualification({
      ...definition,
      checks: [{ ...definition.checks[0], passed: false, evidence: 'Replay diverged at day 12.' }]
    });
    expect(report).toMatchObject({ valid: false, passed: 0, failed: 1 });
    expect(report.checks[0].evidence).toContain('day 12');
  });

  it('rejects duplicate checks and incomplete evidence', () => {
    expect(() => compileExperimentQualification({
      ...definition,
      checks: [definition.checks[0], definition.checks[0]]
    })).toThrow(/Duplicate check/);
    expect(() => compileExperimentQualification({
      ...definition,
      checks: [{ ...definition.checks[0], evidence: '' }]
    })).toThrow(/label and evidence/);
  });
});