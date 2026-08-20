<script lang="ts">
  import type { SimulationEvent } from '../core/types';

  interface Props {
    events: SimulationEvent[];
    onselect: (tick: number) => void;
  }

  let { events, onselect }: Props = $props();
</script>

<section class="history-panel">
  <header><span class="eyebrow">Causal history</span><h2>What changed—and why</h2></header>
  <div class="events">
    {#each events as event (event.id)}
      <button class="event" onclick={() => onselect(event.tick)}>
        <span class={`kind ${event.kind}`}></span>
        <span class="day">D{event.tick}</span>
        <span class="copy"><strong>{event.title}</strong><small>{event.summary}</small></span>
      </button>
    {/each}
  </div>
</section>

<style>
  .history-panel { padding: 1.15rem; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .eyebrow { color: var(--accent-soft); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
  h2 { margin: 0.18rem 0 0.8rem; font-size: 1.1rem; }
  .events { display: grid; gap: 0.38rem; }
  .event { display: grid; grid-template-columns: 5px 34px 1fr; align-items: start; gap: 0.6rem; width: 100%; padding: 0.58rem; text-align: left; background: rgba(255,255,255,0.025); border: 1px solid transparent; border-radius: var(--radius-sm); }
  .event:hover { background: rgba(255,255,255,0.05); border-color: var(--border); }
  .kind { align-self: stretch; min-height: 28px; background: #b7c7d9; border-radius: 4px; }
  .kind.innovation { background: #68e0a3; }
  .kind.environment { background: #ffb35f; }
  .kind.ecology { background: #74bfff; }
  .kind.legacy { background: #9e82da; }
  .day { padding-top: 0.1rem; color: var(--text-faint); font: 0.65rem var(--font-mono); }
  .copy strong, .copy small { display: block; }
  .copy strong { color: var(--text); font-size: 0.73rem; }
  .copy small { margin-top: 0.15rem; color: var(--text-faint); font-size: 0.64rem; line-height: 1.35; }
</style>
