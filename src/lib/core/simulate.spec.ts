import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './scenario';
import { deriveSeed } from './rng';
import type { EnvironmentProvider } from './types';
import {
  createSimulationCheckpoint,
  forkSimulation,
  resumeSimulation,
  simulate,
  validateSimulationCheckpoint
} from './simulate';

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
    const innovationTitles = run.events.filter((item) => item.kind === 'innovation').map((item) => item.title);
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
    const ordinaryProducer = ordinary.snapshots.at(-1)?.populations.find((population) => population.lineageId === 'light-weavers');
    const darkProducer = dark.snapshots.at(-1)?.populations.find((population) => population.lineageId === 'light-weavers');
    expect(dark.manifest.environmentProvider).toBe('test-darkness@1');
    expect(darkProducer?.biomass).toBeLessThan(ordinaryProducer?.biomass ?? 0);
  });

  it('resumes exactly from a content-addressed checkpoint', () => {
    const uninterrupted = simulate('checkpoint-resume');
    const checkpoint = createSimulationCheckpoint(uninterrupted, uninterrupted.config.shadowStartsAt - 1);
    const resumed = resumeSimulation(checkpoint);
    expect(validateSimulationCheckpoint(checkpoint)).toBe(true);
    expect(resumed.snapshots).toEqual(uninterrupted.snapshots);
    expect(resumed.events).toEqual(uninterrupted.events);
  });

  it('forks deterministic futures from one identical stored prefix', () => {
    const source = simulate('checkpoint-fork');
    const checkpoint = createSimulationCheckpoint(source, source.config.shadowStartsAt - 1);
    const shadow = forkSimulation(checkpoint, {
      id: 'test/shadow', version: '1.0.0', role: 'shadow', appliedAt: checkpoint.tick + 1,
      description: 'Retain the scripted shadow.', config: source.config
    });
    const control = forkSimulation(checkpoint, {
      id: 'test/control', version: '1.0.0', role: 'control', appliedAt: checkpoint.tick + 1,
      description: 'Move the shadow outside the stored run.',
      config: { ...source.config, shadowStartsAt: source.config.duration + 1, shadowEndsAt: source.config.duration + 1 }
    });
    expect(shadow.fork?.parentCheckpointHash).toBe(checkpoint.hash);
    expect(control.fork?.parentCheckpointHash).toBe(checkpoint.hash);
    expect(shadow.snapshots.slice(0, checkpoint.tick + 1)).toEqual(control.snapshots.slice(0, checkpoint.tick + 1));
    expect(shadow.snapshots[checkpoint.tick + 1]).not.toEqual(control.snapshots[checkpoint.tick + 1]);
  });

  it('pins injected provider identity and uses only declared prototype light controls', () => {
    const config = {
      ...DEFAULT_CONFIG,
      meanUsableLight: 30,
      lightCycleAmplitude: 0,
      lightCycleDays: 20,
      providerInput: {
        profileId: 'exobiology/provider-requirements',
        profileVersion: '0.1.0',
        fixtureHash: 'provider-fixture/v1-test'
      }
    };
    const first = simulate('injected-input', config);
    const second = simulate('injected-input', config);
    expect(first).toEqual(second);
    expect(first.snapshots[0].resources.light).toBe(30);
    expect(first.manifest.providerInput).toEqual(config.providerInput);
    expect(first.manifest.configHash).not.toBe(simulate('injected-input').manifest.configHash);
  });
  it('rejects impossible retained-light inputs before simulation', () => {
    expect(() => simulate('bad-light', { ...DEFAULT_CONFIG, shadowLightFraction: -0.1 })).toThrow(/between 0 and 1/);
    expect(() => simulate('bad-light', { ...DEFAULT_CONFIG, shadowLightFraction: 1.1 })).toThrow(/between 0 and 1/);
  });

  it('rejects a tampered checkpoint before resume', () => {
    const checkpoint = createSimulationCheckpoint(simulate('tamper'), 120);
    checkpoint.snapshots[0].resources.carbon += 1;
    expect(validateSimulationCheckpoint(checkpoint)).toBe(false);
    expect(() => resumeSimulation(checkpoint)).toThrow(/content hash/);
  });
});
