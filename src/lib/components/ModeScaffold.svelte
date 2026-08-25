<script lang="ts">
  import type { InstalledMode } from '../modes/catalog';
  import { formatModeDate } from '../modes/format';

  interface Props { mode: InstalledMode; }
  let { mode }: Props = $props();
</script>

<section class="scaffold" aria-labelledby="scaffold-title">
  <div class="state-band">
    <span>{mode.release.statusLabel}</span>
    <span>Content v{mode.release.version}</span>
    <span>Last edit <time datetime={mode.release.lastUpdated}>{formatModeDate(mode.release.lastUpdated)}</time></span>
  </div>
  <div class="scaffold-intro">
    <span class="eyebrow">{mode.eyebrow}</span>
    <h2 id="scaffold-title">{mode.title} is a defined experiment space, not a running model—yet.</h2>
    <p>{mode.summary}</p>
  </div>

  <div class="contract-grid">
    <section>
      <span class="step">01 · Intended inputs</span>
      <ul>{#each mode.intendedInputs as input}<li>{input}</li>{/each}</ul>
    </section>
    <section>
      <span class="step">02 · Intended outputs</span>
      <ul>{#each mode.intendedOutputs as output}<li>{output}</li>{/each}</ul>
    </section>
    <section class="next-step">
      <span class="step">03 · Next working step</span>
      <p>{mode.nextStep}</p>
    </section>
  </div>

  <aside aria-label="Implementation status">
    <strong>No simulated results are shown on this route.</strong>
    <span>Scenario: not installed · Provider: not connected · Domain rules: not implemented</span>
  </aside>
</section>

<style>
  .scaffold { overflow: hidden; background: rgba(15,17,23,0.82); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .state-band { display: flex; flex-wrap: wrap; gap: 0.45rem 1.2rem; padding: 0.7rem 1rem; color: var(--text-muted); background: #101218; border-bottom: 1px solid var(--border-soft); font: 0.62rem var(--font-mono); }
  .state-band span:first-child { color: #ffd09f; font-weight: 800; text-transform: uppercase; }
  .scaffold-intro { max-width: 850px; padding: clamp(1.2rem, 4vw, 3rem); }
  .eyebrow, .step { color: var(--accent-soft); font-size: 0.61rem; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; }
  h2 { margin: 0.35rem 0 0.7rem; font-size: clamp(1.55rem, 3.5vw, 2.65rem); line-height: 1.08; letter-spacing: -0.035em; }
  .scaffold-intro p { max-width: 710px; margin: 0; color: var(--text-muted); line-height: 1.55; }
  .contract-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--border-soft); }
  .contract-grid section { min-height: 190px; padding: 1.15rem; border-right: 1px solid var(--border-soft); }
  .contract-grid section:last-child { border-right: 0; }
  ul { display: grid; gap: 0.55rem; margin: 0.85rem 0 0; padding: 0; list-style: none; }
  li { position: relative; padding-left: 1rem; color: var(--text-muted); font-size: 0.75rem; line-height: 1.4; }
  li::before { position: absolute; left: 0; content: '◇'; color: #72d6a0; }
  .next-step p { margin: 0.85rem 0 0; color: var(--text); font-size: 0.9rem; line-height: 1.5; }
  aside { display: flex; justify-content: space-between; gap: 1rem; padding: 0.85rem 1.15rem; color: var(--text-faint); background: rgba(255,179,95,0.06); border-top: 1px solid rgba(255,179,95,0.16); font-size: 0.65rem; }
  aside strong { color: #ffd09f; }
  @media (max-width: 780px) { .contract-grid { grid-template-columns: 1fr; } .contract-grid section { min-height: 0; border-right: 0; border-bottom: 1px solid var(--border-soft); } aside { flex-direction: column; } }
</style>
