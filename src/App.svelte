<script lang="ts">
  import { onDestroy } from 'svelte';
  import EventHistory from './lib/components/EventHistory.svelte';
  import ExperimentLibrary from './lib/components/ExperimentLibrary.svelte';
  import EvolutionTimeline from './lib/components/EvolutionTimeline.svelte';
  import EvolutionTree from './lib/components/EvolutionTree.svelte';
  import LineageInspector from './lib/components/LineageInspector.svelte';
  import ResourceField from './lib/components/ResourceField.svelte';
  import RuleWorkshop from './lib/components/RuleWorkshop.svelte';
  import { DEFAULT_CONFIG, simulate } from './lib/core';
  import type { TreeLens, VocabularyLayer } from './lib/core';
  import { EXPERIMENTS } from './lib/experiments';
  import type { EvolutionExperiment } from './lib/experiments';
  import { cloneDefaultRulePack } from './lib/rules';
  import type { RulePack } from './lib/rules';
  import { LAB_VERSION } from './lib/version';

  type LabMode = 'simulation' | 'rules' | 'experiments';

  let labMode = $state<LabMode>('simulation');
  let seed = $state('fish-and-strawberries');
  let run = $state(simulate('fish-and-strawberries'));
  let tick = $state(176);
  let selectedId = $state('light-weavers');
  let lens = $state<TreeLens>('ancestry');
  let vocabulary = $state<VocabularyLayer>('story');
  let workingPack = $state<RulePack>(cloneDefaultRulePack());
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  const snapshot = $derived(run.snapshots[Math.min(tick, run.snapshots.length - 1)]);
  const selectedLineage = $derived(
    run.lineages.find((lineage) => lineage.id === selectedId) ?? run.lineages[0]
  );
  const selectedPopulation = $derived(
    snapshot.populations.find((population) => population.lineageId === selectedLineage.id) ??
      snapshot.populations[0]
  );
  const activePopulations = $derived(snapshot.populations.filter((population) => population.active));
  const totalBiomass = $derived(
    activePopulations.reduce((total, population) => total + population.biomass, 0)
  );
  const visibleEvents = $derived(
    run.events.filter((event) => event.tick <= tick).slice(-5).reverse()
  );

  function rerun() {
    stopPlayback();
    run = simulate(seed.trim() || 'unnamed-world');
    tick = 176;
    selectedId = 'light-weavers';
  }

  function runExperiment(experiment: EvolutionExperiment, selectedTick = 176) {
    stopPlayback();
    seed = experiment.masterSeed;
    run = simulate(experiment.masterSeed);
    tick = selectedTick;
    selectedId = 'light-weavers';
    labMode = 'simulation';
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

<svelte:head>
  <title>Evolution Lab</title>
</svelte:head>

<main>
  <header class="app-header">
    <div class="identity">
      <div class="lab-mark" aria-hidden="true"><span></span><span></span><span></span></div>
      <div>
        <span class="overline">Evolution Lab · living systems workbench</span>
        <h1>
          {labMode === 'simulation'
            ? 'Make a living system from simple rules.'
            : labMode === 'rules'
              ? 'Build the possibility space.'
              : 'Keep every useful mistake.'}
        </h1>
        <p>
          {labMode === 'simulation'
            ? 'One microbial film. Four lineages. A resource network that remembers what lived here.'
            : labMode === 'rules'
              ? 'Author scalable, declarative rulepacks without coupling the tools to SSE or the runtime.'
              : 'Re-run, clone and compare the experiments that shaped the model.'}
        </p>
        <div class="version-strip" aria-label="Running versions">
          <span>Lab <strong>v{LAB_VERSION}</strong></span>
          <span>Engine <strong>v{run.manifest.engineVersion}</strong></span>
          <span>Schema <strong>{run.manifest.schemaVersion}</strong></span>
          <span>Provider <strong>{run.manifest.environmentProvider}</strong></span>
        </div>
      </div>
    </div>

    {#if labMode === 'simulation'}
      <div class="seed-control">
        <label for="seed">History seed</label>
        <div>
          <input id="seed" bind:value={seed} onkeydown={(event) => event.key === 'Enter' && rerun()} />
          <button onclick={rerun}>Re-run</button>
        </div>
        <small>Same seed, same history.</small>
      </div>
    {:else}
      <div class="workspace-note">
        <span>Independent workspace</span>
        <strong>Designed to mount inside SSE later</strong>
        <small>Authoring state never leaks into the simulation runtime.</small>
      </div>
    {/if}
  </header>

  <nav class="mode-nav" aria-label="Evolution Lab areas">
    <button class:active={labMode === 'simulation'} onclick={() => (labMode = 'simulation')}>Live experiment</button>
    <button class:active={labMode === 'rules'} onclick={() => (labMode = 'rules')}>Rule Workshop</button>
    <button class:active={labMode === 'experiments'} onclick={() => (labMode = 'experiments')}>Experiment Library</button>
  </nav>

  {#if labMode === 'simulation'}
    <section class="control-ribbon">
      <div class="control-group">
        <span>Network lens</span>
        <div class="segmented">
          {#each ['ancestry', 'resources', 'capabilities'] as option}
            <button class:active={lens === option} onclick={() => (lens = option as TreeLens)}>{option}</button>
          {/each}
        </div>
      </div>

      <div class="control-group vocabulary">
        <span>Vocabulary</span>
        <div class="segmented">
          {#each ['story', 'ecology', 'chemistry'] as option}
            <button class:active={vocabulary === option} onclick={() => (vocabulary = option as VocabularyLayer)}>{option}</button>
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
      <EvolutionTree
        lineages={run.lineages}
        {snapshot}
        {selectedId}
        {lens}
        maxTick={DEFAULT_CONFIG.duration}
        onselect={(lineageId) => (selectedId = lineageId)}
      />
      <LineageInspector
        lineage={selectedLineage}
        population={selectedPopulation}
        {snapshot}
        layer={vocabulary}
      />
    </section>

    <EvolutionTimeline
      value={tick}
      max={DEFAULT_CONFIG.duration}
      events={run.events}
      {playing}
      onchange={setTick}
      ontoggleplay={togglePlayback}
    />

    <section class="secondary-grid">
      <ResourceField
        resources={snapshot.resources}
        flows={snapshot.flows}
        signatures={snapshot.signatures}
      />
      <EventHistory events={visibleEvents} onselect={setTick} />
    </section>
  {:else if labMode === 'rules'}
    <RuleWorkshop
      pack={workingPack}
      onchange={(pack) => (workingPack = pack)}
      onexport={exportRulePack}
    />
  {:else}
    <ExperimentLibrary
      experiments={EXPERIMENTS}
      onrun={runExperiment}
      onopenrules={() => (labMode = 'rules')}
    />
  {/if}

  <footer>
    <span>
      {labMode === 'simulation'
        ? 'Prototype milestone: microbial flask'
        : labMode === 'rules'
          ? 'Authoring milestone: declarative rulepacks'
          : 'Project memory: reproducible experiments'}
    </span>
    <span>Framework-neutral core · reusable Svelte components · deterministic history</span>
  </footer>
</main>
