<script lang="ts">
  import type { FlowRecord, ResourceKey, ResourceLedger, SignatureState } from '../core/types';

  interface Props {
    resources: ResourceLedger;
    flows: FlowRecord[];
    signatures: SignatureState;
  }

  let { resources, flows, signatures }: Props = $props();

  const meta: Record<ResourceKey, { label: string; color: string; max: number }> = {
    light: { label: 'Accessible light', color: '#ffe078', max: 90 },
    carbon: { label: 'Dissolved carbon', color: '#a7b8ca', max: 260 },
    minerals: { label: 'Mineral nutrients', color: '#8bc9a1', max: 250 },
    oxygen: { label: 'Reactive oxygen', color: '#76c8ff', max: 240 },
    detritus: { label: 'Detritus pool', color: '#d19c67', max: 120 }
  };

  const entries = $derived(
    (Object.keys(meta) as ResourceKey[]).map((key) => ({ key, value: resources[key], ...meta[key] }))
  );
  const strongestFlows = $derived([...flows].sort((a, b) => b.amount - a.amount).slice(0, 5));
</script>

<section class="field-panel">
  <header>
    <div><span class="eyebrow">Material & energy</span><h2>Microcosm field</h2></div>
    <span class="unit">experimental units</span>
  </header>

  <div class="resource-grid">
    {#each entries as entry (entry.key)}
      <div class="resource">
        <div class="resource-label"><span>{entry.label}</span><strong>{entry.value.toFixed(1)}</strong></div>
        <div class="track"><span style={`width: ${Math.min(100, (entry.value / entry.max) * 100)}%; background: ${entry.color}`}></span></div>
      </div>
    {/each}
  </div>

  <div class="lower-grid">
    <div>
      <span class="eyebrow">Active transformations</span>
      <div class="flows">
        {#each strongestFlows as flow (`${flow.source}-${flow.target}-${flow.resource}`)}
          <div class="flow">
            <span class="flow-dot" style={`background:${flow.color}`}></span>
            <span>{flow.source} <b>→</b> {flow.target}</span>
            <strong>{flow.amount.toFixed(2)}</strong>
          </div>
        {:else}
          <p>No measurable transformation at this time.</p>
        {/each}
      </div>
    </div>

    <div class="memory">
      <span class="eyebrow">Environmental memory</span>
      <div class="memory-cards">
        <div><strong>{signatures.oxidizedMinerals.toFixed(1)}</strong><span>oxidised mineral record</span></div>
        <div><strong>{signatures.organicSediment.toFixed(1)}</strong><span>buried organic record</span></div>
      </div>
    </div>
  </div>
</section>

<style>
  .field-panel {
    padding: 1.15rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; }
  h2 { margin: 0.18rem 0 0; font-size: 1.1rem; }
  .eyebrow { color: var(--accent-soft); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
  .unit { color: var(--text-faint); font: 0.64rem var(--font-mono); }
  .resource-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-top: 1rem; }
  .resource-label { display: flex; justify-content: space-between; gap: 0.4rem; color: var(--text-muted); font-size: 0.67rem; }
  .resource-label strong { color: var(--text); font-family: var(--font-mono); }
  .track { height: 5px; margin-top: 0.42rem; overflow: hidden; background: #282c35; border-radius: 8px; }
  .track span { display: block; height: 100%; border-radius: inherit; box-shadow: 0 0 12px currentColor; }
  .lower-grid { display: grid; grid-template-columns: 1.35fr 0.65fr; gap: 1.2rem; margin-top: 1.2rem; padding-top: 1rem; border-top: 1px solid var(--border-soft); }
  .flows { display: grid; gap: 0.35rem; margin-top: 0.55rem; }
  .flow { display: grid; grid-template-columns: 8px 1fr auto; align-items: center; gap: 0.45rem; color: var(--text-muted); font-size: 0.68rem; }
  .flow b { color: var(--text-faint); }
  .flow strong { color: var(--text); font-family: var(--font-mono); font-size: 0.65rem; }
  .flow-dot { width: 6px; height: 6px; border-radius: 50%; }
  .flows p { margin: 0; color: var(--text-faint); font-size: 0.72rem; }
  .memory-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; margin-top: 0.55rem; }
  .memory-cards div { padding: 0.65rem; background: #0e1015; border-radius: var(--radius-md); }
  .memory-cards strong { display: block; color: #78c8ff; font-family: var(--font-mono); font-size: 1rem; }
  .memory-cards span { display: block; margin-top: 0.25rem; color: var(--text-faint); font-size: 0.58rem; line-height: 1.25; }

  @media (max-width: 780px) {
    .resource-grid { grid-template-columns: repeat(2, 1fr); }
    .lower-grid { grid-template-columns: 1fr; }
  }
</style>
