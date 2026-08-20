<script lang="ts">
  import { describeLineage, explainPopulation } from '../core/describe';
  import type {
    LineageDefinition,
    PopulationState,
    VocabularyLayer,
    WorldSnapshot
  } from '../core/types';

  interface Props {
    lineage: LineageDefinition;
    population: PopulationState;
    snapshot: WorldSnapshot;
    layer: VocabularyLayer;
  }

  let { lineage, population, snapshot, layer }: Props = $props();
  const status = $derived(explainPopulation(lineage, population, snapshot));
  const description = $derived(describeLineage(lineage, layer));
</script>

<aside class="inspector" style={`--lineage: ${lineage.color}`}>
  <header>
    <div class="organism-mark"><span></span><span></span><span></span></div>
    <div>
      <span class="eyebrow">Selected lineage</span>
      <h2>{lineage.shortName}</h2>
      <p class="habitat">{lineage.habitat}</p>
    </div>
  </header>

  <p class="description">{description}</p>

  <div class="vitals">
    <div><span>Biomass</span><strong>{population.active ? population.biomass.toFixed(1) : '—'}</strong></div>
    <div class:falling={population.productivity < 0}>
      <span>Daily change</span>
      <strong>{population.active ? `${population.productivity >= 0 ? '+' : ''}${population.productivity.toFixed(2)}` : '—'}</strong>
    </div>
    <div class:warning={population.stress > 0.5}>
      <span>Stress</span><strong>{population.active ? `${Math.round(population.stress * 100)}%` : '—'}</strong>
    </div>
  </div>

  <section class="why">
    <span class="eyebrow">Why now?</span>
    <p>{status}</p>
  </section>

  <section>
    <span class="eyebrow">Capability loadout</span>
    <div class="capabilities">
      {#each lineage.capabilities as capability (capability.id)}
        <div class="capability" title={`Cost: ${capability.cost}`}>
          <span class={`kind ${capability.kind}`}></span>
          <div><strong>{capability.label}</strong><small>{capability.cost}</small></div>
        </div>
      {/each}
    </div>
  </section>
</aside>

<style>
  .inspector {
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
    min-width: 0;
    padding: 1.25rem;
    background: linear-gradient(155deg, color-mix(in srgb, var(--lineage) 9%, #171920), #101218 55%);
    border: 1px solid color-mix(in srgb, var(--lineage) 28%, var(--border));
    border-radius: var(--radius-lg);
  }

  header { display: flex; align-items: center; gap: 0.9rem; }
  h2 { margin: 0.12rem 0; font-size: 1.35rem; }
  .eyebrow {
    color: color-mix(in srgb, var(--lineage) 80%, white);
    font-size: 0.64rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .habitat { margin: 0; color: var(--text-muted); font-size: 0.76rem; }
  .description { margin: 0; color: #d7dbe2; font-size: 0.94rem; line-height: 1.62; }

  .organism-mark {
    position: relative;
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
    background: color-mix(in srgb, var(--lineage) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--lineage) 40%, transparent);
    border-radius: 50% 46% 52% 42%;
    box-shadow: 0 0 26px color-mix(in srgb, var(--lineage) 18%, transparent);
  }
  .organism-mark span { position: absolute; background: var(--lineage); border-radius: 50%; }
  .organism-mark span:nth-child(1) { width: 12px; height: 12px; left: 11px; top: 10px; }
  .organism-mark span:nth-child(2) { width: 8px; height: 8px; right: 9px; top: 18px; opacity: 0.7; }
  .organism-mark span:nth-child(3) { width: 6px; height: 6px; left: 21px; bottom: 8px; opacity: 0.45; }

  .vitals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.55rem; }
  .vitals div { padding: 0.72rem; background: rgba(255,255,255,0.035); border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
  .vitals span { display: block; color: var(--text-faint); font-size: 0.6rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .vitals strong { display: block; margin-top: 0.3rem; font-family: var(--font-mono); font-size: 0.92rem; }
  .vitals .falling strong, .vitals .warning strong { color: #ff8f80; }

  .why { padding: 0.95rem; background: rgba(255,255,255,0.035); border-left: 2px solid var(--lineage); border-radius: 0 var(--radius-md) var(--radius-md) 0; }
  .why p { margin: 0.45rem 0 0; color: var(--text-muted); font-size: 0.82rem; line-height: 1.5; }

  .capabilities { display: grid; gap: 0.45rem; margin-top: 0.65rem; }
  .capability { display: flex; align-items: center; gap: 0.65rem; padding: 0.55rem 0.65rem; background: rgba(0,0,0,0.16); border-radius: var(--radius-sm); }
  .capability .kind { width: 7px; height: 22px; border-radius: 9px; background: #9e82da; }
  .capability .kind.metabolism { background: #68e0a3; }
  .capability .kind.survival { background: #74bfff; }
  .capability .kind.interaction { background: #f07f73; }
  .capability strong, .capability small { display: block; }
  .capability strong { font-size: 0.76rem; }
  .capability small { margin-top: 0.12rem; color: var(--text-faint); font-size: 0.65rem; }
</style>
