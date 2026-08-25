<script lang="ts">
  import type { PairedBiomassEvaluation } from '../analysis';

  interface Props {
    evaluation: PairedBiomassEvaluation;
    onselect?: (tick: number) => void;
  }

  let { evaluation, onselect = () => undefined }: Props = $props();
  const checked = $derived(evaluation.checks.filter((check) => check.status !== 'not-checked'));
  const passed = $derived(checked.filter((check) => check.status === 'pass').length);
  const failed = $derived(checked.filter((check) => check.status === 'fail').length);
  const unavailable = $derived(evaluation.checks.filter((check) => check.status === 'not-checked'));
</script>

<section class:invalid={evaluation.status === 'invalid'} class="feedback" aria-labelledby="feedback-title">
  <header>
    <div>
      <span class="eyebrow">Reference experiment · checkpoint control</span>
      <h2 id="feedback-title">{evaluation.headline}</h2>
      <p>{evaluation.summary}</p>
      <small>Shared checkpoint: <code>{evaluation.comparison.parentCheckpointHash.slice(0, 16)}…</code> · day {evaluation.comparison.checkpointTick}</small>
    </div>
    <span class="verdict {evaluation.status}">{evaluation.status}</span>
  </header>

  {#if failed}
    <div class="invalid-alert" role="alert">
      <strong>Do not interpret this result.</strong>
      {failed} hard validity {failed === 1 ? 'gate has' : 'gates have'} failed.
    </div>
  {/if}

  <div class="questions">
    {#each evaluation.questions as item (item.id)}
      <article class={item.tone}>
        <span>{item.question}</span>
        <strong>{item.answer}</strong>
        <p>{item.detail}</p>
      </article>
    {/each}
  </div>

  <section class="causal-trail" aria-labelledby="causal-title">
    <div class="section-heading">
      <div><span class="eyebrow">How the difference unfolds</span><h3 id="causal-title">Stored facts, in causal order</h3></div>
      <p>Select a step to inspect that day above.</p>
    </div>
    <ol>
      {#each evaluation.explanation as step, index (step.id)}
        <li>
          <button type="button" onclick={() => onselect(step.tick)} aria-label={'Inspect ' + step.label + ' on day ' + step.tick}>
            <span class="step-number">{index + 1}</span>
            <span class="step-copy"><small>Day {step.tick}</small><strong>{step.label}</strong><span>{step.summary}</span><em>{step.evidence}</em></span>
          </button>
        </li>
      {/each}
    </ol>
  </section>

  <div class:problem={failed > 0} class="check-summary">
    <div><span>Hard checks currently available</span><strong>{passed}/{checked.length} pass</strong></div>
    <p>{unavailable.length} essential {unavailable.length === 1 ? 'check is' : 'checks are'} still unavailable: {unavailable.map((check) => check.question.replace(/\?$/, '')).join('; ')}.</p>
  </div>

  <details>
    <summary>Show every check, threshold and current limit</summary>
    <div class="detail-grid">
      <section>
        <h3>Hard validity gates</h3>
        <ul>
          {#each evaluation.checks as check (check.id)}
            <li class={check.status}>
              <span>{check.status === 'pass' ? 'Pass' : check.status === 'fail' ? 'Fail' : 'Not yet'}</span>
              <div><strong>{check.question}</strong><p>{check.summary}</p></div>
            </li>
          {/each}
        </ul>
      </section>
      <section>
        <h3>What this can claim</h3>
        <p class="claim">{evaluation.claimLevel}</p>
        <ul class="limits">{#each evaluation.limitations as limitation}<li>{limitation}</li>{/each}</ul>
      </section>
    </div>
  </details>
</section>

<style>
  .feedback { min-width: 0; padding: 1.1rem; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .feedback.invalid { border-color: rgba(240,127,115,0.65); box-shadow: inset 0 0 0 1px rgba(240,127,115,0.12); }
  header { display: flex; justify-content: space-between; gap: 1rem; }
  .eyebrow { color: var(--accent-soft); font-size: 0.61rem; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; }
  h2 { margin: 0.24rem 0 0.3rem; font-size: 1.2rem; }
  header p { max-width: 720px; margin: 0; color: var(--text-muted); font-size: 0.72rem; line-height: 1.48; }
  header small { display: block; margin-top: 0.42rem; color: var(--text-faint); font-size: 0.59rem; }
  code { color: #b9d9ff; font: 0.58rem var(--font-mono); }
  .verdict { align-self: flex-start; padding: 0.3rem 0.48rem; color: #c9f5da; background: rgba(104,224,163,0.1); border: 1px solid rgba(104,224,163,0.3); border-radius: 999px; font: 700 0.59rem var(--font-mono); text-transform: uppercase; }
  .verdict.survived { color: #ffe0a8; background: rgba(255,196,107,0.09); border-color: rgba(255,196,107,0.3); }
  .verdict.collapsed, .verdict.invalid { color: #ffc0b8; background: rgba(240,127,115,0.09); border-color: rgba(240,127,115,0.3); }
  .invalid-alert { margin-top: 0.75rem; padding: 0.65rem 0.75rem; color: #ffc0b8; background: rgba(240,127,115,0.08); border: 1px solid rgba(240,127,115,0.3); border-radius: var(--radius-md); font-size: 0.67rem; }
  .invalid-alert strong { margin-right: 0.3rem; }
  .questions { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.55rem; margin-top: 0.9rem; }
  article { min-width: 0; padding: 0.72rem; background: #0f1116; border: 1px solid var(--border-soft); border-top: 2px solid #68e0a3; border-radius: var(--radius-md); }
  article.caution { border-top-color: #ffc46b; } article.problem { border-top-color: #f07f73; }
  article > span { color: var(--text-faint); font-size: 0.58rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
  article strong { display: block; margin-top: 0.35rem; color: #e7e9ed; font-size: 0.73rem; line-height: 1.35; }
  article p { margin: 0.35rem 0 0; color: var(--text-faint); font-size: 0.62rem; line-height: 1.4; }
  .causal-trail { margin-top: 0.85rem; padding: 0.8rem; background: #0e1015; border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
  .section-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; }
  .section-heading h3 { margin: 0.16rem 0 0; font-size: 0.78rem; }
  .section-heading p { margin: 0; color: var(--text-faint); font-size: 0.58rem; }
  ol { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 0.38rem; margin: 0.65rem 0 0; padding: 0; list-style: none; }
  ol li { position: relative; }
  ol li:not(:last-child)::after { position: absolute; z-index: 2; top: 1.05rem; right: -0.29rem; color: #566172; content: '›'; font-size: 1rem; pointer-events: none; }
  ol button { width: 100%; height: 100%; display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 0.42rem; padding: 0.58rem; text-align: left; color: inherit; background: #12151b; border: 1px solid #292e38; border-radius: 7px; }
  ol button:hover { background: #181c24; border-color: #4a5667; }
  ol button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .step-number { display: grid; place-items: center; width: 20px; height: 20px; color: #0b0d11; background: var(--accent-soft); border-radius: 50%; font: 800 0.58rem var(--font-mono); }
  .step-copy { min-width: 0; }
  .step-copy small, .step-copy strong, .step-copy span, .step-copy em { display: block; }
  .step-copy small { color: #8fb7d4; font: 0.52rem var(--font-mono); text-transform: uppercase; }
  .step-copy strong { margin-top: 0.18rem; color: #e7e9ed; font-size: 0.65rem; line-height: 1.3; }
  .step-copy span { margin-top: 0.25rem; color: var(--text-muted); font-size: 0.58rem; line-height: 1.35; }
  .step-copy em { margin-top: 0.28rem; color: var(--text-faint); font-size: 0.53rem; font-style: normal; line-height: 1.3; }
  .check-summary { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 0.7rem; padding: 0.65rem 0.75rem; background: rgba(104,224,163,0.035); border-left: 2px solid #68e0a3; border-radius: var(--radius-md); }
  .check-summary.problem { background: rgba(240,127,115,0.05); border-left-color: #f07f73; }
  .check-summary span, .check-summary strong { display: block; }
  .check-summary span { color: var(--text-faint); font-size: 0.55rem; text-transform: uppercase; }
  .check-summary strong { margin-top: 0.15rem; font: 750 0.76rem var(--font-mono); }
  .check-summary p { max-width: 65%; margin: 0; color: var(--text-faint); font-size: 0.62rem; line-height: 1.4; }
  details { margin-top: 0.7rem; border-top: 1px solid var(--border-soft); }
  summary { padding-top: 0.7rem; color: var(--text-muted); font-size: 0.66rem; font-weight: 800; cursor: pointer; }
  .detail-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 1rem; margin-top: 0.7rem; }
  h3 { margin: 0 0 0.5rem; font-size: 0.72rem; }
  ul { display: grid; gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
  .detail-grid li { display: grid; grid-template-columns: 52px minmax(0,1fr); gap: 0.5rem; color: var(--text-muted); font-size: 0.62rem; }
  .detail-grid li > span { color: #9ce9bc; font: 700 0.56rem var(--font-mono); text-transform: uppercase; }
  .detail-grid li.not-checked > span { color: #ffc46b; }
  .detail-grid li.fail > span { color: #f7a097; }
  .detail-grid li strong { display: block; color: var(--text-muted); }
  .detail-grid li p { margin: 0.12rem 0 0; color: var(--text-faint); line-height: 1.38; }
  .claim { margin: 0 0 0.6rem; color: var(--accent-soft); font-size: 0.66rem; line-height: 1.5; }
  ul.limits li { display: block; padding-left: 0.85rem; position: relative; }
  ul.limits li::before { position: absolute; left: 0; content: '◇'; color: var(--text-faint); }
  @media (max-width: 620px) {
    header, .section-heading { align-items: flex-start; flex-direction: column; }
    .detail-grid { grid-template-columns: 1fr; }
    .check-summary { align-items: flex-start; flex-direction: column; }
    .check-summary p { max-width: none; }
    ol { grid-template-columns: 1fr; }
    ol li:not(:last-child)::after { display: none; }
  }
</style>