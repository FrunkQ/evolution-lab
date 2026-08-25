import { stableChecksum } from '../core/canonical';

export const PROVIDER_REQUIREMENT_SCHEMA = 'evolution-provider-requirements/0.1' as const;
export const PROVIDER_FIXTURE_SCHEMA = 'evolution-provider-fixture/0.1' as const;

export type EvidenceStatus = 'observed' | 'demonstrated' | 'inferred' | 'plausible' | 'speculative' | 'fictional';
export type ProviderRequirementUse = 'drives-prototype' | 'recorded-only' | 'future-provider';
export type ProviderRequirementAuthority = 'provider' | 'scenario';

export interface ProviderValueSource {
  kind: 'provider-dataset' | 'scripted-fixture' | 'authored-scenario';
  reference: string;
  evidence: EvidenceStatus;
}

export interface ScalarProviderValue {
  shape: 'scalar';
  unit: string;
  value: number;
  source: ProviderValueSource;
}

export interface CurveProviderValue {
  shape: 'curve';
  xUnit: string;
  yUnit: string;
  x: readonly number[];
  y: readonly number[];
  source: ProviderValueSource;
}

export type ProviderInputValue = ScalarProviderValue | CurveProviderValue;

interface RequirementBase {
  id: string;
  label: string;
  group: string;
  summary: string;
  required: boolean;
  authority: ProviderRequirementAuthority;
  use: ProviderRequirementUse;
}

export interface ScalarProviderRequirement extends RequirementBase {
  shape: 'scalar';
  unit: string;
  minimum: number;
  maximum: number;
  step: number;
  defaultValue: ScalarProviderValue;
}

export interface CurvePreset {
  id: string;
  label: string;
  summary: string;
  value: CurveProviderValue;
}

export interface CurveProviderRequirement extends RequirementBase {
  shape: 'curve';
  xUnit: string;
  yUnit: string;
  minimumX: number;
  maximumX: number;
  presets: readonly CurvePreset[];
  defaultPresetId: string;
}

export type ProviderRequirement = ScalarProviderRequirement | CurveProviderRequirement;

export interface ProviderRequirementProfile {
  schemaVersion: typeof PROVIDER_REQUIREMENT_SCHEMA;
  id: string;
  version: string;
  domainPackId: string;
  title: string;
  summary: string;
  requirements: readonly ProviderRequirement[];
}

export interface ProviderFixtureDraft {
  schemaVersion: typeof PROVIDER_FIXTURE_SCHEMA;
  id: string;
  version: string;
  profile: { id: string; version: string };
  values: Readonly<Record<string, ProviderInputValue>>;
}

export interface CompiledProviderFixture extends ProviderFixtureDraft { hash: string; }
export interface ProviderContractIssue { path: string; message: string; }

const NAMESPACED_ID = /^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9./-]*$/;

function validateCurve(value: CurveProviderValue, path: string): ProviderContractIssue[] {
  const issues: ProviderContractIssue[] = [];
  if (!value.xUnit.trim() || !value.yUnit.trim()) issues.push({ path, message: 'Curve axis units are required.' });
  if (value.x.length < 2 || value.x.length !== value.y.length) {
    issues.push({ path, message: 'A curve requires matching x/y arrays with at least two points.' });
    return issues;
  }
  if ([...value.x, ...value.y].some((item) => !Number.isFinite(item))) issues.push({ path, message: 'Curve values must be finite.' });
  if (value.x.some((item, index) => index > 0 && item <= value.x[index - 1])) issues.push({ path, message: 'Curve x values must be strictly increasing.' });
  return issues;
}

export function validateProviderRequirementProfile(profile: ProviderRequirementProfile): ProviderContractIssue[] {
  const issues: ProviderContractIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  if (profile.schemaVersion !== PROVIDER_REQUIREMENT_SCHEMA) add('schemaVersion', `Expected ${PROVIDER_REQUIREMENT_SCHEMA}.`);
  if (!NAMESPACED_ID.test(profile.id)) add('id', 'Use a stable namespaced profile ID.');
  if (!profile.version.trim()) add('version', 'Profile version is required.');
  if (!profile.domainPackId.trim()) add('domainPackId', 'Domain pack identity is required.');
  const ids = new Set<string>();
  for (const [index, requirement] of profile.requirements.entries()) {
    const path = `requirements[${index}]`;
    if (!NAMESPACED_ID.test(requirement.id)) add(`${path}.id`, 'Use a stable namespaced requirement ID.');
    if (ids.has(requirement.id)) add(`${path}.id`, `Duplicate requirement ID ${requirement.id}.`);
    ids.add(requirement.id);
    if (!requirement.label.trim() || !requirement.summary.trim()) add(path, 'A human label and summary are required.');
    if (requirement.shape === 'scalar') {
      if (!(requirement.maximum > requirement.minimum)) add(path, 'Scalar maximum must exceed minimum.');
      if (!(requirement.step > 0)) add(`${path}.step`, 'Scalar step must be positive.');
      if (requirement.defaultValue.unit !== requirement.unit) add(path, 'Scalar default unit must match the requirement.');
      if (!Number.isFinite(requirement.defaultValue.value) || requirement.defaultValue.value < requirement.minimum || requirement.defaultValue.value > requirement.maximum) add(`${path}.defaultValue`, 'Scalar default is outside its declared bounds.');
    } else {
      if (requirement.presets.length === 0) add(`${path}.presets`, 'A curve requires at least one fixture preset.');
      const presetIds = new Set<string>();
      for (const [presetIndex, preset] of requirement.presets.entries()) {
        if (presetIds.has(preset.id)) add(`${path}.presets[${presetIndex}].id`, `Duplicate preset ID ${preset.id}.`);
        presetIds.add(preset.id);
        if (preset.value.xUnit !== requirement.xUnit || preset.value.yUnit !== requirement.yUnit) add(`${path}.presets[${presetIndex}]`, 'Curve preset units must match the requirement.');
        issues.push(...validateCurve(preset.value, `${path}.presets[${presetIndex}].value`));
      }
      if (!presetIds.has(requirement.defaultPresetId)) add(`${path}.defaultPresetId`, 'Default curve preset is missing.');
    }
  }
  return issues;
}

export function createProviderFixtureDraft(profile: ProviderRequirementProfile, id: string, version = '0.1.0'): ProviderFixtureDraft {
  const issues = validateProviderRequirementProfile(profile);
  if (issues.length) throw new Error(issues.map(({ path, message }) => `${path}: ${message}`).join(' '));
  const values = Object.fromEntries(profile.requirements.map((requirement) => [
    requirement.id,
    requirement.shape === 'scalar'
      ? structuredClone(requirement.defaultValue)
      : structuredClone(requirement.presets.find(({ id }) => id === requirement.defaultPresetId)!.value)
  ]));
  return { schemaVersion: PROVIDER_FIXTURE_SCHEMA, id, version, profile: { id: profile.id, version: profile.version }, values };
}

export function validateProviderFixture(profile: ProviderRequirementProfile, fixture: ProviderFixtureDraft): ProviderContractIssue[] {
  const issues: ProviderContractIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  if (!fixture || typeof fixture !== 'object') return [{ path: 'fixture', message: 'Provider fixture must be a JSON object.' }];
  if (!fixture.profile || typeof fixture.profile !== 'object' || !fixture.values || typeof fixture.values !== 'object' || Array.isArray(fixture.values)) {
    add('fixture', 'Provider fixture requires profile identity and a values object.');
    return issues;
  }
  if (fixture.schemaVersion !== PROVIDER_FIXTURE_SCHEMA) add('schemaVersion', `Expected ${PROVIDER_FIXTURE_SCHEMA}.`);
  if (!NAMESPACED_ID.test(fixture.id)) add('id', 'Use a stable namespaced fixture ID.');
  if (fixture.profile.id !== profile.id || fixture.profile.version !== profile.version) add('profile', 'Fixture profile identity does not match the compiler profile.');
  const requirements = new Map(profile.requirements.map((requirement) => [requirement.id, requirement]));
  for (const id of Object.keys(fixture.values)) if (!requirements.has(id)) add(`values.${id}`, 'Value is not declared by this profile.');
  for (const requirement of profile.requirements) {
    const value = fixture.values[requirement.id];
    if (!value) {
      if (requirement.required) add(`values.${requirement.id}`, 'Required provider value is missing.');
      continue;
    }
    if (value.shape !== requirement.shape) {
      add(`values.${requirement.id}`, `Expected ${requirement.shape}, received ${value.shape}.`);
      continue;
    }
    if (requirement.shape === 'scalar' && value.shape === 'scalar') {
      if (value.unit !== requirement.unit) add(`values.${requirement.id}.unit`, `Expected ${requirement.unit}.`);
      if (!Number.isFinite(value.value) || value.value < requirement.minimum || value.value > requirement.maximum) add(`values.${requirement.id}.value`, `Value must be between ${requirement.minimum} and ${requirement.maximum}.`);
    }
    if (requirement.shape === 'curve' && value.shape === 'curve') {
      if (value.xUnit !== requirement.xUnit || value.yUnit !== requirement.yUnit) add(`values.${requirement.id}`, 'Curve units do not match the requirement.');
      issues.push(...validateCurve(value, `values.${requirement.id}`));
      if (value.x.length > 0 && (value.x[0] < requirement.minimumX || value.x[value.x.length - 1] > requirement.maximumX)) add(`values.${requirement.id}`, 'Curve lies outside the declared axis range.');
    }
  }
  return issues;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function compileProviderFixture(profile: ProviderRequirementProfile, fixture: ProviderFixtureDraft): CompiledProviderFixture {
  const issues = [...validateProviderRequirementProfile(profile), ...validateProviderFixture(profile, fixture)];
  if (issues.length) throw new Error(issues.map(({ path, message }) => `${path}: ${message}`).join(' '));
  const snapshot: ProviderFixtureDraft = JSON.parse(JSON.stringify({
    schemaVersion: fixture.schemaVersion,
    id: fixture.id,
    version: fixture.version,
    profile: fixture.profile,
    values: fixture.values
  }));
  return deepFreeze({ ...snapshot, hash: stableChecksum('provider-fixture/v1', snapshot) });
}

export function replaceProviderValue(fixture: ProviderFixtureDraft, requirementId: string, value: ProviderInputValue): ProviderFixtureDraft {
  return { ...fixture, values: { ...fixture.values, [requirementId]: structuredClone(value) } };
}
