import type { SimulationRun } from '../core/types';

export type TemporalViewMode = 'absolute' | 'relative';

export interface TemporalSample {
  tick: number;
  value: number;
}

export interface TemporalSeries {
  id: string;
  label: string;
  description: string;
  unit: string;
  samples: readonly TemporalSample[];
}

export interface TemporalMarker {
  id: string;
  tick: number;
  label: string;
  kind: string;
}

export interface TemporalProjection {
  id: string;
  title: string;
  timeLabel: string;
  quantityLabel: string;
  unit: string;
  relativeMode: 'series-maximum' | null;
  series: readonly TemporalSeries[];
  markers: readonly TemporalMarker[];
}

export function projectMicrobialBiomassHistory(run: SimulationRun): TemporalProjection {
  const total: TemporalSeries = {
    id: 'total-active-biomass',
    label: 'Total active biomass',
    description: 'Sum of biomass for populations marked active in each stored daily snapshot.',
    unit: 'experimental biomass units',
    samples: run.snapshots.map((snapshot) => ({
      tick: snapshot.tick,
      value: snapshot.populations
        .filter((population) => population.active)
        .reduce((sum, population) => sum + population.biomass, 0)
    }))
  };

  const lineageSeries: TemporalSeries[] = run.lineages.map((lineage) => ({
    id: `lineage/${lineage.id}`,
    label: lineage.shortName,
    description: `Aggregate biomass stored for the authored ${lineage.shortName} lineage.`,
    unit: 'experimental biomass units',
    samples: run.snapshots.map((snapshot) => ({
      tick: snapshot.tick,
      value:
        snapshot.populations.find((population) => population.lineageId === lineage.id)?.biomass ?? 0
    }))
  }));

  return {
    id: 'biology/microbial-biomass-history',
    title: 'Levels through time',
    timeLabel: 'Simulation day',
    quantityLabel: 'Aggregate biomass',
    unit: 'experimental biomass units',
    relativeMode: 'series-maximum',
    series: [total, ...lineageSeries],
    markers: run.events.map((event) => ({
      id: event.id,
      tick: event.tick,
      label: event.title,
      kind: event.kind
    }))
  };
}

export function selectTemporalSeries(
  projection: TemporalProjection,
  visibleSeriesIds: ReadonlySet<string>
): TemporalProjection {
  return {
    ...projection,
    series: projection.series.filter((series) => visibleSeriesIds.has(series.id))
  };
}

export function projectTemporalView(
  projection: TemporalProjection,
  mode: TemporalViewMode
): TemporalProjection {
  if (mode === 'absolute') return projection;
  if (projection.relativeMode !== 'series-maximum') {
    throw new Error(`Projection ${projection.id} does not define a dimensionally valid relative view.`);
  }

  return {
    ...projection,
    quantityLabel: 'Relative level',
    unit: '% of each series peak',
    series: projection.series.map((series) => {
      const maximum = Math.max(0, ...series.samples.map((sample) => sample.value));
      return {
        ...series,
        unit: '% of series peak',
        samples: series.samples.map((sample) => ({
          tick: sample.tick,
          value: maximum === 0 ? 0 : (sample.value / maximum) * 100
        }))
      };
    })
  };
}

export function downsampleTemporalProjection(
  projection: TemporalProjection,
  maxSamples: number,
  priorityTicks: readonly number[] = []
): TemporalProjection {
  if (!Number.isInteger(maxSamples) || maxSamples < 2) {
    throw new Error('maxSamples must be an integer of at least 2.');
  }

  const ticks = [...new Set(projection.series.flatMap((series) => series.samples.map(({ tick }) => tick)))].sort(
    (left, right) => left - right
  );
  if (ticks.length <= maxSamples) return projection;

  const available = new Set(ticks);
  const required = new Set<number>([
    ticks[0],
    ticks.at(-1)!,
    ...projection.markers.map((marker) => marker.tick),
    ...priorityTicks
  ].filter((tick) => available.has(tick)));

  if (required.size > maxSamples) {
    throw new Error('maxSamples is too small to preserve boundaries, markers and priority ticks.');
  }

  const optional = ticks.filter((tick) => !required.has(tick));
  const optionalBudget = maxSamples - required.size;
  for (let index = 0; index < optionalBudget; index += 1) {
    const bucketIndex = Math.floor((index * optional.length) / optionalBudget);
    required.add(optional[bucketIndex]);
  }

  return {
    ...projection,
    series: projection.series.map((series) => ({
      ...series,
      samples: series.samples.filter((sample) => required.has(sample.tick))
    }))
  };
}

export function valueAtTick(series: TemporalSeries, tick: number): number | undefined {
  return series.samples.find((sample) => sample.tick === tick)?.value;
}
