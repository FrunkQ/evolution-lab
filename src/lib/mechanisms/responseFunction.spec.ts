import { describe, expect, it } from 'vitest';
import {
  RESPONSE_FUNCTION_SCHEMA,
  compileResponseFunction,
  evaluateResponseFunction,
  responseAt,
  type ResponseFunctionDefinition
} from './responseFunction';

const definition: ResponseFunctionDefinition = {
  schemaVersion: RESPONSE_FUNCTION_SCHEMA,
  id: 'test/bounded-response',
  version: '1.0.0',
  title: 'Bounded response',
  input: { coordinateSemantic: 'test/size', coordinateUnit: 'mm', valueSemantic: 'test/opportunity', valueUnit: 'count.mm-1' },
  output: { accessibleSemantic: 'test/captured-opportunity', integratedUnit: 'count' },
  domain: { minimum: 0, maximum: 10 },
  baselineCapture: 0.02,
  bands: [{ center: 5, width: 1, strength: 0.8 }],
  efficiency: 0.5,
  costs: { construction: 1, maintenance: 0.5, repair: 0.25, unit: 'count' },
  evidence: 'fictional',
  limitations: ['Synthetic non-spectral fixture.']
};

describe('generic numeric response functions', () => {
  it('compiles deterministically and does not contain spectral semantics', () => {
    const first = compileResponseFunction(definition);
    const reordered = compileResponseFunction({ ...definition, limitations: [...definition.limitations] });
    expect(first.hash).toBe(reordered.hash);
    expect(responseAt(first, 5)).toBeGreaterThan(responseAt(first, 1));
    expect(first.input.coordinateSemantic).toBe('test/size');
  });

  it('separates incident, captured, returned, accessible and costs', () => {
    const response = compileResponseFunction(definition);
    const result = evaluateResponseFunction(response, {
      coordinateSemantic: 'test/size', coordinateUnit: 'mm', valueSemantic: 'test/opportunity', valueUnit: 'count.mm-1',
      samples: Array.from({ length: 11 }, (_, coordinate) => ({ coordinate, value: 2 }))
    });
    expect(result.incident).toBeCloseTo(result.captured + result.returned, 10);
    expect(result.accessible).toBeCloseTo(result.captured * 0.5, 10);
    expect(result.netAccessible).toBeCloseTo(result.accessible - 0.75, 10);
    expect(result.returnedField.samples).toHaveLength(11);
  });

  it('rejects wrong units and invalid efficiency', () => {
    expect(() => compileResponseFunction({ ...definition, efficiency: 1.2 })).toThrow('efficiency');
    const response = compileResponseFunction(definition);
    expect(() => evaluateResponseFunction(response, {
      coordinateSemantic: 'test/size', coordinateUnit: 'kg', valueSemantic: 'test/opportunity', valueUnit: 'count.mm-1',
      samples: [{ coordinate: 0, value: 1 }, { coordinate: 1, value: 1 }]
    })).toThrow('semantics or units');
  });
});
