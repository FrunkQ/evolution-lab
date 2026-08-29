import { describe, expect, it } from 'vitest';
import { HABITAT_GRAPH_SCHEMA, compileHabitatGraph, habitatNeighbours } from './habitatGraph';

describe('generic habitat graph', () => {
  it('compiles stable node/link order and resolves bidirectional neighbours', () => {
    const graph = compileHabitatGraph({
      schemaVersion: HABITAT_GRAPH_SCHEMA,
      id: 'test/connected-regions', version: '1.0.0',
      nodes: [
        { id: 'region/deep', type: 'region', label: 'Deep', facts: { depth: 2 } },
        { id: 'region/surface', type: 'region', label: 'Surface', facts: { depth: 0 } }
      ],
      links: [{ id: 'transport/mixing', sourceId: 'region/surface', targetId: 'region/deep', relation: 'mixes-with', transferFractionPerInterval: 0.1, bidirectional: true }]
    });
    expect(graph.nodes.map(({ id }) => id)).toEqual(['region/deep', 'region/surface']);
    expect(habitatNeighbours(graph, 'region/deep')).toEqual(['region/surface']);
    expect(graph.hash).toMatch(/^habitat-graph\/v1-/);
  });

  it('rejects unknown endpoints and over-unity transport', () => {
    expect(() => compileHabitatGraph({
      schemaVersion: HABITAT_GRAPH_SCHEMA,
      id: 'test/bad-regions', version: '1.0.0',
      nodes: [
        { id: 'region/a', type: 'region', label: 'A', facts: {} },
        { id: 'region/b', type: 'region', label: 'B', facts: {} }
      ],
      links: [{ id: 'transport/bad', sourceId: 'region/a', targetId: 'region/missing', relation: 'moves-to', transferFractionPerInterval: 2, bidirectional: false }]
    })).toThrow('invalid endpoints');
  });
});
