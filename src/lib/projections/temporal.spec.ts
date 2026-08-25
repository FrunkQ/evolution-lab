import { describe, expect, it } from 'vitest';
import { simulate } from '../core';
import {
  downsampleTemporalProjection,
  projectMicrobialBiomassHistory,
  projectTemporalView,
  selectTemporalSeries
} from './temporal';

describe('temporal history projection', () => {
  it('projects only stored biomass facts and recorded events', () => {
    const run = simulate('projection-facts');
    const projection = projectMicrobialBiomassHistory(run);

    expect(projection.series).toHaveLength(run.lineages.length + 1);
    expect(projection.markers.map((marker) => marker.id)).toEqual(run.events.map((event) => event.id));

    for (const [index, snapshot] of run.snapshots.entries()) {
      const expectedTotal = snapshot.populations
        .filter((population) => population.active)
        .reduce((sum, population) => sum + population.biomass, 0);
      expect(projection.series[0].samples[index]).toEqual({ tick: snapshot.tick, value: expectedTotal });
    }
  });

  it('adds an honest aligned no-shadow comparison when supplied', () => {
    const run = simulate('paired-projection');
    const control = simulate('paired-projection', {
      ...run.config,
      shadowStartsAt: run.config.duration + 1,
      shadowEndsAt: run.config.duration + 1
    });
    const projection = projectMicrobialBiomassHistory(run, control);
    const comparison = projection.series.find((series) => series.id === 'comparison/no-long-shadow');

    expect(comparison?.samples).toHaveLength(run.snapshots.length);
    expect(projection.explanation.join(' ')).toMatch(/not a checkpoint fork/i);
    expect(projection.markers.map((marker) => marker.id)).toEqual(run.events.map((event) => event.id));
  });

  it('is deterministic for the same seeded run', () => {
    expect(projectMicrobialBiomassHistory(simulate('projection-seed'))).toEqual(
      projectMicrobialBiomassHistory(simulate('projection-seed'))
    );
  });

  it('filters visibility without changing the source projection', () => {
    const source = projectMicrobialBiomassHistory(simulate('visibility'));
    const selected = selectTemporalSeries(source, new Set(['lineage/basal-loop']));
    expect(selected.series.map((series) => series.id)).toEqual(['lineage/basal-loop']);
    expect(source.series).toHaveLength(5);
  });

  it('normalises each series against its own peak without changing absolute values', () => {
    const source = projectMicrobialBiomassHistory(simulate('normalisation'));
    expect(projectTemporalView(source, 'absolute')).toBe(source);

    const relative = projectTemporalView(source, 'relative');
    expect(relative.unit).toBe('% of each series peak');
    for (const series of relative.series) {
      expect(Math.max(...series.samples.map((sample) => sample.value))).toBeCloseTo(100);
    }
    expect(source.unit).toBe('experimental biomass units');
  });

  it('downsamples deterministically while retaining boundaries, events and the inspected tick', () => {
    const source = projectMicrobialBiomassHistory(simulate('downsample'));
    const first = downsampleTemporalProjection(source, 80, [177]);
    const second = downsampleTemporalProjection(source, 80, [177]);
    const retainedTicks = first.series[0].samples.map((sample) => sample.tick);

    expect(first).toEqual(second);
    expect(first.series.every((series) => series.samples.length <= 80)).toBe(true);
    expect(retainedTicks).toContain(0);
    expect(retainedTicks).toContain(360);
    expect(retainedTicks).toContain(177);
    for (const marker of source.markers) expect(retainedTicks).toContain(marker.tick);
  });
});
