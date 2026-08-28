<script lang="ts">
  import { untrack } from 'svelte';
  import type {
    CompiledTuningSpec,
    TuningCandidateAssessment,
    TuningParameterChange
  } from '../calibration';
  import { createBaselineTuningValues } from '../calibration';

  interface Props {
    spec: CompiledTuningSpec;
    onevaluate: (
      changes: readonly TuningParameterChange[],
      hypothesis: string
    ) => TuningCandidateAssessment | Promise<TuningCandidateAssessment>;
  }

  let { spec, onevaluate }: Props = $props();
  let values = $state<Record<string, number>>(untrack(() => createBaselineTuningValues(spec)));
  let activeSpecHash = $state(untrack(() => spec.hash));
  let hypothesis = $state('A small bounded mechanism change may improve part of the response without breaking validity.');
  let assessment = $state<TuningCandidateAssessment | null>(null);
  let error = $state('');
  let running = $state(false);

  $effect(() => {
    if (activeSpecHash !== spec.hash) {
      values = createBaselineTuningValues(spec);
      activeSpecHash = spec.hash;
      assessment = null;
      error = '';
    }
  });

  const editable = $derived(spec.parameters.filter(({ authority }) => authority !== 'frozen'));
  const frozen = $derived(spec.parameters.filter(({ authority }) => authority === 'frozen'));

  const relationText: Record<TuningCandidateAssessment['calibrationComparison']['relation'], string> = {
    'candidate-dominates': 'better on at least one measure and no worse on the others',
    'baseline-dominates': 'worse on at least one measure and no better on the others',
    'trade-off': 'better on some measures and worse on others',
    equivalent: 'effectively unchanged on these measures',
    'candidate-invalid': 'rejected because a hard validity check failed',
    'candidate-restores-validity': 'restores validity where the baseline failed'
  };

  async function evaluate() {
    running = true;
    error = '';
    assessment = null;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      const changes = editable
        .filter((parameter) => values[parameter.id] !== parameter.baseline)
        .map((parameter) => ({
          parameterId: parameter.id,
          value: values[parameter.id],
          unit: parameter.unit
        }));
      assessment = await onevaluate(changes, hypothesis);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    } finally {
      running = false;
    }
  }

  function reset() {
    values = createBaselineTuningValues(spec);
    assessment = null;
    error = '';
  }
</script>

<section class="harness" aria-labelledby="tuning-title">
  <header>
    <div>
      <span class="overline">Bounded candidate laboratory · {spec.version}</span>
      <h2 id="tuning-title">Tuning Harness</h2>
      <p>Try one explainable change, reject impossible runs first, then see whether the apparent improvement survives unfamiliar seeds.</p>
    </div>
    <code>{spec.hash}</code>
  </header>

  <ol class="workflow" aria-label="Candidate review workflow">
    <li><strong>1 · Propose</strong><span>State one reason and one small change.</span></li>
    <li><strong>2 · Validate</strong><span>Check IDs, units, bounds and ownership.</span></li>
    <li><strong>3 · Run</strong><span>Replay named deterministic histories.</span></li>
    <li><strong>4 · Compare</strong><span>Keep every measure; no secret overall score.</span></li>
    <li><strong>5 · Hold out</strong><span>Check seeds not used to form the idea.</span></li>
  </ol>

  <div class="claim">
    <strong>What this means</strong>
    <p>This is engineering feedback for a deliberately simple, uncalibrated model. Passing does not prove that the biology or parameter values are scientifically correct.</p>
  </div>

  <div class="editor-grid">
    <section class="parameters" aria-labelledby="adjustable-title">
      <h3 id="adjustable-title">Adjustable mechanism values</h3>
      {#each editable as parameter (parameter.id)}
        <label>
          <span><strong>{parameter.label}</strong><small>{parameter.description}</small></span>
          <output for={parameter.id}>{values[parameter.id]} {parameter.unit}</output>
          <input
            id={parameter.id}
            type="range"
            min={parameter.minimum}
            max={parameter.maximum}
            step={parameter.step}
            bind:value={values[parameter.id]}
          />
          <small class="bounds">{parameter.minimum}–{parameter.maximum} · baseline {parameter.baseline}</small>
        </label>
      {/each}
    </section>

    <aside class="frozen" aria-labelledby="frozen-title">
      <h3 id="frozen-title">Frozen provider facts</h3>
      <p>The optimiser may observe these but cannot rewrite the environment to make itself look successful.</p>
      {#each frozen as parameter (parameter.id)}
        <div><span>{parameter.label}</span><strong>{parameter.baseline} {parameter.unit}</strong><small>{parameter.description}</small></div>
      {/each}
    </aside>
  </div>

  <label class="hypothesis">
    <span>Why might this help?</span>
    <input bind:value={hypothesis} maxlength="240" />
  </label>
  <div class="actions">
    <button class="primary" onclick={evaluate} disabled={running || !hypothesis.trim()}>{running ? 'Running deterministic suite…' : 'Validate and compare candidate'}</button>
    <button onclick={reset} disabled={running}>Reset to baseline</button>
  </div>

  <div class="result" aria-live="polite" aria-busy={running}>
    {#if error}
      <div class="error"><strong>Candidate rejected before simulation</strong><span>{error}</span></div>
    {:else if assessment}
      <section class="gates" aria-labelledby="gate-title">
        <div class="result-heading">
          <div><span class="overline">First: validity</span><h3 id="gate-title">Hard checks</h3></div>
          <strong class:pass={assessment.calibration.valid && assessment.heldOut.valid}>
            {assessment.calibration.valid && assessment.heldOut.valid ? 'All pass' : 'Candidate invalid'}
          </strong>
        </div>
        <div class="gate-list">
          {#each assessment.calibration.gates as gate (gate.id)}
            <span class:failed={!gate.passed}>{gate.passed ? '✓' : '×'} {gate.id.replaceAll('-', ' ')}</span>
          {/each}
        </div>
      </section>

      <section class="comparisons" aria-labelledby="comparison-title">
        <div class="result-heading"><div><span class="overline">Then: trade-offs</span><h3 id="comparison-title">Fitness Vector</h3></div></div>
        <div class="comparison-summary">
          <article><span>Working seeds</span><strong>{relationText[assessment.calibrationComparison.relation]}</strong></article>
          <article><span>Held-out seeds</span><strong>{relationText[assessment.heldOutComparison.relation]}</strong></article>
        </div>
        <div class="metric-table" aria-label="Held-out fitness changes">
          {#each assessment.heldOutComparison.deltas as delta (delta.objectiveId)}
            <div>
              <span>{delta.objectiveId.replaceAll('-', ' ')}</span>
              <strong class:preferred={delta.preferred}>{delta.delta > 0 ? '+' : ''}{delta.delta} {delta.unit}</strong>
              <small>{delta.preferred ? 'favours candidate' : delta.delta === 0 ? 'unchanged' : 'favours baseline'}</small>
            </div>
          {/each}
        </div>
        <p class="plain">A Fitness Vector is simply several useful measurements kept side by side. A candidate is not declared “best” by hiding those trade-offs inside one magic number.</p>
      </section>
    {:else if !running}
      <p class="empty">Move a slider or keep the baseline, state your reason, then run the same contract available to a local or remote model.</p>
    {/if}
  </div>
</section>

<style>
  .harness { padding: clamp(1rem, 2.5vw, 1.8rem); background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  header, .result-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  h2, h3, p { margin: 0; }
  h2 { margin-top: .25rem; font-size: clamp(1.5rem, 3vw, 2.3rem); }
  header p { max-width: 760px; margin-top: .35rem; color: var(--text-muted); }
  header code { padding: .35rem .45rem; color: var(--text-faint); background: var(--bg-deep); border-radius: var(--radius-sm); font-size: .55rem; }
  .workflow { display: grid; grid-template-columns: repeat(5, 1fr); gap: .55rem; margin: 1.2rem 0 .8rem; padding: 0; list-style: none; }
  .workflow li { min-height: 72px; padding: .7rem; background: #11141a; border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
  .workflow strong, .workflow span { display: block; }
  .workflow strong { color: #d9e8ff; font-size: .68rem; }
  .workflow span { margin-top: .3rem; color: var(--text-muted); font-size: .65rem; line-height: 1.35; }
  .claim { padding: .75rem .9rem; background: #182018; border-left: 3px solid #7bcf9b; border-radius: var(--radius-sm); }
  .claim strong { font-size: .7rem; }
  .claim p { margin-top: .18rem; color: #b8c7ba; font-size: .68rem; }
  .editor-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(260px, .75fr); gap: .8rem; margin-top: .8rem; }
  .parameters, .frozen, .gates, .comparisons { padding: .9rem; background: #101218; border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
  .parameters h3, .frozen h3 { margin-bottom: .65rem; }
  .parameters label { display: grid; grid-template-columns: 1fr auto; gap: .25rem .8rem; padding: .65rem 0; border-top: 1px solid var(--border-soft); }
  .parameters label:first-of-type { border-top: 0; }
  label span strong, label span small { display: block; }
  label span small, .bounds, .frozen p, .frozen small { color: var(--text-faint); font-size: .61rem; }
  output { color: #b9d8ff; font: .68rem var(--font-mono); }
  input[type='range'] { grid-column: 1 / -1; width: 100%; accent-color: var(--accent); }
  .bounds { grid-column: 1 / -1; }
  .frozen p { margin-bottom: .55rem; }
  .frozen div { display: grid; grid-template-columns: 1fr auto; gap: .2rem .5rem; padding: .65rem 0; border-top: 1px solid var(--border-soft); }
  .frozen div small { grid-column: 1 / -1; }
  .hypothesis { display: block; margin-top: .8rem; }
  .hypothesis span { display: block; margin-bottom: .3rem; font-size: .7rem; font-weight: 800; }
  .hypothesis input { width: 100%; box-sizing: border-box; padding: .7rem; color: var(--text); background: #0d0f14; border: 1px solid var(--border); border-radius: var(--radius-sm); }
  .actions { display: flex; gap: .5rem; margin-top: .6rem; }
  button { padding: .65rem .8rem; color: var(--text); background: #252933; border: 1px solid #3a404d; border-radius: var(--radius-sm); font-size: .68rem; font-weight: 800; cursor: pointer; }
  button.primary { background: var(--accent); border-color: var(--accent); color: white; }
  button:disabled { opacity: .55; cursor: wait; }
  button:focus-visible, input:focus-visible { outline: 2px solid #b8d7ff; outline-offset: 2px; }
  .result { margin-top: .8rem; }
  .error, .empty { padding: .8rem; background: #251618; border: 1px solid #6a3339; border-radius: var(--radius-md); }
  .error strong, .error span { display: block; }
  .error span { margin-top: .25rem; color: #efb7bc; font-size: .68rem; }
  .empty { color: var(--text-muted); background: #101218; border-color: var(--border-soft); }
  .result-heading > strong { padding: .25rem .45rem; color: #ffb3b8; background: #29171a; border-radius: 999px; font-size: .62rem; }
  .result-heading > strong.pass { color: #a8f0c6; background: #14251d; }
  .gate-list { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .6rem; }
  .gate-list span { padding: .3rem .45rem; color: #a8f0c6; background: #14251d; border-radius: 999px; font-size: .58rem; text-transform: capitalize; }
  .gate-list span.failed { color: #ffb3b8; background: #29171a; }
  .comparisons { margin-top: .65rem; }
  .comparison-summary { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; margin-top: .6rem; }
  .comparison-summary article { padding: .65rem; background: #171a21; border-radius: var(--radius-sm); }
  .comparison-summary span, .comparison-summary strong { display: block; }
  .comparison-summary span { color: var(--text-faint); font-size: .58rem; text-transform: uppercase; }
  .comparison-summary strong { margin-top: .25rem; font-size: .7rem; }
  .metric-table { margin-top: .6rem; }
  .metric-table > div { display: grid; grid-template-columns: minmax(180px, 1fr) auto minmax(110px, auto); gap: .7rem; padding: .48rem 0; border-top: 1px solid var(--border-soft); font-size: .65rem; text-transform: capitalize; }
  .metric-table strong { font-family: var(--font-mono); }
  .metric-table strong.preferred { color: #a8f0c6; }
  .metric-table small { color: var(--text-faint); text-align: right; }
  .plain { margin-top: .6rem; color: var(--text-muted); font-size: .66rem; line-height: 1.5; }
  @media (max-width: 900px) { .workflow { grid-template-columns: 1fr 1fr; } .editor-grid { grid-template-columns: 1fr; } }
  @media (max-width: 580px) { header { display: block; } header code { display: block; margin-top: .6rem; overflow-wrap: anywhere; } .workflow { grid-template-columns: 1fr; } .comparison-summary { grid-template-columns: 1fr; } .metric-table > div { grid-template-columns: 1fr auto; } .metric-table small { grid-column: 1 / -1; text-align: left; } .actions { flex-direction: column; } }
</style>
