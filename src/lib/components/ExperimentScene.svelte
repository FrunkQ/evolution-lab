<script lang="ts">
  import type { ExperimentSceneView } from '../projections/scene';
  interface Props { view: ExperimentSceneView; }
  let { view }: Props = $props();
</script>

<section class="scene" aria-labelledby="scene-title">
  <div class="scene-main"><span class="eyebrow">{view.eyebrow}</span><h2 id="scene-title">{view.title}</h2><p>{view.setting}</p></div>
  <div class="scene-cards">
    <div><span>What is assumed</span><p>{view.premise}</p></div>
    <div><span>What we are asking</span><p>{view.question}</p></div>
  </div>
  <p class="boundary"><strong>Claim boundary:</strong> {view.boundary}</p>
</section>

<style>
  .scene { margin-bottom: 0.8rem; overflow: hidden; background: linear-gradient(125deg, rgba(104,224,163,0.08), rgba(255,90,31,0.035)), #111319; border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .scene-main { max-width: 900px; padding: 1.15rem 1.25rem 0.95rem; }
  .eyebrow { color: #72d6a0; font-size: 0.61rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
  h2 { margin: 0.28rem 0 0.48rem; font-size: clamp(1.2rem, 2.3vw, 1.75rem); }
  .scene-main p { margin: 0; color: var(--text-muted); font-size: 0.78rem; line-height: 1.55; }
  .scene-cards { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--border-soft); }
  .scene-cards div { padding: 0.85rem 1.2rem; }
  .scene-cards div + div { border-left: 1px solid var(--border-soft); }
  .scene-cards span { color: var(--text-faint); font-size: 0.56rem; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; }
  .scene-cards p { margin: 0.3rem 0 0; color: #cdd1d8; font-size: 0.72rem; line-height: 1.45; }
  .boundary { margin: 0; padding: 0.7rem 1.2rem; color: var(--text-faint); background: rgba(0,0,0,0.18); border-top: 1px solid var(--border-soft); font-size: 0.63rem; line-height: 1.45; }
  .boundary strong { color: var(--accent-soft); }
  @media (max-width: 700px) { .scene-cards { grid-template-columns: 1fr; } .scene-cards div + div { border-top: 1px solid var(--border-soft); border-left: 0; } }
</style>
