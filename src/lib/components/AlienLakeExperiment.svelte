<script lang="ts">
  import type { LakePatchId } from '../analysis';
  import type { AlienLakeView, LakePlotPoint } from '../projections';

  type ExplanationLens = 'curious' | 'biology' | 'engine';
  interface SpectrumOption { id: string; label: string; summary: string; }
  interface Props {
    view: AlienLakeView;
    spectrumOptions: readonly SpectrumOption[];
    ontick: (tick: number) => void;
    onpatch: (patchId: LakePatchId) => void;
    onspectrum: (spectrumId: string) => void;
  }
  let { view, spectrumOptions, ontick, onpatch, onspectrum }: Props = $props();
  let lens = $state<ExplanationLens>('curious');

  const width = 1000;
  const spectrumHeight = 245;
  const historyHeight = 180;
  const pad = { left: 50, right: 20, top: 20, bottom: 32 };

  function linePath(points: readonly LakePlotPoint[], height: number, normalizeOwnSeries = false): string {
    if (!points.length) return '';
    const xMin = Math.min(...points.map(({ coordinate }) => coordinate));
    const xMax = Math.max(...points.map(({ coordinate }) => coordinate));
    const yMax = normalizeOwnSeries ? Math.max(...points.map(({ value }) => value), 1e-9) : 1;
    return points.map((point, index) => {
      const x = pad.left + (point.coordinate - xMin) / Math.max(1, xMax - xMin) * (width - pad.left - pad.right);
      const y = pad.top + (1 - Math.max(0, point.value) / yMax) * (height - pad.top - pad.bottom);
      return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }

  function historyPath(samples: readonly { tick: number; value: number }[]): string {
    const maxValue = Math.max(...view.history.flatMap((series) => series.samples.map(({ value }) => value)), 1);
    return samples.map((sample, index) => {
      const x = pad.left + sample.tick / Math.max(1, view.duration) * (width - pad.left - pad.right);
      const y = pad.top + (1 - sample.value / maxValue) * (historyHeight - pad.top - pad.bottom);
      return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }

  function tickX(tick: number): number {
    return pad.left + tick / Math.max(1, view.duration) * (width - pad.left - pad.right);
  }

  const explanations = {
    curious: {
      heading: 'What am I looking at?',
      paragraphs: [
        'The lake has three connected neighbourhoods. Light changes with depth, while nutrients and remains move between them. The coloured response shapes are different ways a population can catch some of that incoming energy.',
        'At day 72, one daughter population gets a small seeded shift in the part of the spectrum it can use. That can help or hurt, and it costs extra to build and maintain. Nothing is declared “better” in advance.',
        'The model is deliberately simplified. It is a plausible, challengeable explanation of the machinery—not a reconstruction of a real alien lake.'
      ]
    },
    biology: {
      heading: 'Ecology and evolution lens',
      paragraphs: [
        'Each response is a bounded, fictional photochemical phenotype with one or more absorption bands, an accessibility efficiency and explicit construction, maintenance and repair costs. Incident, absorbed, accessible and returned power remain separate quantities.',
        'Growth converts a closed nutrient stock into aggregate biomass. Turnover creates detritus; recycling returns some detritus to accessible nutrient. Habitat links exchange both stocks. The daughter inherits an authored response with a ±30 nm keyed-seed displacement.',
        'This probes spectral niche matching and ecological accounting. It does not yet model pigment biosynthesis, molecular pathways, individual organisms, mutation distributions or calibrated population genetics.'
      ]
    },
    engine: {
      heading: 'Engine and verification lens',
      paragraphs: [
        'The provider supplies a pinned spectral field. A generic numeric-field response evaluator integrates capture, applies bounded efficiency and costs, and returns an explicit remainder. The evaluator contains no pigment or wavelength-specific engine branch.',
        'Every material conversion is recorded through the generic accounting ledger. Negative stocks, conservation error and accounting debt are hard failures. Named counter-addressed randomness isolates the daughter response from unrelated execution order.',
        'From day 120 the sediment subgraph is represented by an exact retained-state wrapper. A disturbance re-expands it at day 168. Matching hashes prove reversible identity; this version deliberately does not claim compute-saving coarse-graining.'
      ]
    }
  } as const;
  const activeExplanation = $derived(explanations[lens]);
</script>

<section class="lake-lab" aria-labelledby="lake-title">
  <header class="lake-header">
    <div>
      <span class="eyebrow">Draft integration experiment · spectral ecology</span>
      <h2 id="lake-title">Alien Lake</h2>
      <p>One physical light field, three connected liquid habitats and costly response strategies competing for a finite material ledger.</p>
    </div>
    <label class="spectrum-picker" for="lake-spectrum">
      <span>Incoming light fixture</span>
      <select id="lake-spectrum" value={view.spectrumId} onchange={(event) => onspectrum(event.currentTarget.value)}>
        {#each spectrumOptions as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
      <small>{spectrumOptions.find(({ id }) => id === view.spectrumId)?.summary}</small>
    </label>
  </header>

  <div class="status-strip" aria-label="Experiment status">
    <div><span>Day</span><strong>{view.tick} / {view.duration}</strong></div>
    <div><span>Material total</span><strong>{view.totals.material.toFixed(2)}</strong><small>lake mass · closed</small></div>
    <div><span>Accounting</span><strong class:pass={view.accounting.residualMinorUnits === 0 && view.accounting.transactionResidualMinorUnits === 0 && view.accounting.adjustmentDebtMinorUnits === 0}>{view.accounting.residualMinorUnits === 0 && view.accounting.transactionResidualMinorUnits === 0 && view.accounting.adjustmentDebtMinorUnits === 0 ? 'Balanced' : 'Invalid'}</strong><small>debt {view.accounting.adjustmentDebtMinorUnits}</small></div>
    <div><span>Resolution</span><strong>{view.resolution.replace('-', ' ')}</strong><small>{view.resolution === 'exact-wrapper' ? 'members retained' : 'members visible'}</small></div>
  </div>

  <section class="time-control" aria-label="Alien Lake timeline">
    <div class="range-label"><span>Inspect the lake through time</span><strong>Day {view.tick}</strong></div>
    <input aria-label="Inspect Alien Lake day" type="range" min="0" max={view.duration} value={view.tick} oninput={(event) => ontick(Number(event.currentTarget.value))} />
    <div class="event-scale" aria-hidden="true">
      {#each view.events as event (event.id)}
        <i class={`event ${event.kind}`} style={`left:${event.tick / view.duration * 100}%`} title={event.title}></i>
      {/each}
    </div>
  </section>

  <div class="lake-grid">
    <section class="cross-section" aria-labelledby="habitats-title">
      <div class="panel-title"><div><span>Connected habitats</span><h3 id="habitats-title">A lake is not one uniform place</h3></div><small>Select a layer</small></div>
      <div class="layers">
        {#each view.patches as patch, index (patch.id)}
          <button class:active={view.selectedPatch.id === patch.id} class={`layer layer-${index}`} onclick={() => onpatch(patch.id)} aria-pressed={view.selectedPatch.id === patch.id}>
            <span class="layer-depth">{patch.depthM} m</span>
            <span class="layer-name">{patch.label}</span>
            <span class="layer-facts"><b>{patch.incidentPower.toFixed(2)}</b> W·m⁻² reaches this layer · <b>{patch.populations.length}</b> response {patch.populations.length === 1 ? 'family' : 'families'}</span>
            <span class="stocks"><i style={`--fill:${Math.min(100, patch.nutrient / 5)}%`}></i>Nutrient {patch.nutrient.toFixed(1)} · Detritus {patch.detritus.toFixed(1)}</span>
          </button>
        {/each}
      </div>
      <div class="transport-note"><span>↕</span><p><strong>Material moves between neighbours.</strong> The arrows are an authored mixing relationship, not instant global blending.</p></div>
    </section>

    <section class="spectrum-panel" aria-labelledby="spectrum-title">
      <div class="panel-title"><div><span>Energy opportunity</span><h3 id="spectrum-title">What reaches {view.selectedPatch.label.toLowerCase()}</h3></div><small>{view.selectedPatch.returnedPeakNm} nm returned-field peak</small></div>
      <div class="spectrum-legend">
        {#each view.spectrumSeries as series (series.id)}<span><i style={`--color:${series.color}`}>{series.symbol}</i>{series.label}</span>{/each}
      </div>
      <svg viewBox={`0 0 ${width} ${spectrumHeight}`} role="img" aria-label={`Normalised spectral shapes for ${view.selectedPatch.label}`}>
        <defs><linearGradient id="wavelength-band" x1="0" x2="1"><stop offset="0" stop-color="#6f55ff"/><stop offset=".2" stop-color="#4aa7ff"/><stop offset=".38" stop-color="#54e09a"/><stop offset=".55" stop-color="#ffe36e"/><stop offset=".72" stop-color="#ff8d4e"/><stop offset="1" stop-color="#732c38"/></linearGradient></defs>
        <g class="grid"><line x1={pad.left} x2={width-pad.right} y1={spectrumHeight-pad.bottom} y2={spectrumHeight-pad.bottom}/><line x1={pad.left} x2={width-pad.right} y1={pad.top} y2={pad.top}/></g>
        <rect x={pad.left} y={spectrumHeight-pad.bottom+5} width={width-pad.left-pad.right} height="7" rx="3" fill="url(#wavelength-band)" opacity=".8"/>
        {#each view.spectrumSeries as series, index (series.id)}
          <path d={linePath(series.points, spectrumHeight, true)} fill="none" stroke={series.color} stroke-width={index === 0 ? 4 : 2.5} stroke-dasharray={series.dash} opacity={index === 0 ? .95 : .8}/>
        {/each}
        <text x={pad.left} y={spectrumHeight-5}>280 nm</text><text x={width-pad.right} y={spectrumHeight-5} text-anchor="end">1,400 nm</text>
      </svg>
      <p class="chart-note">Shapes are individually normalised so overlaps are readable. This compares <em>where</em> energy and responses occur—not their absolute heights. Numeric power is shown below.</p>
    </section>
  </div>

  <section class="response-section" aria-labelledby="responses-title">
    <div class="panel-title"><div><span>Costly capabilities</span><h3 id="responses-title">Response families in {view.selectedPatch.label.toLowerCase()}</h3></div><small>Real run values at day {view.tick}</small></div>
    <div class="response-cards">
      {#each view.selectedPatch.populations as population (population.id)}
        <article>
          <div class="response-heading"><span class="response-swatch" aria-hidden="true"></span><div><h4>{population.title}</h4><small>{population.ancestry}</small></div><strong>{population.biomass.toFixed(1)} mass</strong></div>
          <dl>
            <div><dt>Primary response</dt><dd>{population.responseCenterNm} ± {population.responseWidthNm} nm</dd></div>
            <div><dt>Light caught</dt><dd>{population.absorbedPower.toFixed(2)} W·m⁻² · {population.capturePercent}%</dd></div>
            <div><dt>Usable after conversion</dt><dd>{population.accessiblePower.toFixed(2)} W·m⁻²</dd></div>
            <div><dt>Build + upkeep</dt><dd>{population.operatingCost.toFixed(2)} W·m⁻²</dd></div>
            <div class:negative={population.netPower < 0}><dt>Net opportunity</dt><dd>{population.netPower.toFixed(2)} W·m⁻²</dd></div>
          </dl>
        </article>
      {:else}
        <p class="empty">No response family currently occupies this layer.</p>
      {/each}
    </div>
  </section>

  <div class="evidence-grid">
    <section class="history-panel" aria-labelledby="history-title">
      <div class="panel-title"><div><span>Closed material history</span><h3 id="history-title">The same matter changes roles</h3></div><small>Not individual organisms</small></div>
      <div class="history-legend">{#each view.history as series}<span><i style={`--color:${series.color}`}>{series.symbol}</i>{series.label} · {series.unit}</span>{/each}</div>
      <svg viewBox={`0 0 ${width} ${historyHeight}`} role="img" aria-label="Lake material stocks through time">
        <g class="grid"><line x1={pad.left} x2={width-pad.right} y1={historyHeight-pad.bottom} y2={historyHeight-pad.bottom}/></g>
        {#each view.events as event (event.id)}<line class={`marker ${event.kind}`} x1={tickX(event.tick)} x2={tickX(event.tick)} y1={pad.top} y2={historyHeight-pad.bottom}/>{/each}
        {#each view.history as series (series.id)}<path d={historyPath(series.samples)} fill="none" stroke={series.color} stroke-width="3"/>{/each}
        <line class="cursor" x1={tickX(view.tick)} x2={tickX(view.tick)} y1={pad.top} y2={historyHeight-pad.bottom}/>
        <text x={pad.left} y={historyHeight-7}>D0</text><text x={width-pad.right} y={historyHeight-7} text-anchor="end">D{view.duration}</text>
      </svg>
    </section>

    <section class="proof-panel" aria-labelledby="proof-title">
      <div class="panel-title"><div><span>Scale-recursion probe</span><h3 id="proof-title">Can detail hide and return unchanged?</h3></div><strong class:pass={view.scaleProof.exactResume}>{view.scaleProof.exactResume ? 'Exact match' : 'Mismatch'}</strong></div>
      <div class="proof-flow" aria-label="Detailed to wrapped to re-expanded sequence"><div><b>D0–119</b><span>Detailed refuge</span></div><i>→</i><div><b>D120–167</b><span>One boundary<br/>members retained</span></div><i>→</i><div><b>D168+</b><span>Exact re-expansion</span></div></div>
      <dl class="proof-facts">
        <div><dt>Final hash</dt><dd>{view.scaleProof.finalWrappedHash.slice(0, 14)}…</dd></div>
        <div><dt>Always-detailed</dt><dd>{view.scaleProof.finalDetailedHash.slice(0, 14)}…</dd></div>
        <div><dt>Observable error</dt><dd>{Math.max(...view.scaleProof.observableDistances.map(({ distance }) => distance))}</dd></div>
        <div><dt>Retained members</dt><dd>{view.scaleProof.retainedMemberCount}</dd></div>
      </dl>
      <p class="honesty"><strong>What this proves:</strong> a stable subgraph can have an explicit boundary identity and return exactly. <strong>What it does not:</strong> save computation or reconstruct discarded detail.</p>
    </section>
  </div>

  <section class="comparison-strip" aria-label="Counterfactual checks">
    <div><span>Same response · different light</span><strong>{view.comparisons.sameResponseDifferentLightPercent > 0 ? '+' : ''}{view.comparisons.sameResponseDifferentLightPercent}%</strong><p>The physical field changes accessible power.</p></div>
    <div><span>Same light · different response</span><strong>{view.comparisons.sameLightDifferentResponsePercent > 0 ? '+' : ''}{view.comparisons.sameLightDifferentResponsePercent}%</strong><p>The evolved response changes accessible power.</p></div>
    <div><span>Why both checks matter</span><strong>Input ≠ adaptation</strong><p>The provider owns the light; the population owns its response.</p></div>
  </section>

  <section class="event-and-help">
    <div class="events-panel">
      <div class="panel-title"><div><span>Causal trail</span><h3>What has happened by day {view.tick}</h3></div></div>
      {#each view.visibleEvents as event (event.id)}
        <button onclick={() => ontick(event.tick)}><time>D{event.tick}</time><div><strong>{event.title}</strong><p>{event.summary}</p></div><span>{event.kind}</span></button>
      {:else}<p class="empty">No authored event has occurred yet.</p>{/each}
    </div>
    <aside class="lake-help" aria-labelledby="lake-help-title">
      <span class="eyebrow">Learn the experiment · three cumulative lenses</span>
      <h3 id="lake-help-title">The same result, explained three ways</h3>
      <div class="lens-tabs" role="tablist" aria-label="Explanation depth">
        <button role="tab" aria-selected={lens === 'curious'} class:active={lens === 'curious'} onclick={() => (lens = 'curious')}>1 · Curious</button>
        <button role="tab" aria-selected={lens === 'biology'} class:active={lens === 'biology'} onclick={() => (lens = 'biology')}>2 · Biology</button>
        <button role="tab" aria-selected={lens === 'engine'} class:active={lens === 'engine'} onclick={() => (lens = 'engine')}>3 · Engine</button>
      </div>
      <div class="explanation" role="tabpanel"><h4>{activeExplanation.heading}</h4>{#each activeExplanation.paragraphs as paragraph}<p>{paragraph}</p>{/each}</div>
    </aside>
  </section>
</section>

<style>
  .lake-lab { display: grid; gap: .8rem; }
  .lake-header, .status-strip, .time-control, .cross-section, .spectrum-panel, .response-section, .history-panel, .proof-panel, .comparison-strip, .events-panel, .lake-help { background: #111319; border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .lake-header { display: flex; justify-content: space-between; gap: 1.2rem; padding: 1.15rem 1.25rem; background: radial-gradient(circle at 70% 0, rgba(84,124,207,.15), transparent 24rem), linear-gradient(145deg, rgba(92,224,183,.07), transparent), #111319; }
  .eyebrow, .panel-title span { color: #72d6a0; font-size: .59rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  h2 { margin: .2rem 0 .35rem; font-size: clamp(1.45rem,3vw,2.2rem); } .lake-header p { max-width: 720px; margin: 0; color: var(--text-muted); font-size: .76rem; line-height: 1.5; }
  .spectrum-picker { width: min(360px,100%); } .spectrum-picker span { display: block; margin-bottom: .3rem; color: var(--text-faint); font-size: .58rem; font-weight: 800; text-transform: uppercase; }
  select { width: 100%; padding: .55rem .65rem; color: white; background: #0b0d12; border: 1px solid #3a4350; border-radius: 6px; font-size: .68rem; } .spectrum-picker small { display: block; margin-top: .3rem; color: var(--text-faint); font-size: .56rem; line-height: 1.35; }
  .status-strip { display: grid; grid-template-columns: repeat(4,1fr); overflow: hidden; } .status-strip > div { padding: .7rem .85rem; } .status-strip > div + div { border-left: 1px solid var(--border-soft); }
  .status-strip span,.status-strip strong,.status-strip small { display: block; } .status-strip span { color: var(--text-faint); font-size: .54rem; text-transform: uppercase; letter-spacing: .08em; } .status-strip strong { margin-top: .18rem; font: 750 .8rem var(--font-mono); text-transform: capitalize; } .status-strip small { margin-top: .13rem; color: var(--text-faint); font-size: .53rem; } .pass { color: #78e3a6 !important; }
  .time-control { position: relative; padding: .7rem .9rem .9rem; } .range-label { display: flex; justify-content: space-between; color: var(--text-muted); font-size: .62rem; } .range-label strong { color: white; font-family: var(--font-mono); } .time-control input { width: 100%; margin: .5rem 0 0; accent-color: #68e0a3; }
  .event-scale { position: relative; height: 6px; margin: 0 7px; } .event { position: absolute; width: 2px; height: 6px; background: #78818d; } .event.variation { background: #ffb765; } .event.environment { background: #74bfff; } .event.resolution { background: #b99cff; }
  .lake-grid,.evidence-grid,.event-and-help { display: grid; grid-template-columns: minmax(340px,.78fr) minmax(0,1.35fr); gap: .8rem; }
  .panel-title { display: flex; justify-content: space-between; align-items: flex-start; gap: .8rem; margin-bottom: .7rem; } .panel-title h3 { margin: .16rem 0 0; font-size: .88rem; } .panel-title small,.panel-title > strong { color: var(--text-faint); font: .56rem var(--font-mono); }
  .cross-section,.spectrum-panel,.response-section,.history-panel,.proof-panel,.events-panel,.lake-help { padding: 1rem; min-width: 0; }
  .layers { display: grid; gap: 3px; overflow: hidden; border-radius: 8px; } .layer { display: grid; grid-template-columns: 50px 1fr auto; gap: .5rem; align-items: center; min-height: 72px; padding: .7rem; text-align: left; border: 1px solid transparent; border-radius: 0; }
  .layer-0 { background: linear-gradient(90deg,rgba(255,224,138,.16),rgba(64,113,147,.14)); } .layer-1 { background: linear-gradient(90deg,rgba(57,116,159,.28),rgba(32,61,92,.22)); } .layer-2 { background: linear-gradient(90deg,rgba(99,75,128,.24),rgba(63,49,64,.3)); }
  .layer.active { border-color: #d8e5ef; box-shadow: inset 3px 0 #68e0a3; } .layer-depth { color: var(--text-faint); font: .58rem var(--font-mono); } .layer-name { color: white; font-size: .7rem; font-weight: 800; } .layer-facts { color: var(--text-muted); font-size: .56rem; line-height: 1.35; } .layer-facts b { color: #dce7ef; }
  .stocks { grid-column: 2 / -1; position: relative; overflow: hidden; padding: .25rem .38rem; color: #9ca8b2; background: rgba(0,0,0,.24); border-radius: 4px; font: .5rem var(--font-mono); } .stocks i { position: absolute; inset: 0 auto 0 0; width: var(--fill); background: rgba(104,224,163,.08); }
  .transport-note { display: flex; gap: .5rem; align-items: center; padding: .65rem .2rem 0; } .transport-note > span { color: #74bfff; font-size: 1.2rem; } .transport-note p { margin: 0; color: var(--text-faint); font-size: .56rem; line-height: 1.4; } .transport-note strong { color: var(--text-muted); }
  .spectrum-legend,.history-legend { display: flex; flex-wrap: wrap; gap: .55rem; margin-bottom: .4rem; color: var(--text-muted); font-size: .55rem; } .spectrum-legend i,.history-legend i { margin-right: .2rem; color: var(--color); font-style: normal; }
  svg { width: 100%; height: auto; overflow: visible; background: #0d0f14; border-radius: 7px; } svg text { fill: var(--text-faint); font: 20px var(--font-mono); } .grid line { stroke: #2b3039; stroke-width: 2; } .chart-note { margin: .45rem 0 0; color: var(--text-faint); font-size: .56rem; line-height: 1.4; }
  .response-cards { display: grid; grid-template-columns: repeat(auto-fit,minmax(230px,1fr)); gap: .55rem; } article { padding: .75rem; background: #0d0f14; border: 1px solid var(--border-soft); border-radius: 7px; } .response-heading { display: grid; grid-template-columns: 8px 1fr auto; gap: .5rem; align-items: start; }
  .response-swatch { width: 8px; height: 28px; background: linear-gradient(#ffe36e,#8f5aff); border-radius: 4px; } h4 { margin: 0; font-size: .7rem; } .response-heading small { color: var(--text-faint); font-size: .52rem; } .response-heading > strong { color: #aee7c7; font: .58rem var(--font-mono); }
  dl { display: grid; gap: .28rem; margin: .65rem 0 0; } dl div { display: flex; justify-content: space-between; gap: .4rem; padding-top: .27rem; border-top: 1px solid var(--border-soft); } dt { color: var(--text-faint); font-size: .54rem; } dd { margin: 0; color: #cbd1d8; font: .54rem var(--font-mono); text-align: right; } dl div.negative dd { color: #ff9285; }
  .history-panel { min-width: 0; } .marker { stroke: #6c7480; stroke-width: 1.5; stroke-dasharray: 5 5; opacity: .6; } .marker.variation { stroke: #ffb765; } .marker.environment { stroke: #74bfff; } .marker.resolution { stroke: #b99cff; } .cursor { stroke: white; stroke-width: 2; opacity: .9; }
  .proof-panel { background: linear-gradient(145deg,rgba(185,156,255,.07),transparent),#111319; } .proof-flow { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: .35rem; align-items: center; } .proof-flow div { min-height: 68px; padding: .5rem; background: #0d0f14; border: 1px solid var(--border-soft); border-radius: 6px; } .proof-flow b,.proof-flow span { display: block; } .proof-flow b { color: #cbb7ff; font: .55rem var(--font-mono); } .proof-flow span { margin-top: .28rem; color: var(--text-muted); font-size: .56rem; line-height: 1.3; } .proof-flow > i { color: #8a7dad; font-style: normal; }
  .proof-facts { grid-template-columns: 1fr 1fr; } .honesty { margin: .65rem 0 0; padding: .6rem; color: var(--text-faint); background: rgba(0,0,0,.2); border-left: 2px solid #b99cff; font-size: .57rem; line-height: 1.45; } .honesty strong { color: #ddd2fa; }
  .comparison-strip { display: grid; grid-template-columns: repeat(3,1fr); overflow: hidden; } .comparison-strip > div { padding: .8rem .95rem; } .comparison-strip > div + div { border-left: 1px solid var(--border-soft); } .comparison-strip span,.comparison-strip strong { display: block; } .comparison-strip span { color: var(--text-faint); font-size: .54rem; text-transform: uppercase; } .comparison-strip strong { margin-top: .25rem; color: #9adfc0; font: .78rem var(--font-mono); } .comparison-strip p { margin: .25rem 0 0; color: var(--text-muted); font-size: .56rem; }
  .event-and-help { grid-template-columns: minmax(320px,.8fr) minmax(0,1.2fr); } .events-panel button { display: grid; grid-template-columns: 38px 1fr auto; gap: .55rem; width: 100%; padding: .55rem 0; text-align: left; background: transparent; border: 0; border-top: 1px solid var(--border-soft); } .events-panel time { color: #ffb765; font: .56rem var(--font-mono); } .events-panel strong { font-size: .62rem; } .events-panel p { margin: .15rem 0 0; color: var(--text-faint); font-size: .55rem; line-height: 1.35; } .events-panel button > span { color: var(--text-faint); font-size: .49rem; text-transform: uppercase; }
  .lake-help { background: linear-gradient(155deg,rgba(116,191,255,.06),transparent),#111319; } .lake-help h3 { margin: .2rem 0 .7rem; font-size: .88rem; } .lens-tabs { display: grid; grid-template-columns: repeat(3,1fr); gap: 3px; padding: 3px; background: #090b0f; border: 1px solid var(--border-soft); border-radius: 7px; } .lens-tabs button { padding: .43rem; color: var(--text-muted); background: transparent; border: 0; border-radius: 5px; font-size: .58rem; } .lens-tabs button.active { color: white; background: #263240; } .explanation { padding-top: .8rem; } .explanation h4 { color: #b8ddf8; } .explanation p { margin: .48rem 0 0; color: var(--text-muted); font-size: .62rem; line-height: 1.5; }
  .empty { color: var(--text-faint); font-size: .6rem; }
  @media (max-width: 980px) { .lake-grid,.evidence-grid,.event-and-help { grid-template-columns: 1fr; } }
  @media (max-width: 700px) { .lake-header { flex-direction: column; } .spectrum-picker { width: 100%; } .status-strip,.comparison-strip { grid-template-columns: 1fr 1fr; } .status-strip > div:nth-child(3) { border-left: 0; border-top: 1px solid var(--border-soft); } .status-strip > div:nth-child(4) { border-top: 1px solid var(--border-soft); } .comparison-strip > div:nth-child(3) { grid-column: 1/-1; border-top: 1px solid var(--border-soft); border-left: 0; } .layer { grid-template-columns: 42px 1fr; } .layer-facts { grid-column: 2; } .proof-flow { grid-template-columns: 1fr; } .proof-flow > i { transform: rotate(90deg); text-align: center; } }
</style>
