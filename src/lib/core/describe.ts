import type { LineageDefinition, PopulationState, VocabularyLayer, WorldSnapshot } from './types';

export function describeLineage(lineage: LineageDefinition, layer: VocabularyLayer): string {
  return lineage.vocabulary[layer];
}

export function explainPopulation(
  lineage: LineageDefinition,
  population: PopulationState,
  snapshot: WorldSnapshot
): string {
  if (!population.active) {
    return `${lineage.shortName} have not emerged by day ${snapshot.tick}.`;
  }
  if (population.stress > 0.65) {
    return `${lineage.shortName} are under severe resource stress. Their current capabilities cannot fully exploit the available habitat.`;
  }
  if (population.productivity < -0.05) {
    return `${lineage.shortName} are declining because maintenance and losses exceed new growth.`;
  }
  if (population.productivity > 0.2) {
    return `${lineage.shortName} are expanding while their limiting resources remain accessible.`;
  }
  return `${lineage.shortName} are close to a temporary ecological balance.`;
}
