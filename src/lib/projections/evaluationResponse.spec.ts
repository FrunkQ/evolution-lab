import { describe, expect, it } from 'vitest';
import { createMicrobialShadowResponseFamily } from '../analysis';
import { projectMicrobialShadowResponse } from './evaluationResponse';

describe('evaluation response projection', () => {
  it('projects every family case into a readable deterministic cell', () => {
    const family = createMicrobialShadowResponseFamily('response-view');
    const first = projectMicrobialShadowResponse(family);
    const second = projectMicrobialShadowResponse(family);
    expect(first).toEqual(second);
    expect(first.cells).toHaveLength(family.cases.length);
    expect(first.rowAxis.values).toEqual([14, 37, 90]);
    expect(first.columnAxis.values).toEqual([0.5, 0.3, 0.1]);
    expect(first.cells.filter(({ isReference }) => isReference).map(({ id }) => id)).toEqual([
      family.referenceCaseId
    ]);
    expect(first.cells.every(({ headline, measures }) => headline.includes('living mass') && measures.length === 4)).toBe(true);
  });
});
