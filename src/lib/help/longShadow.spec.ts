import { describe, expect, it } from 'vitest';
import { createMicrobialShadowEvaluation } from '../analysis';
import { createLongShadowHelpTopic } from './longShadow';

describe('long-shadow help projection', () => {
  it('keeps every audience lens tied to the same facts and limitations', () => {
    const evaluation = createMicrobialShadowEvaluation('help-lenses').evaluation;
    const topic = createLongShadowHelpTopic(evaluation);
    for (const item of Object.values(topic.lenses)) {
      expect(item.sourceFactIds).toEqual(evaluation.factIds);
      expect(item.limitationIds).toEqual(evaluation.limitationIds);
      expect(item.scopeNote.length).toBeGreaterThan(20);
    }
    expect(topic.intro).toMatch(/same stored result/i);
  });

  it('defines an isolated one-slider concept rather than a simulation input', () => {
    const topic = createLongShadowHelpTopic(createMicrobialShadowEvaluation('concept-demo').evaluation);
    expect(topic.conceptDemo.slider).toEqual(expect.objectContaining({ minimum: 0, maximum: 100 }));
    expect(topic.conceptDemo.disclaimer).toMatch(/does not run the engine/i);
    expect(topic.conceptDemo.outputs.map((output) => output.relation)).toEqual(['direct', 'inverse']);
  });
});
