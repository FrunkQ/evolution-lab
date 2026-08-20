import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './scenario';
import { deriveSeed } from './rng';
import type { EnvironmentProvider } from './types';
import { simulate } from './simulate';

describe('microcosm simulation', () => {
  it('replays deterministically for the same seed', () => {
    expect(simulate('same-seed')).toEqual(simulate('same-seed'));
  });

  it('derives stable isolated streams from one master seed', () => {
    const first = deriveSeed('system-42', 'planet', 'body-7', 'evolution');
    expect(first).toBe(deriveSeed('system-42', 'planet', 'body-7', 'evolution'));
    expect(first).not.toBe(deriveSeed('system-42', 'planet', 'body-8', 'evolution'));
    expect(first).not.toBe(deriveSeed('system-42', 'planet', 'body-7', 'climate'));
  });

  it('creates the expected bounded timeline', () => {
    const run = simulate('timeline');
    expect(run.snapshots).toHaveLength(DEFAULT_CONFIG.duration + 1);
    expect(run.snapshots[0].tick).toBe(0);
    expect(run.snapshots.at(-1)?.tick).toBe(DEFAULT_CONFIG.duration);
  });

  it('never produces negative resource or population ledgers', () => {
    const run = simulate('bounded-ledgers');
    for (const snapshot of run.snapshots) {
      expect(Object.values(snapshot.resources).every((value) => value >= 0)).toBe(true);
      expect(snapshot.populations.every((population) => population.biomass >= 0)).toBe(true);
    }
  });

  it('records innovations and a persistent environmental memory', () => {
    const run = simulate('history');
    const innovationTitles = run.events
      .filter((item) => item.kind === 'innovation')
      .map((item) => item.title);
    expect(innovationTitles).toContain('Light harvesting opens a new energy market');
    expect(innovationTitles).toContain('Death becomes a living resource');
    expect(innovationTitles).toContain('The producer monopoly ends');
    expect(run.snapshots.at(-1)?.signatures.oxidizedMinerals).toBeGreaterThan(0);
  });

  it('can swap the scripted environment without changing the engine API', () => {
    const darkEnvironment: EnvironmentProvider = {
      id: 'test-darkness',
      version: '1',
      frameAt: (tick) => ({ tick, light: 0, inflows: {}, events: [] })
    };
    const ordinary = simulate('provider-test');
    const dark = simulate('provider-test', DEFAULT_CONFIG, darkEnvironment);
    const ordinaryProducer = ordinary.snapshots.at(-1)?.populations.find(
      (population) => population.lineageId === 'light-weavers'
    );
    const darkProducer = dark.snapshots.at(-1)?.populations.find(
      (population) => population.lineageId === 'light-weavers'
    );
    expect(dark.manifest.environmentProvider).toBe('test-darkness@1');
    expect(darkProducer?.biomass).toBeLessThan(ordinaryProducer?.biomass ?? 0);
  });
});
