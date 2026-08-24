<script lang="ts">
  import {
    downsampleTemporalProjection,
    projectTemporalView,
    selectTemporalSeries,
    valueAtTick,
    type TemporalProjection,
    type TemporalViewMode
  } from '../projections/temporal';
  import type { TemporalSeriesStyle } from '../projections/presentation';

  interface Props {
    projection: TemporalProjection;
    styles: readonly TemporalSeriesStyle[];
    value: number;
    maxSamples?: number;
    onselect: (tick: number) => void;
  }

  let { projection, styles, value, maxSamples = 140, onselect }: Props = $props();
  let viewMode = $state<TemporalViewMode>('absolute');
  let visibleIds = $state<string[]>([]);
  let initializedProjectionId = $state('');
  let hoverTick = $state<number | null>(null);

  const width = 900;
  const height = 300;
  const padding = { top: 20, right: 18, bottom: 42, left: 58 };
  const firstTick = $derived(projection.series[0]?.samples[0]?.tick ?? 0);
  const lastTick = $derived(projection.series[0]?.samples.at(-1)?.tick ?? 1);
  const inspectedTick = $derived(hoverTick ?? value);
  const selectedProjection = $derived(selectTemporalSeries(projection, new Set(visibleIds)));
  const viewedProjection = $derived(projectTemporalView(selectedProjection, viewMode));
  const plottedProjection = $derived(
    downsampleTemporalProjection(viewedProjection, maxSamples, [value, inspectedTick])
  );
  const maximum = $derived.by(() => {
    const values = viewedProjection.series.flatMap((series) => series.samples.map((sample) => sample.value));
    return Math.max(1, ...values);
  });
  const inspectedValues = $derived(
    viewedProjection.series.map((series) => ({ ...series, value: valueAtTick(series, inspectedTick) ?? 0 }))
  );

  $effect(() => {
    if (projection.id !== initializedProjectionId) {
      visibleIds = projection.series.map((series) => series.id);
      initializedProjectionId = projection.id;
    }
  });

  function styleFor(seriesId: string): TemporalSeriesStyle {
    return styles.find((style) => style.seriesId === seriesId) ?? {
      seriesId,
      color: '#d5d8df',
      dashPattern: '0',
      symbol: '—'
    };
  }

  function x(tick: number): number {
    const range = Math.max(1, lastTick - firstTick);
    return padding.left + ((tick - firstTick) / range) * (width - padding.left - padding.right);
  }

  function y(valueToPlot: number): number {
    return padding.top + (1 - valueToPlot / maximum) * (height - padding.top - padding.bottom);
  }

  function linePath(samples: readonly { tick: number; value: number }[]): string {
    return samples.map((sample, index) => `${index === 0 ? 'M' : 'L'} ${x(sample.tick)} ${y(sample.value)}`).join(' ');
  }

  function areaPath(samples: readonly { tick: number; value: number }[]): string {
    if (samples.length === 0) return '';
    const baseline = height - padding.bottom;
    return `${linePath(samples)} L ${x(samples.at(-1)!.tick)} ${baseline} L ${x(samples[0].tick)} ${baseline} Z`;
  }

  function toggleSeries(seriesId: string): void {
    if (visibleIds.includes(seriesId)) {
      if (visibleIds.length === 1) return;
      visibleIds = visibleIds.filter((id) => id !== seriesId);
    } else {
      visibleIds = [...visibleIds, seriesId];
    }
  }

  function nearestTick(event: PointerEvent | MouseEvent): number {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / rect.width) * width;
    const ratio = (localX - padding.left) / (width - padding.left - padding.right);
    return Math.round(firstTick + Math.max(0, Math.min(1, ratio)) * (lastTick - firstTick));
  }

  function handleKey(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? firstTick
        : event.key === 'End'
          ? lastTick
          : Math.max(firstTick, Math.min(lastTick, value + (event.key === 'ArrowLeft' ? -1 : 1)));
    hoverTick = null;
    onselect(next);
  }

  function formatValue(valueToFormat: number): string {
    return viewMode === 'relative' ? `${valueToFormat.toFixed(1)}%` : valueToFormat.toFixed(1);
  }
</script>

<section class="levels-panel" aria-labelledby="levels-title">
  <header>
    <div>
      <span class="eyebrow">Stored run history · presentation only</span>
      <h2 id="levels-title">{projection.title}</h2>
      <p>{projection.quantityLabel} across {projection.series[0]?.samples.length ?? 0} daily snapshots.</p>
    </div>
    {#if projection.relativeMode}
      <div class="view-switch" aria-label="Chart value view">
        <button class:active={viewMode === 'absolute'} onclick={() => (viewMode = 'absolute')}>Absolute</button>
        <button class:active={viewMode === 'relative'} onclick={() => (viewMode = 'relative')}>Relative</button>
      </div>
    {/if}
  </header>

  <div class="legend" aria-label="Visible chart series">
    {#each projection.series as series (series.id)}
      {@const seriesStyle = styleFor(series.id)}
      <label class:muted={!visibleIds.includes(series.id)}>
        <input
          type="checkbox"
          checked={visibleIds.includes(series.id)}
          onchange={() => toggleSeries(series.id)}
          aria-label={`Show ${series.label}`}
        />
        <span class="legend-line" style={`--series:${seriesStyle.color}; --dash:${seriesStyle.dashPattern ?? '0'}`}>{seriesStyle.symbol}</span>
        <span>{series.label}</span>
      </label>
    {/each}
  </div>

  <div class="chart-layout">
    <div class="chart-shell">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="slider"
        tabindex="0"
        aria-label="Biomass history. Use left and right arrow keys to inspect another day."
        aria-valuemin={firstTick}
        aria-valuemax={lastTick}
        aria-valuenow={value}
        aria-valuetext={`Simulation day ${value}`}
        onkeydown={handleKey}
        onpointermove={(event) => (hoverTick = nearestTick(event))}
        onpointerleave={() => (hoverTick = null)}
        onclick={(event) => onselect(nearestTick(event))}
      >
        <title>Aggregate biomass levels through the stored simulation history</title>
        <desc>Five selectable series with recorded event markers and an inspection cursor at day {value}.</desc>
        <defs>
          <linearGradient id="total-biomass-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#68e0a3" stop-opacity="0.18" />
            <stop offset="1" stop-color="#68e0a3" stop-opacity="0.01" />
          </linearGradient>
        </defs>

        {#each [0, 0.25, 0.5, 0.75, 1] as fraction}
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={y(maximum * fraction)}
            y2={y(maximum * fraction)}
            class="grid-line"
          />
        {/each}

        <text x={padding.left - 8} y={padding.top + 4} text-anchor="end" class="axis-value">{formatValue(maximum)}</text>
        <text x={padding.left - 8} y={height - padding.bottom + 4} text-anchor="end" class="axis-value">0</text>
        <text x={padding.left} y={height - 12} class="axis-value">D{firstTick}</text>
        <text x={width - padding.right} y={height - 12} text-anchor="end" class="axis-value">D{lastTick}</text>

        {#each plottedProjection.markers as marker (marker.id)}
          <g class="event-marker">
            <title>{marker.label}, day {marker.tick}</title>
            <line x1={x(marker.tick)} x2={x(marker.tick)} y1={padding.top} y2={height - padding.bottom} />
            <rect x={x(marker.tick) - 3} y={padding.top + 3} width="6" height="6" transform={`rotate(45 ${x(marker.tick)} ${padding.top + 6})`} />
          </g>
        {/each}

        {#each plottedProjection.series as series (series.id)}
          {@const seriesStyle = styleFor(series.id)}
          {#if seriesStyle.areaOpacity}
            <path d={areaPath(series.samples)} fill="url(#total-biomass-area)" opacity={seriesStyle.areaOpacity} />
          {/if}
          <path
            d={linePath(series.samples)}
            class="series-line"
            stroke={seriesStyle.color}
            stroke-dasharray={seriesStyle.dashPattern}
          />
        {/each}

        <line class="cursor-line" x1={x(value)} x2={x(value)} y1={padding.top} y2={height - padding.bottom} />
        {#if hoverTick !== null && hoverTick !== value}
          <line class="hover-line" x1={x(hoverTick)} x2={x(hoverTick)} y1={padding.top} y2={height - padding.bottom} />
        {/if}
      </svg>
      <span class="chart-unit">{viewedProjection.unit}</span>
    </div>

    <aside class="readout" aria-live="polite" aria-label={`Values at simulation day ${inspectedTick}`}>
      <div class="readout-time"><span>Inspecting</span><strong>Day {inspectedTick}</strong></div>
      {#each inspectedValues as series (series.id)}
        {@const seriesStyle = styleFor(series.id)}
        <div class="readout-row">
          <span class="symbol" style={`color:${seriesStyle.color}`}>{seriesStyle.symbol}</span>
          <span>{series.label}</span>
          <strong>{formatValue(series.value)}</strong>
        </div>
      {/each}
    </aside>
  </div>

  <details>
    <summary>Explain this view</summary>
    <div class="explanation">
      <p>
        These lines are aggregate biomass values copied from the deterministic run’s daily snapshots. “Total” sums populations marked active on that day. Event markers are existing recorded simulation events.
      </p>
      <p>
        They are not organism counts, open-ended mutation, cell-complexity levels, calibrated ecology, spectra or a planetary model. Relative view scales every visible series to its own observed peak, so it compares shapes—not absolute amounts. Visibility, hover and keyboard inspection never rerun or alter the simulation.
      </p>
    </div>
  </details>
</section>

<style>
  .levels-panel { margin-top: 0.8rem; padding: 1.1rem; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
  .eyebrow { color: var(--accent-soft); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
  h2 { margin: 0.18rem 0 0; font-size: 1.1rem; }
  header p { margin: 0.25rem 0 0; color: var(--text-faint); font-size: 0.66rem; }
  .view-switch { display: flex; padding: 3px; background: #0b0d11; border: 1px solid var(--border-soft); border-radius: 7px; }
  .view-switch button { padding: 0.38rem 0.62rem; color: var(--text-muted); background: transparent; border: 0; border-radius: 5px; font-size: 0.65rem; }
  .view-switch button.active { color: white; background: #2a2e38; box-shadow: inset 0 0 0 1px #383d49; }
  .legend { display: flex; flex-wrap: wrap; gap: 0.35rem 0.8rem; margin-top: 0.85rem; padding: 0.58rem 0.7rem; background: #101218; border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
  .legend label { display: inline-flex; align-items: center; gap: 0.32rem; color: var(--text-muted); font-size: 0.65rem; cursor: pointer; }
  .legend label.muted { opacity: 0.5; text-decoration: line-through; }
  .legend input { width: 13px; height: 13px; margin: 0; accent-color: var(--accent); }
  .legend-line { min-width: 1.35rem; color: var(--series); font: 800 0.68rem var(--font-mono); letter-spacing: -0.08em; }
  .chart-layout { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 0.8rem; margin-top: 0.7rem; }
  .chart-shell { position: relative; min-width: 0; overflow: hidden; background: linear-gradient(180deg, rgba(104,224,163,0.025), transparent), #0d0f14; border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
  svg { display: block; width: 100%; height: auto; min-height: 220px; cursor: crosshair; touch-action: pan-y; }
  svg:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .grid-line { stroke: #242832; stroke-width: 1; }
  .axis-value { fill: var(--text-faint); font: 10px var(--font-mono); }
  .series-line { fill: none; stroke-width: 2.2; vector-effect: non-scaling-stroke; }
  .event-marker line { stroke: #6b7180; stroke-width: 1; stroke-dasharray: 2 5; opacity: 0.48; }
  .event-marker rect { fill: #aab0bd; opacity: 0.8; }
  .cursor-line { stroke: white; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .hover-line { stroke: var(--accent); stroke-width: 1; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
  .chart-unit { position: absolute; right: 0.5rem; bottom: 0.3rem; color: var(--text-faint); font: 0.56rem var(--font-mono); }
  .readout { padding: 0.75rem; background: #0e1015; border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
  .readout-time { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.55rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-soft); }
  .readout-time span { color: var(--text-faint); font-size: 0.57rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .readout-time strong { font: 800 0.8rem var(--font-mono); }
  .readout-row { display: grid; grid-template-columns: 18px minmax(0,1fr) auto; align-items: center; gap: 0.35rem; min-height: 25px; color: var(--text-muted); font-size: 0.62rem; }
  .readout-row .symbol { font: 900 0.72rem var(--font-mono); }
  .readout-row strong { color: var(--text); font: 700 0.62rem var(--font-mono); }
  details { margin-top: 0.72rem; padding: 0.65rem 0.75rem; background: rgba(255,255,255,0.018); border: 1px solid var(--border-soft); border-radius: var(--radius-md); }
  summary { color: var(--text-muted); font-size: 0.66rem; font-weight: 800; cursor: pointer; }
  .explanation { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.6rem; }
  .explanation p { margin: 0; color: var(--text-faint); font-size: 0.64rem; line-height: 1.48; }
  @media (max-width: 820px) { .chart-layout { grid-template-columns: 1fr; } .readout { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 0 0.8rem; } .readout-time { grid-column: 1 / -1; } }
  @media (max-width: 620px) { header { flex-direction: column; } .view-switch { width: 100%; } .view-switch button { flex: 1; } .chart-layout { margin-right: -0.45rem; margin-left: -0.45rem; } .readout { grid-template-columns: 1fr; } .explanation { grid-template-columns: 1fr; } }
</style>
