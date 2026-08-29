import { stableChecksum } from '../core/canonical';

export const RESPONSE_FUNCTION_SCHEMA = 'evolution-response-function/0.1' as const;

export interface NumericFieldSample {
  coordinate: number;
  value: number;
}

export interface NumericField {
  coordinateSemantic: string;
  coordinateUnit: string;
  valueSemantic: string;
  valueUnit: string;
  samples: readonly NumericFieldSample[];
}

export interface ResponseBandDefinition {
  center: number;
  width: number;
  strength: number;
}

export interface ResponseFunctionDefinition {
  schemaVersion: typeof RESPONSE_FUNCTION_SCHEMA;
  id: string;
  version: string;
  title: string;
  input: {
    coordinateSemantic: string;
    coordinateUnit: string;
    valueSemantic: string;
    valueUnit: string;
  };
  output: {
    accessibleSemantic: string;
    integratedUnit: string;
  };
  domain: { minimum: number; maximum: number };
  baselineCapture: number;
  bands: readonly ResponseBandDefinition[];
  efficiency: number;
  costs: {
    construction: number;
    maintenance: number;
    repair: number;
    unit: string;
  };
  evidence: 'observed' | 'demonstrated' | 'inferred' | 'plausible' | 'speculative' | 'fictional';
  limitations: readonly string[];
}

export interface CompiledResponseFunction extends ResponseFunctionDefinition {
  readonly hash: string;
}

export interface ResponseProjection {
  responseId: string;
  responseHash: string;
  incident: number;
  captured: number;
  returned: number;
  accessible: number;
  operatingCost: number;
  netAccessible: number;
  captureFraction: number;
  returnedField: NumericField;
}

const NAMESPACED_ID = /^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9./-]*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function validateResponseFunction(definition: ResponseFunctionDefinition): string[] {
  const issues: string[] = [];
  if (definition.schemaVersion !== RESPONSE_FUNCTION_SCHEMA) issues.push(`Expected ${RESPONSE_FUNCTION_SCHEMA}.`);
  if (!NAMESPACED_ID.test(definition.id)) issues.push('Response functions require a stable namespaced ID.');
  if (!SEMVER.test(definition.version)) issues.push('Response functions require a semantic version.');
  if (!definition.title.trim()) issues.push('Response functions require a title.');
  if (
    !definition.input.coordinateSemantic.trim() ||
    !definition.input.coordinateUnit.trim() ||
    !definition.input.valueSemantic.trim() ||
    !definition.input.valueUnit.trim() ||
    !definition.output.accessibleSemantic.trim() ||
    !definition.output.integratedUnit.trim()
  ) issues.push('Response input and output semantics and units are required.');
  if (!Number.isFinite(definition.domain.minimum) || !(definition.domain.maximum > definition.domain.minimum)) {
    issues.push('Response domain maximum must exceed its finite minimum.');
  }
  if (!Number.isFinite(definition.baselineCapture) || definition.baselineCapture < 0 || definition.baselineCapture > 1) {
    issues.push('Baseline capture must be between zero and one.');
  }
  if (!definition.bands.length) issues.push('Response functions require at least one band.');
  for (const [index, band] of definition.bands.entries()) {
    if (!Number.isFinite(band.center) || band.center < definition.domain.minimum || band.center > definition.domain.maximum) {
      issues.push(`Band ${index} centre lies outside the response domain.`);
    }
    if (!Number.isFinite(band.width) || band.width <= 0 || band.width > definition.domain.maximum - definition.domain.minimum) {
      issues.push(`Band ${index} width must be positive and bounded by the response domain.`);
    }
    if (!Number.isFinite(band.strength) || band.strength < 0 || band.strength > 1) {
      issues.push(`Band ${index} strength must be between zero and one.`);
    }
  }
  if (!Number.isFinite(definition.efficiency) || definition.efficiency <= 0 || definition.efficiency > 1) {
    issues.push('Response efficiency must be greater than zero and no more than one.');
  }
  if (
    definition.costs.unit !== definition.output.integratedUnit ||
    [definition.costs.construction, definition.costs.maintenance, definition.costs.repair]
      .some((value) => !Number.isFinite(value) || value < 0)
  ) issues.push('Response costs must be finite, non-negative and use the integrated output unit.');
  if (!definition.limitations.length || definition.limitations.some((item) => !item.trim())) {
    issues.push('Response functions require explicit limitations.');
  }
  return issues;
}

export function compileResponseFunction(definition: ResponseFunctionDefinition): CompiledResponseFunction {
  const issues = validateResponseFunction(definition);
  if (issues.length) throw new Error(issues.join(' '));
  const snapshot = JSON.parse(JSON.stringify(definition)) as ResponseFunctionDefinition;
  return deepFreeze({ ...snapshot, hash: stableChecksum('response-function/v1', snapshot) });
}

export function responseAt(response: CompiledResponseFunction, coordinate: number): number {
  if (coordinate < response.domain.minimum || coordinate > response.domain.maximum) return 0;
  const strength = response.bands.reduce((sum, band) => {
    const distance = (coordinate - band.center) / band.width;
    return sum + band.strength * Math.exp(-0.5 * distance * distance);
  }, response.baselineCapture);
  return Math.min(1, Math.max(0, strength));
}

function validateField(field: NumericField, response: CompiledResponseFunction): void {
  if (
    field.coordinateSemantic !== response.input.coordinateSemantic ||
    field.coordinateUnit !== response.input.coordinateUnit ||
    field.valueSemantic !== response.input.valueSemantic ||
    field.valueUnit !== response.input.valueUnit
  ) throw new Error(`Field semantics or units do not match response ${response.id}.`);
  if (field.samples.length < 2) throw new Error('A response field requires at least two samples.');
  if (field.samples.some(({ coordinate, value }, index) =>
    !Number.isFinite(coordinate) || !Number.isFinite(value) || value < 0 ||
    (index > 0 && coordinate <= field.samples[index - 1].coordinate)
  )) throw new Error('Response fields require increasing finite coordinates and non-negative finite values.');
}

function binWidth(samples: readonly NumericFieldSample[], index: number): number {
  if (index === 0) return samples[1].coordinate - samples[0].coordinate;
  if (index === samples.length - 1) return samples[index].coordinate - samples[index - 1].coordinate;
  return (samples[index + 1].coordinate - samples[index - 1].coordinate) / 2;
}

export function evaluateResponseFunction(
  response: CompiledResponseFunction,
  field: NumericField
): ResponseProjection {
  validateField(field, response);
  let incident = 0;
  let captured = 0;
  const returnedSamples = field.samples.map((sample, index) => {
    const width = binWidth(field.samples, index);
    const responseFraction = responseAt(response, sample.coordinate);
    incident += sample.value * width;
    captured += sample.value * responseFraction * width;
    return { coordinate: sample.coordinate, value: sample.value * (1 - responseFraction) };
  });
  const returned = Math.max(0, incident - captured);
  const accessible = captured * response.efficiency;
  const operatingCost = response.costs.maintenance + response.costs.repair;
  return {
    responseId: response.id,
    responseHash: response.hash,
    incident,
    captured,
    returned,
    accessible,
    operatingCost,
    netAccessible: accessible - operatingCost,
    captureFraction: incident > 0 ? captured / incident : 0,
    returnedField: {
      coordinateSemantic: field.coordinateSemantic,
      coordinateUnit: field.coordinateUnit,
      valueSemantic: field.valueSemantic,
      valueUnit: field.valueUnit,
      samples: returnedSamples
    }
  };
}
