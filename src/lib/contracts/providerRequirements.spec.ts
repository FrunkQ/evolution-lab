import { describe, expect, it } from 'vitest';
import {
  EXOBIOLOGY_PROVIDER_REQUIREMENTS,
  EXOBIOLOGY_SPECTRAL_PRESETS,
  createExobiologyProviderDraft,
  exobiologyFixtureToSimulationConfig,
  validateExobiologyProviderFixture
} from './exobiologyInputs';
import {
  compileProviderFixture,
  replaceProviderValue,
  validateProviderFixture,
  validateProviderRequirementProfile
} from './providerRequirements';

describe('provider requirement profile and generated fixture', () => {
  it('validates the domain declaration and creates a deterministic fixture', () => {
    expect(validateProviderRequirementProfile(EXOBIOLOGY_PROVIDER_REQUIREMENTS)).toEqual([]);
    const first = compileProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, createExobiologyProviderDraft());
    const second = compileProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, createExobiologyProviderDraft());
    expect(first.hash).toBe(second.hash);
    const roundTrip = compileProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, JSON.parse(JSON.stringify(first)));
    expect(roundTrip.hash).toBe(first.hash);
    expect(Object.isFrozen((first.values['radiation/surface-spectrum'] as { y: readonly number[] }).y)).toBe(true);
    expect(Object.keys(first.values)).toHaveLength(EXOBIOLOGY_PROVIDER_REQUIREMENTS.requirements.length);
  });

  it('rejects missing, unknown and out-of-bounds values', () => {
    const draft = createExobiologyProviderDraft();
    const values = { ...draft.values };
    delete values['habitat/temperature'];
    values['unknown/value'] = {
      shape: 'scalar', unit: 'none', value: 1,
      source: { kind: 'authored-scenario', reference: 'test', evidence: 'fictional' }
    };
    const pressure = values['habitat/pressure'];
    if (pressure?.shape === 'scalar') values['habitat/pressure'] = { ...pressure, value: 1001 };
    const issues = validateProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, { ...draft, values });
    expect(issues.some(({ path }) => path.includes('habitat/temperature'))).toBe(true);
    expect(issues.some(({ path }) => path.includes('unknown/value'))).toBe(true);
    expect(issues.some(({ path }) => path.includes('habitat/pressure'))).toBe(true);
  });

  it('content-addresses a selected provider curve without mutating the profile', () => {
    const initial = createExobiologyProviderDraft();
    const selected = EXOBIOLOGY_SPECTRAL_PRESETS[1];
    const changed = replaceProviderValue(initial, 'radiation/surface-spectrum', selected.value);
    const before = compileProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, initial);
    const after = compileProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, changed);
    expect(after.hash).not.toBe(before.hash);
    expect(after.values['radiation/surface-spectrum'].source.reference).toContain(selected.id);
    expect(initial.values['radiation/surface-spectrum'].source.reference).not.toContain(selected.id);
  });

  it('maps only declared prototype adapter values into a pinned run config', () => {
    const fixture = compileProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, createExobiologyProviderDraft());
    const config = exobiologyFixtureToSimulationConfig(fixture, {
      duration: 360,
      nutrientPulseAt: 1,
      shadowStartsAt: 2,
      shadowEndsAt: 3,
      shadowLightFraction: 1
    });
    expect(config.meanUsableLight).toBe(70);
    expect(config.shadowEndsAt - config.shadowStartsAt + 1).toBe(37);
    expect(config.providerInput?.fixtureHash).toBe(fixture.hash);
    expect(fixture.values['habitat/pressure'].shape).toBe('scalar');
  });
  it('reports cross-field limits before a dataset can be pushed', () => {
    const draft = createExobiologyProviderDraft();
    const duration = draft.values['scenario/shadow-duration-days'];
    const amplitude = draft.values['prototype/light-cycle-amplitude'];
    const values = { ...draft.values };
    if (duration?.shape === 'scalar') values['scenario/shadow-duration-days'] = { ...duration, value: 180 };
    if (amplitude?.shape === 'scalar') values['prototype/light-cycle-amplitude'] = { ...amplitude, value: 40 };
    const issues = validateExobiologyProviderFixture({ ...draft, values });
    expect(issues.some(({ message }) => message.includes('Shadow must end'))).toBe(true);
    expect(issues.some(({ message }) => message.includes('full light cycle'))).toBe(true);
  });
  it('rejects malformed top-level JSON without throwing in validation', () => {
    expect(validateProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, {} as never)).toEqual([
      { path: 'fixture', message: 'Provider fixture requires profile identity and a values object.' }
    ]);
  });});
