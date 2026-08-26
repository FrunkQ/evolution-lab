<script lang="ts">
  import type { DevicePerformanceObservation, EvolutionExperiment, ExperimentQualificationSummary } from '../experiments';

  interface Props {
    experiments: EvolutionExperiment[];
    qualifications?: readonly ExperimentQualificationSummary[];
    onmeasure?: () => Promise<DevicePerformanceObservation>;
    onrun: (experiment: EvolutionExperiment, tick?: number) => void;
    onopenrules: (experiment: EvolutionExperiment) => void;
  }

  let { experiments, qualifications = [], onmeasure, onrun, onopenrules }: Props = $props();
  let search = $state('');
  let measuring = $state(false);
  let benchmarkError = $state('');
  let devicePerformance = $state<DevicePerformanceObservation | null>(null);

  async function measureDevice() {
    if (!onmeasure || measuring) return;
    measuring = true;
    benchmarkError = '';
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 16));
      devicePerformance = await onmeasure();
    } catch (error) {
      benchmarkError = error instanceof Error ? error.message : 'This device benchmark could not complete.';
    } finally {
      measuring = false;
    }
  }

  const milliseconds = (value: number) => value < 10 ? value.toFixed(1) : Math.round(value).toString();
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
      {@const qualification = qualifications.find((candidate) => candidate.experimentId === experiment.id)}
      <article>
        <div class="card-top"><span class={`status ${experiment.status}`}>{experiment.status}</span><span class="version">{experiment.version}</span></div>
        <h2>{experiment.title}</h2>
        <p class="summary">{experiment.summary}</p>
        <div class="tags">{#each experiment.tags as tag}<span>{tag}</span>{/each}</div>

        <div class="manifest">
          <div><span>Master seed</span><strong>{experiment.masterSeed}</strong></div>
          <div><span>Environment</span><strong>{experiment.environmentProvider}</strong></div>
          <div><span>Input dataset</span><strong>{experiment.providerInput ? experiment.providerInput.fixtureHash : 'not pinned'}</strong></div>
          <div><span>Rules</span><strong>{experiment.rulePackIds.join(', ')}</strong></div>
          <div><span>Manifest</span><strong>{experiment.manifestHash ?? 'not pinned'}</strong></div>
        </div>

        {#if qualification}
          <section class:failed={!qualification.valid} class="qualification" aria-label="Framework qualification">
            <div class="qualification-head">
              <div><span>Framework qualification</span><strong>{qualification.valid ? 'Passed' : 'Failed'} · {qualification.passed}/{qualification.passed + qualification.failed} checks</strong></div>
              <b>{qualification.seedCount} named seeds</b>
            </div>
            <p>Inputs, replay, checkpoints, paired futures, evaluation coverage and causal evidence reproduce as one release check.</p>
            {#if qualification.workload}
              <dl class="workload">
                <div><dt>Peak nodes</dt><dd>{qualification.workload.peakProcessedNodes}</dd></div>
                <div><dt>Resolved work</dt><dd>{qualification.workload.processedNodeTicks.toLocaleString()} node-days</dd></div>
                <div><dt>Stored history</dt><dd>{(qualification.workload.historyCharacters / 1_000_000).toFixed(2)}M characters</dd></div>
                <div><dt>Budget</dt><dd>{qualification.workload.limitsPassed}/{qualification.workload.limitsTotal} pass</dd></div>
              </dl>
            {/if}
            <code>{qualification.hash}</code>
            {#if onmeasure}
              <div class="device-benchmark">
                <div><strong>How fast is it here?</strong><span>Optional local timing; never part of the seeded result.</span></div>
                <button type="button" disabled={measuring} onclick={measureDevice}>{measuring ? 'Measuring…' : devicePerformance ? 'Measure again' : 'Measure this device'}</button>
              </div>
              {#if devicePerformance}
                <div class="device-result" aria-live="polite">
                  <strong>{devicePerformance.rating} on this device</strong>
                  <span>Reference history: {milliseconds(devicePerformance.referenceHistoryMedianMs)} ms median · nine-case map: {milliseconds(devicePerformance.responseFamilyMedianMs)} ms median.</span>
                  <p>{devicePerformance.ratingExplanation}</p>
                  <small>{devicePerformance.populationCapacityReason}</small>
                  <details class="measurement-details">
                    <summary>Measurement details</summary>
                    <p>{devicePerformance.sampleCount} timed repeats after {devicePerformance.warmupRuns} warm-up · engine {devicePerformance.engineVersion} · {devicePerformance.timingSource}. Exact workload: {devicePerformance.workload.profile.processedNodeTicks.toLocaleString()} node-days.</p>
                    <code>{devicePerformance.benchmark.id}@{devicePerformance.benchmark.version} · {devicePerformance.benchmark.hash}</code>
                    <code>{devicePerformance.runtimeLabel}</code>
                  </details>
                </div>
              {:else if benchmarkError}
                <p class="benchmark-error" role="alert">{benchmarkError}</p>
              {/if}
            {/if}
            <details>
              <summary>What this proves—and does not</summary>
              <p>{qualification.claimLevel}</p>
              <ul>{#each qualification.limitations as limitation}<li>{limitation}</li>{/each}</ul>
            </details>
          </section>
        {/if}

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
          <div>{#each experiment.checkpoints as checkpoint}<button title={checkpoint.note + (checkpoint.expectedHash ? ' · ' + checkpoint.expectedHash : '')} aria-label={'Inspect day ' + checkpoint.tick + (checkpoint.expectedHash ? ', verified checkpoint' : '')} onclick={() => onrun(experiment, checkpoint.tick)}>D{checkpoint.tick}<small>{checkpoint.expectedHash ? '✓' : '–'}</small></button>{/each}</div>
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
  .qualification { margin-top: 0.7rem; padding: 0.7rem; background: rgba(104,224,163,0.045); border: 1px solid rgba(104,224,163,0.22); border-radius: var(--radius-md); }
  .qualification.failed { background: rgba(240,127,115,0.05); border-color: rgba(240,127,115,0.28); }
  .qualification-head { display: flex; justify-content: space-between; gap: 0.8rem; }
  .qualification-head span, .qualification-head strong { display: block; }
  .qualification-head span { color: var(--text-faint); font-size: 0.55rem; text-transform: uppercase; }
  .qualification-head strong { margin-top: 0.12rem; color: #a8f0c6; font: 750 0.68rem var(--font-mono); }
  .qualification.failed .qualification-head strong { color: #ffc0b8; }
  .qualification-head b { align-self: flex-start; color: #b9d9ff; font: 650 0.56rem var(--font-mono); }
  .qualification > p { margin: 0.42rem 0 0.28rem; color: var(--text-muted); font-size: 0.64rem; line-height: 1.42; }
  .qualification code { overflow-wrap: anywhere; color: #8fb7d4; font: 0.53rem var(--font-mono); }
  .workload { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.3rem; margin: 0.5rem 0; }
  .workload div { min-width: 0; padding: 0.38rem; background: #0d1115; border-radius: 5px; }
  .workload dt { color: var(--text-faint); font-size: 0.49rem; text-transform: uppercase; }
  .workload dd { margin: 0.12rem 0 0; overflow-wrap: anywhere; color: #d8e0ea; font: 650 0.55rem var(--font-mono); }
  .device-benchmark { display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; margin-top: 0.55rem; padding-top: 0.5rem; border-top: 1px solid var(--border-soft); }
  .device-benchmark strong, .device-benchmark span { display: block; }
  .device-benchmark strong { color: #dce2ea; font-size: 0.62rem; }
  .device-benchmark span { margin-top: 0.1rem; color: var(--text-faint); font-size: 0.52rem; }
  .device-benchmark button { flex: 0 0 auto; padding: 0.38rem 0.5rem; border-radius: 5px; font-size: 0.58rem; }
  .device-result { margin-top: 0.45rem; padding: 0.5rem; background: #0d1115; border-left: 2px solid #8ebcff; border-radius: 5px; }
  .device-result strong, .device-result span, .device-result small { display: block; }
  .device-result strong { color: #b9d9ff; font-size: 0.64rem; text-transform: capitalize; }
  .device-result span { margin-top: 0.15rem; color: var(--text-muted); font: 0.54rem var(--font-mono); }
  .device-result p, .device-result small { margin: 0.28rem 0 0; color: var(--text-faint); font-size: 0.54rem; line-height: 1.4; }
  .measurement-details { margin-top: 0.45rem; padding-top: 0.4rem; }
  .measurement-details p { margin: 0.3rem 0; }
  .measurement-details code { display: block; margin-top: 0.18rem; overflow-wrap: anywhere; color: #77889b; }
  .benchmark-error { color: #ffc0b8 !important; }
  .qualification details { margin-top: 0.5rem; padding-top: 0.45rem; }
  .qualification details p { color: var(--text-muted); font-size: 0.62rem; line-height: 1.42; }
  .qualification details ul { margin-top: 0.35rem; }
  details { margin-top: 0.65rem; padding-top: 0.6rem; border-top: 1px solid var(--border-soft); }
  summary { color: #d8dbe0; cursor: pointer; font-size: 0.7rem; font-weight: 700; }
  ul { margin: 0.5rem 0 0; padding-left: 1.1rem; color: var(--text-muted); font-size: 0.68rem; line-height: 1.5; }
  .checkpoints { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; margin-top: 0.8rem; }
  .checkpoints > span { color: var(--text-faint); font-size: 0.58rem; text-transform: uppercase; }
  .checkpoints div { display: flex; gap: 0.28rem; }
  .checkpoints button { padding: 0.3rem 0.38rem; border-radius: var(--radius-sm); font: 0.58rem var(--font-mono); }
  .checkpoints button small { margin-left: 0.2rem; color: #74dca6; font-size: 0.52rem; }
  footer { display: flex; justify-content: flex-end; gap: 0.45rem; margin-top: 0.85rem; }
  footer button { padding: 0.52rem 0.65rem; border-radius: var(--radius-sm); font-size: 0.68rem; }
  footer .primary { color: white; background: var(--accent); border-color: var(--accent); }
  .empty { color: var(--text-faint); }

  @media (max-width: 720px) {
    header { align-items: stretch; flex-direction: column; }
    .search-wrap { min-width: 0; }
    .manifest div { grid-template-columns: 1fr; }
    .workload { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .device-benchmark { align-items: flex-start; flex-direction: column; }
    .checkpoints { align-items: flex-start; flex-direction: column; }
  }
</style>
