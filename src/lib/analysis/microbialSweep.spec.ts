import { describe, expect, it } from 'vitest';
import { createMicrobialShadowResponseFamily } from './microbialSweep';

describe('microbial shadow response family', () => {
  it('builds nine deterministic cases from one shared parent checkpoint', () => {
    const first = createMicrobialShadowResponseFamily('response-family');
    const second = createMicrobialShadowResponseFamily('response-family');
    expect(first).toEqual(second);
    expect(first.cases).toHaveLength(9);
    expect(first.hash).toMatch(/^evaluation-family\/v1-/);
    expect(first.referenceCaseId).toBe('light-30/days-37');
    expect(new Set(first.cases.map(({ manifestHash }) => manifestHash)).size).toBe(9);
  });

  it('keeps each parameter pair explicit and identifies the reference case', () => {
    const family = createMicrobialShadowResponseFamily('response-parameters');
    expect(family.cases.map(({ parameters }) => parameters)).toEqual([
      { durationDays: 14, retainedLightFraction: 0.5 },
      { durationDays: 14, retainedLightFraction: 0.3 },
      { durationDays: 14, retainedLightFraction: 0.1 },
      { durationDays: 37, retainedLightFraction: 0.5 },
      { durationDays: 37, retainedLightFraction: 0.3 },
      { durationDays: 37, retainedLightFraction: 0.1 },
      { durationDays: 90, retainedLightFraction: 0.5 },
      { durationDays: 90, retainedLightFraction: 0.3 },
      { durationDays: 90, retainedLightFraction: 0.1 }
    ]);
    expect(family.cases.find(({ id }) => id === family.referenceCaseId)?.parameters).toEqual({
      durationDays: 37,
      retainedLightFraction: 0.3
    });
  });

  it('makes stronger or longer shadows no better at their lowest productive point', () => {
    const family = createMicrobialShadowResponseFamily('response-order');
    const outcome = (light: number, days: number) =>
      family.cases.find(({ parameters }) => parameters.retainedLightFraction === light && parameters.durationDays === days)!.outcome;
    expect(outcome(0.1, 37).lowestProductiveFluxRetentionPercent).toBeLessThanOrEqual(
      outcome(0.5, 37).lowestProductiveFluxRetentionPercent
    );
    expect(outcome(0.3, 90).lowestProductiveFluxRetentionPercent).toBeLessThanOrEqual(
      outcome(0.3, 14).lowestProductiveFluxRetentionPercent
    );
  });
});
