import { stableChecksum } from './canonical';

export const HABITAT_GRAPH_SCHEMA = 'evolution-habitat-graph/0.1' as const;

export interface HabitatNodeDefinition {
  id: string;
  type: string;
  label: string;
  facts: Readonly<Record<string, string | number | boolean>>;
}

export interface HabitatLinkDefinition {
  id: string;
  sourceId: string;
  targetId: string;
  relation: string;
  transferFractionPerInterval: number;
  bidirectional: boolean;
}

export interface HabitatGraphDefinition {
  schemaVersion: typeof HABITAT_GRAPH_SCHEMA;
  id: string;
  version: string;
  nodes: readonly HabitatNodeDefinition[];
  links: readonly HabitatLinkDefinition[];
}

export interface CompiledHabitatGraph extends HabitatGraphDefinition {
  readonly hash: string;
  readonly nodeById: ReadonlyMap<string, Readonly<HabitatNodeDefinition>>;
}

const NAMESPACED_ID = /^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9./-]*$/;

export function compileHabitatGraph(definition: HabitatGraphDefinition): CompiledHabitatGraph {
  const issues: string[] = [];
  if (definition.schemaVersion !== HABITAT_GRAPH_SCHEMA) issues.push(`Expected ${HABITAT_GRAPH_SCHEMA}.`);
  if (!NAMESPACED_ID.test(definition.id) || !definition.version.trim()) issues.push('Habitat graphs require namespaced identity and version.');
  if (definition.nodes.length < 2) issues.push('A habitat graph requires at least two nodes.');
  const nodeIds = new Set<string>();
  for (const node of definition.nodes) {
    if (!NAMESPACED_ID.test(node.id) || nodeIds.has(node.id) || !node.type.trim() || !node.label.trim()) {
      issues.push(`Invalid or duplicate habitat node ${node.id}.`);
    }
    nodeIds.add(node.id);
  }
  const linkIds = new Set<string>();
  for (const link of definition.links) {
    if (!NAMESPACED_ID.test(link.id) || linkIds.has(link.id) || !link.relation.trim()) issues.push(`Invalid or duplicate habitat link ${link.id}.`);
    if (!nodeIds.has(link.sourceId) || !nodeIds.has(link.targetId) || link.sourceId === link.targetId) issues.push(`Habitat link ${link.id} has invalid endpoints.`);
    if (!Number.isFinite(link.transferFractionPerInterval) || link.transferFractionPerInterval < 0 || link.transferFractionPerInterval > 1) {
      issues.push(`Habitat link ${link.id} transfer fraction must be between zero and one.`);
    }
    linkIds.add(link.id);
  }
  if (issues.length) throw new Error(issues.join(' '));
  const snapshot = JSON.parse(JSON.stringify(definition)) as HabitatGraphDefinition;
  const nodes: Readonly<HabitatNodeDefinition>[] = [...snapshot.nodes]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) => Object.freeze({ ...node, facts: Object.freeze({ ...node.facts }) }));
  const links: Readonly<HabitatLinkDefinition>[] = [...snapshot.links]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((link) => Object.freeze({ ...link }));
  const nodeById = new Map<string, Readonly<HabitatNodeDefinition>>(nodes.map((node) => [node.id, node]));
  const canonical = { ...snapshot, nodes, links };
  return Object.freeze({ ...canonical, hash: stableChecksum('habitat-graph/v1', canonical), nodeById });
}

export function habitatNeighbours(graph: CompiledHabitatGraph, nodeId: string): readonly string[] {
  if (!graph.nodeById.has(nodeId)) throw new Error(`Unknown habitat node ${nodeId}.`);
  return graph.links.flatMap((link) => {
    if (link.sourceId === nodeId) return [link.targetId];
    if (link.bidirectional && link.targetId === nodeId) return [link.sourceId];
    return [];
  }).sort();
}
