import { describe, expect, it } from 'vitest';
import {
  RESERVED_RUN_COLORS,
  validateTemporalSeriesStyles,
  type TemporalSeriesStyle
} from './presentation';

const validStyles: TemporalSeriesStyle[] = [
  { seriesId: 'total-active-biomass', color: RESERVED_RUN_COLORS.observed, symbol: '━━' },
  { seriesId: 'comparison/no-long-shadow', color: RESERVED_RUN_COLORS.control, symbol: '┈' },
  { seriesId: 'lineage/basal-loop', color: '#b99cff', symbol: '┄' }
];

describe('temporal presentation palette', () => {
  it('accepts distinct reserved run and lineage colours', () => {
    expect(validateTemporalSeriesStyles(validStyles)).toEqual([]);
  });

  it('rejects a lineage that borrows either reserved run colour', () => {
    expect(validateTemporalSeriesStyles([
      ...validStyles.filter((style) => style.seriesId !== 'lineage/basal-loop'),
      { seriesId: 'lineage/basal-loop', color: RESERVED_RUN_COLORS.control, symbol: '┄' }
    ])).toContain('lineage/basal-loop uses a colour reserved for whole-run series.');
  });

  it('rejects a run series whose reserved colour has drifted', () => {
    expect(validateTemporalSeriesStyles([
      ...validStyles.filter((style) => style.seriesId !== 'comparison/no-long-shadow'),
      { seriesId: 'comparison/no-long-shadow', color: '#b7c7d9', symbol: '┈' }
    ])).toContain('comparison/no-long-shadow must use its reserved run colour.');
  });
});