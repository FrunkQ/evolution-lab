<script lang="ts">
  import type { InstalledMode } from '../modes/catalog';
  import { formatModeDate } from '../modes/format';

  interface Props { modes: readonly InstalledMode[]; }
  let { modes }: Props = $props();
</script>

<section class="catalogue" aria-labelledby="catalogue-title">
  <div class="catalogue-heading">
    <div>
      <span class="eyebrow">Installed modes</span>
      <h2 id="catalogue-title">Choose an experiment space</h2>
      <p>One application; each route selects one explicit mode identity.</p>
    </div>
    <span class="sort-label">Recently updated · newest first</span>
  </div>

  <div class="mode-cards">
    {#each modes as mode (mode.id)}
      <article class:live={mode.release.lifecycle === 'live'}>
        <div class="card-top">
          <span class={`status ${mode.release.lifecycle}`}>{mode.release.statusLabel}</span>
          <span class="route">{mode.route}</span>
        </div>
        <span class="overline">{mode.eyebrow}</span>
        <h3>{mode.title}</h3>
        <p>{mode.summary}</p>
        <dl>
          <div><dt>Content</dt><dd>v{mode.release.version}</dd></div>
          <div><dt>Last edit</dt><dd><time datetime={mode.release.lastUpdated}>{formatModeDate(mode.release.lastUpdated)}</time></dd></div>
          <div><dt>Scenario</dt><dd>{mode.composition.scenarioIdentity ?? 'Not installed'}</dd></div>
        </dl>
        <div class="focus"><span>Current focus</span><strong>{mode.release.currentFocus}</strong></div>
        <a href={mode.route} aria-label={`Open ${mode.title}: ${mode.release.statusLabel}`}>
          {mode.release.lifecycle === 'live' ? 'Open experiment' : 'View scaffold'}
          <span aria-hidden="true">→</span>
        </a>
      </article>
    {/each}
  </div>
</section>

<style>
  .catalogue { padding: clamp(1rem, 2vw, 1.5rem); background: rgba(15,17,23,0.78); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .catalogue-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; }
  .eyebrow { color: var(--accent-soft); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
  h2 { margin: 0.22rem 0 0.25rem; font-size: clamp(1.3rem, 2.4vw, 1.8rem); }
  .catalogue-heading p { margin: 0; color: var(--text-muted); font-size: 0.8rem; }
  .sort-label { flex: 0 0 auto; color: var(--text-faint); font: 0.62rem var(--font-mono); }
  .mode-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; margin-top: 1.2rem; }
  article { display: flex; min-height: 355px; flex-direction: column; padding: 1rem; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  article.live { border-color: rgba(104,224,163,0.38); box-shadow: inset 0 3px 0 rgba(104,224,163,0.72); }
  .card-top { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 1.1rem; }
  .status { padding: 0.25rem 0.42rem; color: #d6d9df; background: #292d36; border: 1px solid #3b404b; border-radius: 999px; font-size: 0.58rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
  .status.live { color: #a8f0c6; background: rgba(55,139,93,0.16); border-color: rgba(104,224,163,0.34); }
  .route { color: var(--text-faint); font: 0.62rem var(--font-mono); }
  .overline { color: #72d6a0; font-size: 0.59rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
  h3 { margin: 0.25rem 0 0.45rem; font-size: 1.35rem; }
  article > p { min-height: 4.25rem; margin: 0; color: var(--text-muted); font-size: 0.76rem; line-height: 1.48; }
  dl { display: grid; gap: 0.3rem; margin: 1rem 0 0; padding-top: 0.8rem; border-top: 1px solid var(--border-soft); }
  dl div { display: grid; grid-template-columns: 68px minmax(0,1fr); gap: 0.5rem; }
  dt { color: var(--text-faint); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.07em; }
  dd { min-width: 0; margin: 0; overflow-wrap: anywhere; color: var(--text-muted); font: 0.62rem var(--font-mono); }
  .focus { margin-top: 0.85rem; padding: 0.65rem; background: #0e1015; border-radius: var(--radius-md); }
  .focus span, .focus strong { display: block; }
  .focus span { color: var(--text-faint); font-size: 0.55rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .focus strong { margin-top: 0.25rem; color: var(--text-muted); font-size: 0.68rem; line-height: 1.35; }
  article > a { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding: 0.72rem 0.78rem; color: white; background: #252933; border: 1px solid #383d49; border-radius: var(--radius-md); font-size: 0.72rem; font-weight: 800; text-decoration: none; }
  article.live > a { color: #07130d; background: #68e0a3; border-color: #68e0a3; }
  article > a:hover { filter: brightness(1.08); }
  article > a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (max-width: 920px) { .mode-cards { grid-template-columns: 1fr; } article { min-height: 0; } article > p { min-height: 0; } }
  @media (max-width: 620px) { .catalogue-heading { align-items: flex-start; flex-direction: column; } .mode-cards { margin-top: 0.9rem; } }
</style>
