<script lang="ts">
  import type { PairedBiomassEvaluation } from '../analysis';
  interface Props { evaluation: PairedBiomassEvaluation; }
  let { evaluation }: Props = $props();
  const checked = $derived(evaluation.checks.filter((check) => check.status !== 'not-checked'));
  const passed = $derived(checked.filter((check) => check.status === 'pass').length);
</script>

<section class="feedback" aria-labelledby="feedback-title">
  <header><div><span class="eyebrow">Is this working? · same-seed comparison</span><h2 id="feedback-title">{evaluation.headline}</h2><p>{evaluation.summary}</p></div><span class={`verdict ${evaluation.status}`}>{evaluation.status}</span></header>
  <div class="questions">
    {#each evaluation.questions as item (item.id)}
      <article class={item.tone}><span>{item.question}</span><strong>{item.answer}</strong><p>{item.detail}</p></article>
    {/each}
  </div>
  <div class="check-summary"><div><span>Basic checks available</span><strong>{passed}/{checked.length} pass</strong></div><p>{evaluation.checks.filter((check) => check.status === 'not-checked').length} important checks are not implemented yet.</p></div>
  <details><summary>Show checks, thresholds and current limits</summary><div class="detail-grid">
    <section><h3>Checks</h3><ul>{#each evaluation.checks as check (check.id)}<li class={check.status}><span>{check.status === 'pass' ? 'Pass' : check.status === 'fail' ? 'Fail' : 'Not yet'}</span><div><strong>{check.question}</strong><p>{check.summary}</p></div></li>{/each}</ul></section>
    <section><h3>Claim level and limits</h3><p class="claim">{evaluation.claimLevel}</p><ul class="limits">{#each evaluation.limitations as limitation}<li>{limitation}</li>{/each}</ul></section>
  </div></details>
</section>

<style>
  .feedback { min-width: 0; padding: 1.1rem; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  header { display: flex; justify-content: space-between; gap: 1rem; }
  .eyebrow { color: var(--accent-soft); font-size: 0.61rem; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; }
  h2 { margin: 0.24rem 0 0.3rem; font-size: 1.2rem; }
  header p { max-width: 720px; margin: 0; color: var(--text-muted); font-size: 0.72rem; line-height: 1.48; }
  .verdict { align-self: flex-start; padding: 0.3rem 0.48rem; color: #c9f5da; background: rgba(104,224,163,0.1); border: 1px solid rgba(104,224,163,0.3); border-radius: 999px; font: 700 0.59rem var(--font-mono); text-transform: uppercase; }
  .verdict.survived { color: #ffe0a8; background: rgba(255,196,107,0.09); border-color: rgba(255,196,107,0.3); }
  .verdict.collapsed, .verdict.invalid { color: #ffc0b8; background: rgba(240,127,115,0.09); border-color: rgba(240,127,115,0.3); }
  .questions { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 0.55rem; margin-top: 0.9rem; }
  article { min-width: 0; padding: 0.72rem; background: #0f1116; border: 1px solid var(--border-soft); border-top: 2px solid #68e0a3; border-radius: var(--radius-md); }
  article.caution { border-top-color: #ffc46b; } article.problem { border-top-color: #f07f73; }
  article > span { color: var(--text-faint); font-size: 0.58rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
  article strong { display: block; margin-top: 0.35rem; color: #e7e9ed; font-size: 0.73rem; line-height: 1.35; }
  article p { margin: 0.35rem 0 0; color: var(--text-faint); font-size: 0.62rem; line-height: 1.4; }
  .check-summary { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 0.7rem; padding: 0.65rem 0.75rem; background: rgba(255,255,255,0.025); border-radius: var(--radius-md); }
  .check-summary span, .check-summary strong { display: block; } .check-summary span { color: var(--text-faint); font-size: 0.55rem; text-transform: uppercase; } .check-summary strong { margin-top: 0.15rem; font: 750 0.76rem var(--font-mono); } .check-summary p { margin: 0; color: var(--text-faint); font-size: 0.62rem; }
  details { margin-top: 0.7rem; border-top: 1px solid var(--border-soft); } summary { padding-top: 0.7rem; color: var(--text-muted); font-size: 0.66rem; font-weight: 800; cursor: pointer; }
  .detail-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 1rem; margin-top: 0.7rem; } h3 { margin: 0 0 0.5rem; font-size: 0.72rem; }
  ul { display: grid; gap: 0.4rem; margin: 0; padding: 0; list-style: none; } .detail-grid li { display: grid; grid-template-columns: 52px minmax(0,1fr); gap: 0.5rem; color: var(--text-muted); font-size: 0.62rem; }
  .detail-grid li > span { color: #9ce9bc; font: 700 0.56rem var(--font-mono); text-transform: uppercase; } .detail-grid li.not-checked > span { color: #ffc46b; } .detail-grid li.fail > span { color: #f7a097; }
  .detail-grid li strong { display: block; color: var(--text-muted); } .detail-grid li p { margin: 0.12rem 0 0; color: var(--text-faint); line-height: 1.38; }
  .claim { margin: 0 0 0.6rem; color: var(--accent-soft); font-size: 0.66rem; line-height: 1.5; } ul.limits li { display: block; padding-left: 0.85rem; position: relative; } ul.limits li::before { position: absolute; left: 0; content: '◇'; color: var(--text-faint); }
  @media (max-width: 980px) { .questions { grid-template-columns: repeat(2,1fr); } }
  @media (max-width: 620px) { header { flex-direction: column; } .questions, .detail-grid { grid-template-columns: 1fr; } .check-summary { align-items: flex-start; flex-direction: column; } }
</style>
