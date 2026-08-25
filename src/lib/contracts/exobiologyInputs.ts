import fixtureJson from './fixtures/sse-beta-spectral-v1.json';
import type { SsePlanetDataset } from './ssePlanetDataset';
import type { SimulationConfig } from '../core';
import {
  PROVIDER_REQUIREMENT_SCHEMA,
  createProviderFixtureDraft,
  validateProviderFixture,
  type CompiledProviderFixture,
  type CurvePreset,
  type ProviderContractIssue,
  type ProviderFixtureDraft,
  type ProviderRequirementProfile,
  type ProviderValueSource,
  type ScalarProviderRequirement
} from './providerRequirements';

const dataset = fixtureJson as unknown as SsePlanetDataset;
const authoredSource: ProviderValueSource = {
  kind: 'authored-scenario',
  reference: 'lab/exobiology-physical-inputs@0.1.0',
  evidence: 'fictional'
};

function scalar(
  id: string,
  label: string,
  group: string,
  summary: string,
  unit: string,
  value: number,
  minimum: number,
  maximum: number,
  step: number,
  use: ScalarProviderRequirement['use'] = 'recorded-only',
  authority: ScalarProviderRequirement['authority'] = 'provider'
): ScalarProviderRequirement {
  return {
    id, label, group, summary, unit, minimum, maximum, step, use, authority,
    shape: 'scalar', required: true,
    defaultValue: { shape: 'scalar', unit, value, source: authoredSource }
  };
}

export const EXOBIOLOGY_SPECTRAL_PRESETS: readonly CurvePreset[] = dataset.payload.frames.map((frame) => ({
  id: frame.id,
  label: frame.id === 'g-star-earthlike-surface'
    ? 'G-star / thin atmosphere'
    : frame.id === 'm-star-earthlike-surface'
      ? 'M-star / thin atmosphere'
      : 'G-star / thick CO2 atmosphere',
  summary: `${frame.input.star.starTempK} K star / ${frame.input.atmosphere.pressure_bar} bar / ${frame.level}`,
  value: {
    shape: 'curve', xUnit: 'nm', yUnit: dataset.payload.grid.valueUnit,
    x: Array.from({ length: frame.irradianceWm2Nm.length }, (_, index) => dataset.payload.grid.minimumNm + index * dataset.payload.grid.stepNm),
    y: [...frame.irradianceWm2Nm],
    source: {
      kind: 'provider-dataset',
      reference: `${dataset.fixtureSchema}:${dataset.payloadSha256}:${frame.id}`,
      evidence: 'demonstrated'
    }
  }
}));

export const EXOBIOLOGY_PROVIDER_REQUIREMENTS: ProviderRequirementProfile = {
  schemaVersion: PROVIDER_REQUIREMENT_SCHEMA,
  id: 'exobiology/provider-requirements',
  version: '0.1.0',
  domainPackId: 'domain/exobiology-aggregate@0.1.0',
  title: 'Exobiology physical inputs',
  summary: 'Physical facts this domain expects a scripted fixture or future planetary provider to supply.',
  requirements: [
    {
      id: 'radiation/surface-spectrum', label: 'Surface non-ionising spectrum', group: 'Radiation & energy',
      summary: 'Spectral irradiance reaching the habitat. Biology may consume this curve later; it may not rewrite it.',
      shape: 'curve', required: true, authority: 'provider', use: 'recorded-only',
      xUnit: 'nm', yUnit: dataset.payload.grid.valueUnit,
      minimumX: dataset.payload.grid.minimumNm, maximumX: dataset.payload.grid.maximumNm,
      presets: EXOBIOLOGY_SPECTRAL_PRESETS, defaultPresetId: 'g-star-earthlike-surface'
    },
    scalar('radiation/ionising-dose-rate', 'Ionising dose rate', 'Radiation & energy', 'Absorbed ionising dose at the habitat boundary; damage depends on exposure and biological response.', 'mGy.day-1', 0.01, 0, 1000, 0.01),
    scalar('radiation/longwave-irradiance', 'Long-wave irradiance', 'Radiation & energy', 'Longer-wave energy reaching the habitat. It is not automatically useful or harmful.', 'W.m-2', 320, 0, 5000, 1),
    scalar('gradient/redox-power-density', 'Chemical gradient power', 'Radiation & energy', 'Rate of accessible chemical free energy supplied per habitat volume.', 'W.m-3', 1, 0, 1000, 0.1),
    scalar('habitat/temperature', 'Temperature', 'Habitat state', 'Local habitat temperature supplied by the physical provider.', 'K', 298, 1, 2000, 1),
    scalar('habitat/pressure', 'Pressure', 'Habitat state', 'Local total pressure at the modelled level.', 'bar', 1, 0, 1000, 0.1),
    scalar('habitat/gravity', 'Gravity', 'Habitat state', 'Local gravitational acceleration.', 'm.s-2', 9.81, 0, 100, 0.01),
    scalar('medium/liquid-fraction', 'Liquid-medium availability', 'Medium & transport', 'Fraction of the habitat presently occupied by a declared liquid medium; the solvent is not assumed.', 'ratio', 0.95, 0, 1, 0.01),
    scalar('medium/density', 'Medium density', 'Medium & transport', 'Bulk density of the local liquid, gas or mixed medium.', 'kg.m-3', 998, 0.01, 30000, 1),
    scalar('medium/solvent-activity', 'Solvent activity', 'Medium & transport', 'Thermodynamic availability of the declared solvent, without assuming that solvent is water.', 'ratio', 0.99, 0, 1, 0.01),
    scalar('medium/acidity-index', 'Acidity index', 'Medium & transport', 'The starter fixture uses aqueous pH; another solvent requires another authored definition.', 'aqueous-pH', 7, 0, 14, 0.1),
    scalar('transport/mixing-turnover', 'Mixing turnover', 'Medium & transport', 'Fraction of the local medium exchanged or remixed per day.', 'day-1', 0.15, 0, 10, 0.01),
    scalar('prototype/mean-usable-light', 'Mean usable light', 'Current prototype adapter', 'Scalar light supplied to todays aggregate microbial equations.', 'prototype-light', 70, 5, 95, 1, 'drives-prototype', 'scenario'),
    scalar('prototype/light-cycle-amplitude', 'Light cycle strength', 'Current prototype adapter', 'Daily or seasonal variation around the prototype mean.', 'prototype-light', 11, 0, 40, 1, 'drives-prototype', 'scenario'),
    scalar('prototype/light-cycle-days', 'Light cycle length', 'Current prototype adapter', 'Duration of the scripted light cycle.', 'days', 48, 2, 360, 1, 'drives-prototype', 'scenario'),
    scalar('scenario/shadow-start-day', 'Long shadow starts', 'Current prototype adapter', 'Stored day at which the test disturbance begins.', 'day', 232, 1, 350, 1, 'drives-prototype', 'scenario'),
    scalar('scenario/shadow-duration-days', 'Long shadow duration', 'Current prototype adapter', 'Number of stored days for which the light reduction persists.', 'days', 37, 1, 180, 1, 'drives-prototype', 'scenario'),
    scalar('scenario/shadow-light-retained', 'Light retained in shadow', 'Current prototype adapter', 'Fraction of ordinary usable light retained during the disturbance.', 'ratio', 0.3, 0, 1, 0.01, 'drives-prototype', 'scenario'),
    scalar('scenario/nutrient-pulse-day', 'Nutrient pulse', 'Current prototype adapter', 'Stored day of the scripted mixing and nutrient input.', 'day', 156, 1, 350, 1, 'drives-prototype', 'scenario')
  ]
};

export function createExobiologyProviderDraft() {
  return createProviderFixtureDraft(EXOBIOLOGY_PROVIDER_REQUIREMENTS, 'fixture/exobiology-lab-inputs');
}
export function validateExobiologyProviderFixture(
  fixture: ProviderFixtureDraft,
  runDuration = 360
): ProviderContractIssue[] {
  const issues = [...validateProviderFixture(EXOBIOLOGY_PROVIDER_REQUIREMENTS, fixture)];
  const value = (id: string) => {
    const candidate = fixture.values?.[id];
    return candidate?.shape === 'scalar' ? candidate.value : undefined;
  };
  const shadowStart = value('scenario/shadow-start-day');
  const shadowDuration = value('scenario/shadow-duration-days');
  if (shadowStart !== undefined && shadowDuration !== undefined && shadowStart + shadowDuration - 1 > runDuration) {
    issues.push({ path: 'values.scenario/shadow-duration-days', message: `Shadow must end by day ${runDuration}.` });
  }
  const nutrientPulse = value('scenario/nutrient-pulse-day');
  if (nutrientPulse !== undefined && nutrientPulse > runDuration) {
    issues.push({ path: 'values.scenario/nutrient-pulse-day', message: `Nutrient pulse must occur by day ${runDuration}.` });
  }
  const mean = value('prototype/mean-usable-light');
  const amplitude = value('prototype/light-cycle-amplitude');
  if (mean !== undefined && amplitude !== undefined && (mean - amplitude < 4 || mean + amplitude > 90)) {
    issues.push({ path: 'values.prototype/light-cycle-amplitude', message: 'The current scripted provider requires the full light cycle to stay between 4 and 90 prototype-light units.' });
  }
  return issues;
}
function scalarValue(fixture: CompiledProviderFixture, id: string): number {
  const value = fixture.values[id];
  if (value?.shape !== 'scalar') throw new Error(`Provider fixture ${fixture.id} is missing scalar ${id}.`);
  return value.value;
}

export function exobiologyFixtureToSimulationConfig(
  fixture: CompiledProviderFixture,
  base: SimulationConfig
): SimulationConfig {
  const shadowStartsAt = Math.round(scalarValue(fixture, 'scenario/shadow-start-day'));
  const shadowDuration = Math.round(scalarValue(fixture, 'scenario/shadow-duration-days'));
  return {
    ...base,
    nutrientPulseAt: Math.round(scalarValue(fixture, 'scenario/nutrient-pulse-day')),
    shadowStartsAt,
    shadowEndsAt: shadowStartsAt + shadowDuration - 1,
    shadowLightFraction: scalarValue(fixture, 'scenario/shadow-light-retained'),
    meanUsableLight: scalarValue(fixture, 'prototype/mean-usable-light'),
    lightCycleAmplitude: scalarValue(fixture, 'prototype/light-cycle-amplitude'),
    lightCycleDays: scalarValue(fixture, 'prototype/light-cycle-days'),
    providerInput: {
      profileId: fixture.profile.id,
      profileVersion: fixture.profile.version,
      fixtureHash: fixture.hash
    }
  };
}