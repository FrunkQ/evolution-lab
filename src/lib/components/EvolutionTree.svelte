<script lang="ts">
  import type {
    LineageDefinition,
    PopulationState,
    TreeLens,
    WorldSnapshot
  } from '../core/types';

  interface Props {
    lineages: LineageDefinition[];
    snapshot: WorldSnapshot;
    selectedId: string;
    lens: TreeLens;
    maxTick: number;
    onselect: (lineageId: string) => void;
  }

  let { lineages, snapshot, selectedId, lens, maxTick, onselect }: Props = $props();

  const lanes = [205, 82, 228, 354, 300, 130, 400];
  const populationById = $derived(
    new Map(snapshot.populations.map((population) => [population.lineageId, population]))
  );

  const positions = $derived(
    new Map(
      lineages.map((lineage, index) => [
        lineage.id,
        {
          x: 86 + (lineage.emergedAt / maxTick) * 560,
          y: lanes[index] ?? 70 + index * 62
        }
      ])
    )
  );

  const activeLineages = $derived(
    lineages.filter((lineage) => (populationById.get(lineage.id)?.active ?? false))
  );

  const ancestryEdges = $derived(
    activeLineages
      .filter((lineage) => lineage.parentId && positions.has(lineage.parentId))
      .map((lineage) => ({
        source: lineage.parentId!,
        target: lineage.id,
        label: 'descent',
        color: '#596271'
      }))
  );

  const resourceCandidates = [
    ['light-weavers', 'veil-grazers', 'living biomass', '#ef8a7f'],
    ['basal-loop', 'silt-recyclers', 'remains', '#c59565'],
    ['light-weavers', 'silt-recyclers', 'detritus', '#c59565'],
    ['veil-grazers', 'silt-recyclers', 'waste', '#c59565'],
    ['silt-recyclers', 'light-weavers', 'minerals', '#7fc69a']
  ] as const;

  const resourceEdges = $derived(
    resourceCandidates
      .filter(
        ([source, target]) =>
          populationById.get(source)?.active && populationById.get(target)?.active
      )
      .map(([source, target, label, color]) => ({ source, target, label, color }))
  );

  const capabilityEdges = $derived.by(() => {
    const edges: { source: string; target: string; label: string; color: string }[] = [];
    for (let i = 0; i < activeLineages.length; i += 1) {
      for (let j = i + 1; j < activeLineages.length; j += 1) {
        const left = activeLineages[i];
        const right = activeLineages[j];
        const rightCapabilities = new Set(right.capabilities.map((capability) => capability.id));
        const shared = left.capabilities.find((capability) => rightCapabilities.has(capability.id));
        if (shared) {
          edges.push({
            source: left.id,
            target: right.id,
            label: shared.label,
            color: '#9e82da'
          });
        }
      }
    }
    return edges;
  });

  const visibleEdges = $derived(
    lens === 'ancestry' ? ancestryEdges : lens === 'resources' ? resourceEdges : capabilityEdges
  );

  const safePopulation = (lineageId: string): PopulationState =>
    populationById.get(lineageId) ?? {
      lineageId,
      biomass: 0,
      productivity: 0,
      stress: 0,
      active: false
    };

  const curve = (source: string, target: string) => {
    const from = positions.get(source)!;
    const to = positions.get(target)!;
    const bend = Math.max(44, Math.abs(to.x - from.x) * 0.42);
    return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
  };

  const activate = (event: KeyboardEvent, lineageId: string) => {
    if (event.key === 'Enter' || event.key === ' ') onselect(lineageId);
  };
</script>

<section class="tree-shell" aria-label="Interactive evolutionary network">
  <div class="tree-header">
    <div>
      <span class="eyebrow">Shared evolutionary view</span>
      <h2>{lens === 'ancestry' ? 'Who came from whom?' : lens === 'resources' ? 'Who feeds whom?' : 'Who shares what?'}</h2>
    </div>
    <div class="live-key"><span></span> biomass at day {snapshot.tick}</div>
  </div>

  <div class="tree-viewport">
    <svg viewBox="0 0 720 430" role="img" aria-label="Evolutionary lineage graph">
      <defs>
        <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="context-stroke" />
        </marker>
        <linearGradient id="time-wash" x1="0" x2="1">
          <stop offset="0" stop-color="#68e0a3" stop-opacity="0.08" />
          <stop offset="1" stop-color="#ff7c5c" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <rect x="48" y="34" width="620" height="360" rx="18" fill="url(#time-wash)" />
      <line x1="70" y1="396" x2="676" y2="396" class="time-axis" />
      <text x="70" y="418" class="axis-label">SEED</text>
      <text x="676" y="418" class="axis-label end">DAY {maxTick}</text>
      <line
        x1={86 + (snapshot.tick / maxTick) * 560}
        x2={86 + (snapshot.tick / maxTick) * 560}
        y1="42"
        y2="392"
        class="now-line"
      />

      {#each visibleEdges as edge (`${lens}-${edge.source}-${edge.target}`)}
        <path
          d={curve(edge.source, edge.target)}
          class:resource-edge={lens === 'resources'}
          class="network-edge"
          stroke={edge.color}
          marker-end={lens === 'resources' ? 'url(#arrow)' : undefined}
        />
        {#if lens !== 'ancestry'}
          {@const from = positions.get(edge.source)!}
          {@const to = positions.get(edge.target)!}
          <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} class="edge-label">
            {edge.label}
          </text>
        {/if}
      {/each}

      {#each lineages as lineage (lineage.id)}
        {@const position = positions.get(lineage.id)!}
        {@const population = safePopulation(lineage.id)}
        {@const visible = lineage.emergedAt <= snapshot.tick && population.active}
        {@const radius = visible ? 18 + Math.min(18, Math.sqrt(population.biomass) * 1.5) : 13}
        <g
          class:inactive={!visible}
          class:selected={selectedId === lineage.id}
          class="lineage-node"
          role="button"
          tabindex="0"
          aria-label={`Select ${lineage.shortName}`}
          onclick={() => onselect(lineage.id)}
          onkeydown={(event) => activate(event, lineage.id)}
        >
          <circle
            cx={position.x}
            cy={position.y}
            r={radius + (selectedId === lineage.id ? 8 : 0)}
            fill="none"
            stroke={lineage.color}
            class="selection-ring"
          />
          <circle
            cx={position.x}
            cy={position.y}
            r={radius}
            fill={visible ? lineage.color : '#222630'}
            stroke={lineage.color}
            filter={visible ? 'url(#node-glow)' : undefined}
          />
          {#if visible}
            <circle cx={position.x - radius * 0.25} cy={position.y - radius * 0.3} r={radius * 0.2} class="cell-shine" />
          {/if}
          <text x={position.x} y={position.y + radius + 22} class="node-name">{lineage.shortName}</text>
          <text x={position.x} y={position.y + radius + 38} class="node-meta">
            {visible ? `${population.biomass.toFixed(1)} biomass` : `emerges after day ${lineage.emergedAt}`}
          </text>
        </g>
      {/each}
    </svg>
  </div>
</section>

<style>
  .tree-shell {
    min-width: 0;
    background: linear-gradient(145deg, rgba(20, 22, 28, 0.98), rgba(12, 14, 19, 0.98));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .tree-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.2rem 0.2rem;
  }

  .eyebrow {
    color: var(--accent-soft);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0.2rem 0 0;
    font-size: clamp(1.05rem, 2vw, 1.38rem);
    font-weight: 680;
  }

  .live-key {
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.67rem;
    white-space: nowrap;
  }

  .live-key span {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 0.35rem;
    background: #68e0a3;
    border-radius: 50%;
    box-shadow: 0 0 10px #68e0a3;
  }

  .tree-viewport {
    min-height: 390px;
    overflow-x: auto;
  }

  svg {
    display: block;
    width: 100%;
    min-width: 620px;
    height: auto;
  }

  .time-axis { stroke: #343945; stroke-width: 1; }
  .axis-label, .edge-label, .node-meta {
    fill: var(--text-faint);
    font: 600 9px var(--font-mono);
    letter-spacing: 0.08em;
  }
  .axis-label.end { text-anchor: end; }
  .now-line { stroke: var(--accent); stroke-width: 1; stroke-dasharray: 3 6; opacity: 0.6; }
  .network-edge { fill: none; stroke-width: 2; opacity: 0.58; }
  .network-edge.resource-edge { stroke-width: 2.8; opacity: 0.78; }
  .edge-label { text-anchor: middle; fill: #9299a7; paint-order: stroke; stroke: #101218; stroke-width: 4px; }

  .lineage-node { cursor: pointer; outline: none; }
  .lineage-node circle { transition: opacity 160ms ease, stroke-width 160ms ease; }
  .lineage-node:hover .selection-ring,
  .lineage-node:focus .selection-ring,
  .lineage-node.selected .selection-ring { opacity: 0.8; stroke-width: 2; }
  .selection-ring { opacity: 0; stroke-width: 1; stroke-dasharray: 4 5; }
  .lineage-node.inactive { opacity: 0.38; }
  .cell-shine { fill: rgba(255, 255, 255, 0.46); }
  .node-name {
    fill: var(--text);
    font: 700 11px var(--font-ui);
    text-anchor: middle;
  }
  .node-meta { text-anchor: middle; letter-spacing: 0; }

  @media (max-width: 720px) {
    .tree-header { align-items: flex-start; flex-direction: column; }
    .tree-viewport { min-height: 350px; }
  }
</style>
