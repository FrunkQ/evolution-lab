<script lang="ts">
  import type { EvolutionExperiment } from '../experiments';

  interface Props {
    experiments: EvolutionExperiment[];
    onrun: (experiment: EvolutionExperiment, tick?: number) => void;
    onopenrules: (experiment: EvolutionExperiment) => void;
  }

  let { experiments, onrun, onopenrules }: Props = $props();
  let search = $state('');
  const filtered = $derived(
    experiments.filter((experiment) => {
      const query = search.trim().toLowerCase();
      return !query || experiment.title.toLowerCase().includes(query) || experiment.summary.toLowerCase().includes(query) || experiment.tags.some((tag) => tag.includes(query));
    })
  );
</script>

<section class="experiment-shell">
  <header>
    <div><span class="overline">Living project memory</span><h1>Experiment Library</h1><p>Reference runs, failed ideas and useful surprises stay here so users—and future us—can learn from them.</p></div>
    <div class="search-wrap"><label for="experiment-search">Find an experiment</label><input id="experiment-search" placeholder="Search questions, tags or lessons…" bind:value={search} /></div>
  </header>

  <div class="experiment-grid">
    {#each filtered as experiment (experiment.id)}
      <article>
        <div class="card-top"><span class={`status ${experiment.status}`}>{experiment.status}</span><span class="version">{experiment.version}</span></div>
        <h2>{experiment.title}</h2>
        <p class="summary">{experiment.summary}</p>
        <div class="tags">{#each experiment.tags as tag}<span>{tag}</span>{/each}</div>

        <div class="manifest">
          <div><span>Master seed</span><strong>{experiment.masterSeed}</strong></div>
          <div><span>Environment</span><strong>{experiment.environmentProvider}</strong></div>
          <div><span>Rules</span><strong>{experiment.rulePackIds.join(', ')}</strong></div>
        </div>

        <details open>
          <summary>What this taught us</summary>
          <ul>{#each experiment.lessons as lesson}<li>{lesson}</li>{/each}</ul>
        </details>
        <details>
          <summary>Questions under test</summary>
          <ul>{#each experiment.questions as question}<li>{question}</li>{/each}</ul>
        </details>

        <div class="checkpoints">
          <span>Jump to checkpoint</span>
          <div>{#each experiment.checkpoints as checkpoint}<button title={checkpoint.note} onclick={() => onrun(experiment, checkpoint.tick)}>D{checkpoint.tick}</button>{/each}</div>
        </div>

        <footer><button onclick={() => onopenrules(experiment)}>Inspect its rules</button><button class="primary" onclick={() => onrun(experiment)}>Run experiment</button></footer>
      </article>
    {:else}
      <p class="empty">No experiments match that search.</p>
    {/each}
  </div>
</section>

<style>
  .experiment-shell { display: grid; gap: 0.8rem; }
  header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding: 1.2rem; background: linear-gradient(135deg, rgba(25,28,36,0.98), rgba(28,23,24,0.98)); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .overline { color: #ffb27a; font-size: 0.63rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; }
  h1 { margin: 0.15rem 0; font-size: 1.7rem; }
  header p { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.78rem; }
  .search-wrap { min-width: 300px; }
  .search-wrap label { display: block; margin-bottom: 0.3rem; color: var(--text-faint); font-size: 0.58rem; text-transform: uppercase; }
  .search-wrap input { width: 100%; padding: 0.58rem 0.65rem; color: var(--text); background: #0e1015; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.7rem; }
  .experiment-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 0.8rem; }
  article { padding: 1.15rem; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .card-top { display: flex; justify-content: space-between; align-items: center; }
  .status { padding: 0.18rem 0.42rem; color: #74dca6; background: rgba(104,224,163,0.09); border: 1px solid rgba(104,224,163,0.22); border-radius: 999px; font-size: 0.55rem; text-transform: uppercase; }
  .status.draft { color: #ffbf68; }
  .status.retired { color: #a7aebb; }
  .version { color: var(--text-faint); font: 0.58rem var(--font-mono); }
  h2 { margin: 0.75rem 0 0.3rem; font-size: 1.2rem; }
  .summary { margin: 0; color: var(--text-muted); font-size: 0.76rem; line-height: 1.5; }
  .tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.7rem; }
  .tags span { padding: 0.2rem 0.38rem; color: #b8c1ce; background: #20232b; border-radius: var(--radius-sm); font-size: 0.55rem; }
  .manifest { display: grid; gap: 0.42rem; margin-top: 0.85rem; padding: 0.7rem; background: #0e1015; border-radius: var(--radius-md); }
  .manifest div { display: grid; grid-template-columns: 92px 1fr; gap: 0.5rem; }
  .manifest span { color: var(--text-faint); font-size: 0.57rem; text-transform: uppercase; }
  .manifest strong { overflow: hidden; color: #cdd2da; font: 0.6rem var(--font-mono); text-overflow: ellipsis; white-space: nowrap; }
  details { margin-top: 0.65rem; padding-top: 0.6rem; border-top: 1px solid var(--border-soft); }
  summary { color: #d8dbe0; cursor: pointer; font-size: 0.7rem; font-weight: 700; }
  ul { margin: 0.5rem 0 0; padding-left: 1.1rem; color: var(--text-muted); font-size: 0.68rem; line-height: 1.5; }
  .checkpoints { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; margin-top: 0.8rem; }
  .checkpoints > span { color: var(--text-faint); font-size: 0.58rem; text-transform: uppercase; }
  .checkpoints div { display: flex; gap: 0.28rem; }
  .checkpoints button { padding: 0.3rem 0.38rem; border-radius: var(--radius-sm); font: 0.58rem var(--font-mono); }
  footer { display: flex; justify-content: flex-end; gap: 0.45rem; margin-top: 0.85rem; }
  footer button { padding: 0.52rem 0.65rem; border-radius: var(--radius-sm); font-size: 0.68rem; }
  footer .primary { color: white; background: var(--accent); border-color: var(--accent); }
  .empty { color: var(--text-faint); }

  @media (max-width: 720px) {
    header { align-items: stretch; flex-direction: column; }
    .search-wrap { min-width: 0; }
    .manifest div { grid-template-columns: 1fr; }
    .checkpoints { align-items: flex-start; flex-direction: column; }
  }
</style>
