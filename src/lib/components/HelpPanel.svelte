<script lang="ts">
  import type { HelpAudience, HelpTopic } from '../help';
  interface Props { topic: HelpTopic; }
  let { topic }: Props = $props();
  let audience = $state<HelpAudience>('curious');
  let conceptValue = $state(0);
  let initializedTopicId = $state('');
  const active = $derived(topic.lenses[audience]);

  $effect(() => {
    if (topic.id !== initializedTopicId) {
      conceptValue = topic.conceptDemo.slider.initialValue;
      initializedTopicId = topic.id;
    }
  });
  function outputValue(relation: 'direct' | 'inverse'): number {
    const slider = topic.conceptDemo.slider;
    const ratio = (conceptValue - slider.minimum) / Math.max(1, slider.maximum - slider.minimum);
    return Math.round((relation === 'direct' ? ratio : 1 - ratio) * 100);
  }
</script>

<aside class="help-panel" aria-labelledby="help-title">
  <header><span class="eyebrow">Learn this result · three cumulative lenses</span><h2 id="help-title">{topic.title}</h2><p>{topic.intro}</p></header>
  <div class="lens-tabs" role="tablist" aria-label="Explanation depth">
    {#each ['curious', 'biology', 'engine'] as lensId, index}
      {@const item = topic.lenses[lensId as HelpAudience]}
      <button role="tab" aria-selected={audience === item.id} class:active={audience === item.id} onclick={() => (audience = item.id)}><span>{index + 1}</span>{item.label}</button>
    {/each}
  </div>
  <section class="lens-content" role="tabpanel" aria-live="polite">
    <h3>{active.heading}</h3><p class="scope">{active.scopeNote}</p>{#each active.paragraphs as paragraph}<p>{paragraph}</p>{/each}
    <dl>{#each active.terms as item}<div><dt>{item.term}</dt><dd>{item.meaning}</dd></div>{/each}</dl>
  </section>
  <figure aria-label={topic.diagram.label}><figcaption>{topic.diagram.label} · schematic</figcaption><div class="fork"><div class="shared">{topic.diagram.shared}</div><div class="branch changed"><span>With change</span>{topic.diagram.changed}</div><div class="branch comparison"><span>Comparison</span>{topic.diagram.comparison}</div></div></figure>
  <section class="concept" aria-labelledby="concept-title">
    <span class="concept-tag">Small concept demo · not the simulation</span><h3 id="concept-title">{topic.conceptDemo.title}</h3><p>{topic.conceptDemo.summary}</p>
    <label for="concept-slider">{topic.conceptDemo.slider.label}<strong>{conceptValue}{topic.conceptDemo.slider.unit}</strong></label>
    <input id="concept-slider" type="range" min={topic.conceptDemo.slider.minimum} max={topic.conceptDemo.slider.maximum} step={topic.conceptDemo.slider.step} bind:value={conceptValue} />
    <div class="concept-outputs">{#each topic.conceptDemo.outputs as output (output.id)}{@const amount = outputValue(output.relation)}<div><span>{output.label}</span><div class="meter"><i style={`width:${amount}%`}></i></div><small>{amount < 50 ? output.lowText : output.highText}</small></div>{/each}</div>
    <p class="disclaimer">{topic.conceptDemo.disclaimer}</p>
  </section>
</aside>

<style>
  .help-panel { min-width: 0; padding: 1.1rem; background: linear-gradient(155deg, rgba(116,191,255,0.055), transparent 45%), #111319; border: 1px solid #2d3540; border-radius: var(--radius-lg); }
  .eyebrow, .concept-tag { color: #91cfff; font-size: 0.59rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; } h2 { margin: 0.25rem 0 0.3rem; font-size: 1.05rem; } header p { margin: 0; color: var(--text-faint); font-size: 0.65rem; line-height: 1.45; }
  .lens-tabs { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.25rem; margin-top: 0.75rem; padding: 3px; background: #090b0f; border: 1px solid var(--border-soft); border-radius: 7px; }
  .lens-tabs button { display: flex; justify-content: center; align-items: center; gap: 0.3rem; min-width: 0; padding: 0.42rem 0.3rem; color: var(--text-muted); background: transparent; border: 0; border-radius: 5px; font-size: 0.62rem; }
  .lens-tabs button span { display: grid; width: 16px; height: 16px; place-items: center; color: var(--text-faint); background: #20242c; border-radius: 50%; font: 0.52rem var(--font-mono); }
  .lens-tabs button.active { color: white; background: #263240; box-shadow: inset 0 0 0 1px #3a4b5c; }
  .lens-content { min-height: 285px; padding: 0.8rem 0.15rem 0.2rem; } h3 { margin: 0; font-size: 0.78rem; } .lens-content > p { margin: 0.48rem 0 0; color: var(--text-muted); font-size: 0.65rem; line-height: 1.48; }
  .lens-content .scope { padding: 0.55rem 0.65rem; color: #bfdaf0; background: rgba(116,191,255,0.07); border-left: 2px solid #74bfff; border-radius: 0 5px 5px 0; }
  dl { display: grid; gap: 0.35rem; margin: 0.65rem 0 0; } dl div { display: grid; grid-template-columns: 94px minmax(0,1fr); gap: 0.45rem; } dt { color: #a9d7fb; font-size: 0.59rem; font-weight: 800; } dd { margin: 0; color: var(--text-faint); font-size: 0.59rem; line-height: 1.35; }
  figure { margin: 0.7rem 0 0; padding-top: 0.7rem; border-top: 1px solid var(--border-soft); } figcaption { margin-bottom: 0.45rem; color: var(--text-faint); font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.07em; }
  .fork { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 0.35rem; } .shared { display: flex; align-items: center; grid-row: 1 / 3; padding: 0.55rem; color: #dce4ea; background: #20252d; border-radius: 6px; font-size: 0.61rem; line-height: 1.35; }
  .branch { position: relative; padding: 0.45rem 0.55rem 0.45rem 0.72rem; color: var(--text-muted); background: #0d0f14; border: 1px solid var(--border-soft); border-radius: 6px; font-size: 0.58rem; line-height: 1.35; } .branch::before { position: absolute; left: -0.32rem; top: 50%; width: 0.32rem; border-top: 1px solid #56616d; content: ''; } .branch span { display: block; margin-bottom: 0.13rem; color: var(--accent-soft); font-size: 0.51rem; font-weight: 800; text-transform: uppercase; } .branch.comparison span { color: #91cfff; }
  .concept { margin-top: 0.75rem; padding: 0.75rem; background: #0c0e13; border: 1px solid var(--border-soft); border-radius: var(--radius-md); } .concept h3 { margin-top: 0.2rem; } .concept > p { margin: 0.3rem 0 0; color: var(--text-faint); font-size: 0.61rem; line-height: 1.4; }
  .concept label { display: flex; justify-content: space-between; margin-top: 0.6rem; color: var(--text-muted); font-size: 0.62rem; } .concept label strong { color: white; font-family: var(--font-mono); } .concept input { width: 100%; accent-color: #74bfff; }
  .concept-outputs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; } .concept-outputs > div { padding: 0.45rem; background: #14171d; border-radius: 5px; } .concept-outputs span, .concept-outputs small { display: block; } .concept-outputs span { color: var(--text-muted); font-size: 0.56rem; }
  .meter { height: 5px; margin: 0.3rem 0; overflow: hidden; background: #282d35; border-radius: 4px; } .meter i { display: block; height: 100%; background: linear-gradient(90deg, #436f91, #74bfff); } .concept-outputs small { color: var(--text-faint); font-size: 0.53rem; } .concept .disclaimer { margin-top: 0.55rem; color: #ffc98d; }
  @media (max-width: 620px) { .lens-tabs button { flex-direction: column; } .lens-content { min-height: 0; } .concept-outputs { grid-template-columns: 1fr; } }
</style>
