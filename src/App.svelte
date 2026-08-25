<script lang="ts">
  import { onDestroy } from 'svelte';
  import EventHistory from './lib/components/EventHistory.svelte';
  import ExperimentFeedback from './lib/components/ExperimentFeedback.svelte';
  import ExperimentScene from './lib/components/ExperimentScene.svelte';
  import ExperimentLibrary from './lib/components/ExperimentLibrary.svelte';
  import EvolutionTimeline from './lib/components/EvolutionTimeline.svelte';
  import EvolutionTree from './lib/components/EvolutionTree.svelte';
  import HelpPanel from './lib/components/HelpPanel.svelte';
  import LevelsThroughTime from './lib/components/LevelsThroughTime.svelte';
  import LineageInspector from './lib/components/LineageInspector.svelte';
  import ModeCatalogue from './lib/components/ModeCatalogue.svelte';
  import ModeScaffold from './lib/components/ModeScaffold.svelte';
  import ReleaseIdentity from './lib/components/ReleaseIdentity.svelte';
  import ResourceField from './lib/components/ResourceField.svelte';
  import RuleWorkshop from './lib/components/RuleWorkshop.svelte';
  import { createMicrobialShadowEvaluation } from './lib/analysis';
  import { DEFAULT_CONFIG } from './lib/core';
  import type { TreeLens } from './lib/core';
  import { EXPERIMENTS } from './lib/experiments';
  import type { EvolutionExperiment } from './lib/experiments';
  import { createLongShadowHelpTopic } from './lib/help';
  import { INSTALLED_MODES, resolveRoute } from './lib/modes/catalog';
  import { MICROBIAL_SCENE_VIEW } from './lib/projections/scene';
  import { projectMicrobialBiomassHistory } from './lib/projections/temporal';
  import type { TemporalSeriesStyle } from './lib/projections/presentation';
  import { cloneDefaultRulePack } from './lib/rules';
  import type { RulePack } from './lib/rules';
  import { ENGINE_VERSION, LAB_VERSION, RUN_SCHEMA_VERSION } from './lib/version';

  type LabArea = 'simulation' | 'rules' | 'experiments';

  const route = resolveRoute(window.location.pathname);
  const activeMode = route.kind === 'mode' ? route.mode : null;
  const seriesStyles: TemporalSeriesStyle[] = [
    { seriesId: 'total-active-biomass', color: '#f1f3f5', areaOpacity: 1, symbol: '━━' },
    { seriesId: 'comparison/no-long-shadow', color: '#8fb7d4', dashPattern: '5 4', symbol: '┈' },
    { seriesId: 'lineage/basal-loop', color: '#b7c7d9', dashPattern: '7 3', symbol: '┄' },
    { seriesId: 'lineage/light-weavers', color: '#68e0a3', symbol: '●' },
    { seriesId: 'lineage/silt-recyclers', color: '#ffc46b', dashPattern: '2 3', symbol: '◆' },
    { seriesId: 'lineage/veil-grazers', color: '#f07f73', dashPattern: '10 3 2 3', symbol: '▲' }
  ];

  let labArea = $state<LabArea>('simulation');
  let seed = $state('fish-and-strawberries');
  let evaluationBundle = $state(createMicrobialShadowEvaluation('fish-and-strawberries'));
  const run = $derived(evaluationBundle.run);
  let tick = $state(176);
  let selectedId = $state('light-weavers');
  let lens = $state<TreeLens>('ancestry');
  let workingPack = $state<RulePack>(cloneDefaultRulePack());
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  const snapshot = $derived(run.snapshots[Math.min(tick, run.snapshots.length - 1)]);
  const selectedLineage = $derived(
    run.lineages.find((lineage) => lineage.id === selectedId) ?? run.lineages[0]
  );
  const selectedPopulation = $derived(
    snapshot.populations.find((population) => population.lineageId === selectedLineage.id) ?? snapshot.populations[0]
  );
  const activePopulations = $derived(snapshot.populations.filter((population) => population.active));
  const totalBiomass = $derived(activePopulations.reduce((total, population) => total + population.biomass, 0));
  const visibleEvents = $derived(run.events.filter((event) => event.tick <= tick).slice(-5).reverse());
  const temporalProjection = $derived(projectMicrobialBiomassHistory(run, evaluationBundle.comparisonRun));
  const helpTopic = $derived(createLongShadowHelpTopic(evaluationBundle.evaluation));
  const pageTitle = $derived(
    route.kind === 'catalogue'
      ? 'Evolution Lab · mode catalogue'
      : route.kind === 'not-found'
        ? 'Mode not found · Evolution Lab'
        : `${route.mode.title} · Evolution Lab`
  );
  const headerTitle = $derived(
    route.kind === 'catalogue'
      ? 'Choose what evolves.'
      : route.kind === 'not-found'
        ? 'That experiment space is not installed.'
        : route.mode.id !== 'biology'
          ? `${route.mode.title}, honestly staged.`
          : labArea === 'simulation'
            ? 'Make a living system from simple rules.'
            : labArea === 'rules'
              ? 'Build the possibility space.'
              : 'Keep every useful mistake.'
  );
  const headerSummary = $derived(
    route.kind === 'catalogue'
      ? 'A single deterministic lab with explicit modes: one working exobiology experiment and two visible next steps.'
      : route.kind === 'not-found'
        ? 'Return to the catalogue to choose an installed route.'
        : route.mode.id !== 'biology'
          ? route.mode.summary
          : labArea === 'simulation'
            ? 'One microbial film. Four authored lineages. A resource network with a stored, inspectable history.'
            : labArea === 'rules'
              ? 'Author scalable, declarative rulepacks without coupling the tools to SSE or the runtime.'
              : 'Re-run, clone and compare the experiments that shaped the model.'
  );

  function rerun() {
    stopPlayback();
    evaluationBundle = createMicrobialShadowEvaluation(seed.trim() || 'unnamed-world');
    tick = 176;
    selectedId = 'light-weavers';
  }

  function runExperiment(experiment: EvolutionExperiment, selectedTick = 176) {
    stopPlayback();
    seed = experiment.masterSeed;
    evaluationBundle = createMicrobialShadowEvaluation(experiment.masterSeed);
    tick = selectedTick;
    selectedId = 'light-weavers';
    labArea = 'simulation';
  }

  function exportRulePack(pack: RulePack) {
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${pack.manifest.id}-${pack.manifest.version}.evolution-pack.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function setTick(nextTick: number) {
    tick = Math.max(0, Math.min(DEFAULT_CONFIG.duration, Math.round(nextTick)));
  }

  function stopPlayback() {
    playing = false;
    if (timer) clearInterval(timer);
    timer = undefined;
  }

  function togglePlayback() {
    if (playing) {
      stopPlayback();
      return;
    }
    if (tick >= DEFAULT_CONFIG.duration) tick = 0;
    playing = true;
    timer = setInterval(() => {
      if (tick >= DEFAULT_CONFIG.duration) {
        stopPlayback();
        return;
      }
      tick += 1;
    }, 55);
  }

  onDestroy(stopPlayback);
</script>

<svelte:head><title>{pageTitle}</title></svelte:head>

<main>
  <header class="app-header">
    <div class="identity">
      <div class="lab-mark" aria-hidden="true"><span></span><span></span><span></span></div>
      <div>
        <span class="overline">Evolution Lab · deterministic evolving systems</span>
        <h1>{headerTitle}</h1>
        <p>{headerSummary}</p>
        <ReleaseIdentity
          labVersion={LAB_VERSION}
          engineVersion={activeMode?.id === 'biology' ? run.manifest.engineVersion : ENGINE_VERSION}
          schemaVersion={activeMode?.id === 'biology' ? run.manifest.schemaVersion : RUN_SCHEMA_VERSION}
          providerIdentity={activeMode?.id === 'biology' ? run.manifest.environmentProvider : 'not connected'}
          modeIdentity={activeMode ? `${activeMode.id}@${activeMode.release.version}` : 'catalogue'}
          scenarioIdentity={activeMode ? activeMode.composition.scenarioIdentity ?? 'not installed' : 'none selected'}
        />
      </div>
    </div>

    {#if activeMode?.id === 'biology' && labArea === 'simulation'}
      <div class="seed-control">
        <label for="seed">History seed</label>
        <div>
          <input id="seed" bind:value={seed} onkeydown={(event) => event.key === 'Enter' && rerun()} />
          <button onclick={rerun}>Re-run</button>
        </div>
        <small>Same seed, same history.</small>
      </div>
    {:else if activeMode?.id === 'biology'}
      <div class="workspace-note">
        <span>Independent workspace</span>
        <strong>Authoring and experiments remain separate from runtime state</strong>
        <small>Edits do not silently change a running history.</small>
      </div>
    {/if}
  </header>

  <nav class="product-nav" aria-label="Evolution Lab modes">
    <a href="/" aria-current={route.kind === 'catalogue' ? 'page' : undefined}>All modes</a>
    {#each INSTALLED_MODES as mode (mode.id)}
      <a href={mode.route} aria-current={activeMode?.id === mode.id ? 'page' : undefined}>
        {mode.title}<span class={`nav-state ${mode.release.lifecycle}`}>{mode.release.lifecycle === 'live' ? 'live' : 'scaffold'}</span>
      </a>
    {/each}
  </nav>

  {#if route.kind === 'catalogue'}
    <ModeCatalogue modes={INSTALLED_MODES} />
  {:else if route.kind === 'not-found'}
    <section class="not-found">
      <span class="overline">Unknown route · {route.pathname}</span>
      <h2>No mode is installed here.</h2>
      <p>The catalogue is the source of truth; unlisted paths do not create implicit scenarios.</p>
      <a href="/">Return to mode catalogue</a>
    </section>
  {:else if route.mode.release.lifecycle === 'scaffold'}
    <ModeScaffold mode={route.mode} />
  {:else}
    <nav class="mode-nav" aria-label="Exobiology workspace areas">
      <button class:active={labArea === 'simulation'} onclick={() => (labArea = 'simulation')}>Live experiment</button>
      <button class:active={labArea === 'rules'} onclick={() => (labArea = 'rules')}>Rule Workshop</button>
      <button class:active={labArea === 'experiments'} onclick={() => (labArea = 'experiments')}>Experiment Library</button>
    </nav>

    {#if labArea === 'simulation'}
      <ExperimentScene view={MICROBIAL_SCENE_VIEW} />

      <section class="control-ribbon">
        <div class="control-group">
          <span>Network lens</span>
          <div class="segmented">
            {#each ['ancestry', 'resources', 'capabilities'] as option}
              <button class:active={lens === option} onclick={() => (lens = option as TreeLens)}>{option}</button>
            {/each}
          </div>
        </div>
        <div class="summary-strip">
          <div><span>Active lineages</span><strong>{activePopulations.length}</strong></div>
          <div><span>Total biomass</span><strong>{totalBiomass.toFixed(1)}</strong></div>
          <div><span>Oxygen field</span><strong>{snapshot.resources.oxygen.toFixed(1)}</strong></div>
        </div>
      </section>

      <section class="primary-grid">
        <EvolutionTree lineages={run.lineages} {snapshot} {selectedId} {lens} maxTick={DEFAULT_CONFIG.duration} onselect={(lineageId) => (selectedId = lineageId)} />
        <LineageInspector lineage={selectedLineage} population={selectedPopulation} {snapshot} />
      </section>

      <EvolutionTimeline value={tick} max={DEFAULT_CONFIG.duration} events={run.events} {playing} onchange={setTick} ontoggleplay={togglePlayback} />
      <LevelsThroughTime projection={temporalProjection} styles={seriesStyles} value={tick} onselect={setTick} />

      <section class="feedback-grid">
        <ExperimentFeedback evaluation={evaluationBundle.evaluation} />
        <HelpPanel topic={helpTopic} />
      </section>

      <section class="secondary-grid">
        <ResourceField resources={snapshot.resources} flows={snapshot.flows} signatures={snapshot.signatures} />
        <EventHistory events={visibleEvents} onselect={setTick} />
      </section>
    {:else if labArea === 'rules'}
      <RuleWorkshop pack={workingPack} onchange={(pack) => (workingPack = pack)} onexport={exportRulePack} />
    {:else}
      <ExperimentLibrary experiments={EXPERIMENTS} onrun={runExperiment} onopenrules={() => (labArea = 'rules')} />
    {/if}
  {/if}

  <footer>
    <span>
      {route.kind === 'catalogue'
        ? 'One application · three explicit modes'
        : route.kind === 'not-found'
          ? 'No implicit mode fallback'
          : route.mode.release.lifecycle === 'scaffold'
            ? `${route.mode.title}: route and experiment brief only`
            : labArea === 'simulation'
              ? 'Prototype milestone: microbial flask'
              : labArea === 'rules'
                ? 'Authoring milestone: declarative rulepacks'
                : 'Project memory: reproducible experiments'}
    </span>
    <span>Framework-neutral projections · reusable Svelte components · deterministic history</span>
  </footer>
</main>

<style>
  .product-nav { display: flex; gap: 0.35rem; margin-bottom: 0.8rem; padding: 0.28rem; overflow-x: auto; background: #0d0f14; border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
  .product-nav a { display: inline-flex; align-items: center; gap: 0.42rem; padding: 0.52rem 0.7rem; flex: 0 0 auto; color: var(--text-muted); border: 1px solid transparent; border-radius: var(--radius-sm); font-size: 0.69rem; font-weight: 750; text-decoration: none; }
  .product-nav a:hover { color: white; background: #20232b; }
  .product-nav a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .product-nav a[aria-current='page'] { color: white; background: #262a33; border-color: #363b47; box-shadow: inset 0 -2px 0 var(--accent); }
  .nav-state { padding: 0.14rem 0.3rem; color: var(--text-faint); background: #171920; border-radius: 999px; font: 0.5rem var(--font-mono); text-transform: uppercase; }
  .nav-state.live { color: #a8f0c6; }
  .not-found { padding: clamp(1.5rem, 5vw, 4rem); background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .not-found h2 { margin: 0.35rem 0; font-size: clamp(1.5rem, 3vw, 2.4rem); }
  .not-found p { color: var(--text-muted); }
  .not-found a { display: inline-block; margin-top: 0.7rem; padding: 0.65rem 0.8rem; color: white; background: var(--accent); border-radius: var(--radius-md); font-size: 0.72rem; font-weight: 800; text-decoration: none; }
  .feedback-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(340px, 0.75fr); gap: 0.8rem; margin-top: 0.8rem; }
  @media (max-width: 1040px) { .feedback-grid { grid-template-columns: 1fr; } }
  @media (max-width: 620px) { .product-nav { margin-right: -0.25rem; margin-left: -0.25rem; } }
</style>
