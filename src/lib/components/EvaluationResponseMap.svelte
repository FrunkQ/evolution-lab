<script lang="ts">
  import type { EvaluationResponseMapView } from '../projections';

  interface Props {
    view: EvaluationResponseMapView;
  }

  let { view }: Props = $props();

  const lightLabel = (value: number) => `${Math.round(value * 100)}% light`;
  const statusSymbol = (status: string) =>
    status === 'recovered' ? '✓' : status === 'survived' ? '≈' : status === 'collapsed' ? '×' : '!';
</script>

<section class="response-panel" aria-labelledby="response-map-title">
  <header>
    <div>
      <span class="eyebrow">{view.eyebrow}</span>
      <h2 id="response-map-title">{view.title}</h2>
      <p>{view.summary}</p>
    </div>
    <div class="axis-guide" aria-label="Map directions">
      <span>Less usable light <b>→</b></span>
      <span>Longer shadow <b>↓</b></span>
    </div>
  </header>

  <div
    class="response-map"
    style:--column-count={view.columnAxis.values.length}
    aria-label="Long-shadow response map"
  >
    <div class="corner">
      <span>Duration ↓</span>
      <span>Light left →</span>
    </div>
    {#each view.columnAxis.values as light (light)}
      <div class="column-heading">
        <strong>{lightLabel(light)}</strong>
        <span>{Math.round((1 - light) * 100)}% removed</span>
      </div>
    {/each}

    {#each view.rowAxis.values as duration (duration)}
      <div class="row-heading">
        <strong>{duration}</strong>
        <span>days</span>
      </div>
      {#each view.columnAxis.values as light (light)}
        {@const cell = view.cells.find((candidate) => candidate.rowValue === duration && candidate.columnValue === light)}
        {#if cell}
          <article
            class={cell.status}
            class:reference={cell.isReference}
            aria-label={`${duration} day shadow with ${lightLabel(light)}: ${cell.statusLabel}. ${cell.headline}.`}
          >
            <div class="cell-top">
              <span class="status"><b aria-hidden="true">{statusSymbol(cell.status)}</b>{cell.statusLabel}</span>
              {#if cell.isReference}<span class="reference-badge">Current graph</span>{/if}
            </div>
            <strong class="headline">{cell.headline}</strong>
            <dl>
              {#each cell.measures as measure (measure.label)}
                <div><dt>{measure.label}</dt><dd>{measure.value}</dd></div>
              {/each}
            </dl>
          </article>
        {/if}
      {/each}
    {/each}
  </div>

  <footer>
    <p><strong>How to read it:</strong> “Control” means the same community on the same day without the long shadow. Recovery means living mass stayed at or above the profile’s threshold for its full waiting period.</p>
    <details>
      <summary>Show the pinned comparison identity</summary>
      <code>{view.profile.id}@{view.profile.version} · {view.profile.hash}</code>
      <code>parent · {view.parentCheckpointHash}</code>
    </details>
  </footer>
</section>

<style>
  .response-panel { margin-top: 0.8rem; padding: 1rem; overflow: hidden; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  header { display: flex; justify-content: space-between; gap: 1.2rem; align-items: flex-end; }
  .eyebrow { color: var(--accent-soft); font-size: 0.61rem; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; }
  h2 { margin: 0.24rem 0 0.3rem; font-size: 1.2rem; }
  header p { max-width: 760px; margin: 0; color: var(--text-muted); font-size: 0.72rem; line-height: 1.5; }
  .axis-guide { flex: 0 0 auto; display: grid; gap: 0.28rem; padding: 0.55rem 0.65rem; color: var(--text-faint); background: #101319; border: 1px solid var(--border-soft); border-radius: var(--radius-md); font: 0.57rem var(--font-mono); }
  .axis-guide b { color: var(--accent-soft); }
  .response-map { display: grid; grid-template-columns: 76px repeat(var(--column-count), minmax(190px, 1fr)); gap: 0.42rem; margin-top: 0.85rem; min-width: 700px; }
  .corner, .column-heading, .row-heading { display: flex; flex-direction: column; justify-content: center; min-height: 42px; padding: 0.42rem; color: var(--text-faint); background: #0d0f14; border: 1px solid var(--border-soft); border-radius: 7px; }
  .corner { font: 0.54rem var(--font-mono); }
  .column-heading { align-items: center; text-align: center; }
  .column-heading strong, .row-heading strong { color: #dce2ea; font: 750 0.72rem var(--font-mono); }
  .column-heading span, .row-heading span { margin-top: 0.1rem; font-size: 0.53rem; }
  .row-heading { align-items: center; }
  .row-heading strong { font-size: 0.9rem; }
  article { min-width: 0; padding: 0.68rem; background: #101319; border: 1px solid #2b323d; border-top: 3px solid #68e0a3; border-radius: 8px; }
  article.survived { border-top-color: #ffc46b; }
  article.collapsed, article.invalid { border-top-color: #f07f73; }
  article.reference { box-shadow: inset 0 0 0 1px #8ebcff; }
  .cell-top { display: flex; justify-content: space-between; gap: 0.4rem; align-items: center; }
  .status { display: inline-flex; gap: 0.3rem; align-items: center; color: #a9edc5; font: 750 0.57rem var(--font-mono); text-transform: uppercase; }
  .survived .status { color: #ffe0a8; }
  .collapsed .status, .invalid .status { color: #ffc0b8; }
  .status b { display: grid; place-items: center; width: 16px; height: 16px; color: #0d1014; background: currentColor; border-radius: 50%; font-size: 0.63rem; }
  .reference-badge { padding: 0.17rem 0.3rem; color: #b9d9ff; background: rgba(89,139,255,0.1); border: 1px solid rgba(142,188,255,0.35); border-radius: 999px; font: 0.49rem var(--font-mono); text-transform: uppercase; }
  .headline { display: block; margin-top: 0.45rem; color: #edf0f4; font-size: 0.7rem; line-height: 1.35; }
  dl { display: grid; gap: 0.25rem; margin: 0.5rem 0 0; }
  dl div { display: flex; justify-content: space-between; gap: 0.45rem; padding-top: 0.25rem; border-top: 1px solid #222832; }
  dt { color: var(--text-faint); font-size: 0.52rem; line-height: 1.3; }
  dd { margin: 0; color: var(--text-muted); font: 650 0.54rem var(--font-mono); text-align: right; }
  footer { display: flex; justify-content: space-between; gap: 1rem; margin-top: 0.7rem; padding-top: 0.65rem; border-top: 1px solid var(--border-soft); }
  footer p { max-width: 760px; margin: 0; color: var(--text-faint); font-size: 0.61rem; line-height: 1.45; }
  footer strong { color: var(--text-muted); }
  details { flex: 0 0 auto; color: var(--text-faint); font-size: 0.57rem; }
  summary { cursor: pointer; }
  code { display: block; margin-top: 0.25rem; max-width: 360px; overflow-wrap: anywhere; color: #9ebbd4; font: 0.51rem var(--font-mono); }
  @media (max-width: 850px) {
    .response-panel { overflow-x: auto; }
    header, footer { align-items: flex-start; flex-direction: column; min-width: 700px; }
    .axis-guide { grid-template-columns: auto auto; }
  }
</style>
