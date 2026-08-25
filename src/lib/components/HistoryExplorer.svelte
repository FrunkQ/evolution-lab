<script lang="ts">
  import LevelsThroughTime from './LevelsThroughTime.svelte';
  import type { TemporalProjection, TemporalSeriesStyle } from '../projections';

  interface Props {
    projections: readonly TemporalProjection[];
    styles: readonly TemporalSeriesStyle[];
    value: number;
    onselect: (tick: number) => void;
  }

  let { projections, styles, value, onselect }: Props = $props();
  let activeId = $state('');
  const activeProjection = $derived(
    projections.find((projection) => projection.id === activeId) ?? projections[0]
  );
</script>

<section class="history-explorer" aria-labelledby="history-view-title">
  <div class="view-heading">
    <div>
      <span class="eyebrow">Choose what the stored history shows</span>
      <h2 id="history-view-title">One run, several honest views</h2>
    </div>
    <div class="history-tabs" role="tablist" aria-label="History quantity">
      {#each projections as projection (projection.id)}
        <button
          type="button"
          role="tab"
          aria-selected={activeProjection?.id === projection.id}
          class:active={activeProjection?.id === projection.id}
          onclick={() => (activeId = projection.id)}
        >
          {projection.selectorLabel}
        </button>
      {/each}
    </div>
  </div>

  {#if activeProjection}
    {#key activeProjection.id}
      <LevelsThroughTime projection={activeProjection} {styles} {value} {onselect} />
    {/key}
  {/if}
</section>

<style>
  .history-explorer { margin-top: 0.8rem; }
  .view-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; padding: 0.85rem 1rem 0; background: var(--bg-panel); border: 1px solid var(--border); border-bottom: 0; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
  .eyebrow { color: var(--accent-soft); font-size: 0.59rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
  h2 { margin: 0.18rem 0 0.75rem; font-size: 0.92rem; }
  .history-tabs { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.28rem; padding-bottom: 0.7rem; }
  button { padding: 0.42rem 0.58rem; color: var(--text-muted); background: #101218; border: 1px solid var(--border-soft); border-radius: 6px; font-size: 0.63rem; font-weight: 750; }
  button:hover { color: white; border-color: #46505f; }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  button.active { color: white; background: #2a2e38; border-color: #4f5a6a; box-shadow: inset 0 -2px 0 var(--accent); }
  :global(.history-explorer > .levels-panel) { margin-top: 0; border-top-left-radius: 0; border-top-right-radius: 0; }
  @media (max-width: 760px) {
    .view-heading { align-items: stretch; flex-direction: column; padding-bottom: 0.75rem; }
    h2 { margin-bottom: 0; }
    .history-tabs { justify-content: flex-start; padding-bottom: 0; }
    button { flex: 1 1 calc(50% - 0.3rem); }
  }
</style>