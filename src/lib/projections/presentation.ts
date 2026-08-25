export interface TemporalSeriesStyle {
  seriesId: string;
  color: string;
  dashPattern?: string;
  areaOpacity?: number;
  symbol: string;
}

export const RESERVED_RUN_COLORS = Object.freeze({
  observed: '#f1f3f5',
  control: '#4da3ff'
});

const RESERVED = new Set(Object.values(RESERVED_RUN_COLORS).map((value) => value.toLowerCase()));

export function validateTemporalSeriesStyles(styles: readonly TemporalSeriesStyle[]): readonly string[] {
  const errors: string[] = [];
  const byId = new Map(styles.map((style) => [style.seriesId, style]));

  for (const required of [
    ['total-active-biomass', RESERVED_RUN_COLORS.observed],
    ['comparison/no-long-shadow', RESERVED_RUN_COLORS.control]
  ] as const) {
    const style = byId.get(required[0]);
    if (!style) errors.push('Missing presentation style for ' + required[0] + '.');
    else if (style.color.toLowerCase() !== required[1].toLowerCase()) {
      errors.push(required[0] + ' must use its reserved run colour.');
    }
  }

  for (const style of styles) {
    if (style.seriesId.startsWith('lineage/') && RESERVED.has(style.color.toLowerCase())) {
      errors.push(style.seriesId + ' uses a colour reserved for whole-run series.');
    }
  }

  return errors;
}