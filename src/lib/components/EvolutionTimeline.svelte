<script lang="ts">
  import type { SimulationEvent } from '../core/types';

  interface Props {
    value: number;
    max: number;
    events: SimulationEvent[];
    playing: boolean;
    onchange: (value: number) => void;
    ontoggleplay: () => void;
  }

  let { value, max, events, playing, onchange, ontoggleplay }: Props = $props();

  const markerColor: Record<SimulationEvent['kind'], string> = {
    origin: '#b7c7d9',
    innovation: '#68e0a3',
    environment: '#ffb35f',
    ecology: '#74bfff',
    legacy: '#9e82da'
  };
</script>

<section class="timeline" aria-label="Evolution timeline">
  <button class="play" onclick={ontoggleplay} aria-label={playing ? 'Pause timeline' : 'Play timeline'}>
    {playing ? 'Ⅱ' : '▶'}
  </button>
  <div class="timeline-body">
    <div class="labels"><span>Seed</span><strong>Day {value}</strong><span>Recovery</span></div>
    <div class="range-wrap">
      <input
        type="range"
        min="0"
        {max}
        step="1"
        {value}
        aria-label="Selected simulation day"
        oninput={(event) => onchange(Number(event.currentTarget.value))}
      />
      <div class="event-track">
        {#each events as event (event.id)}
          <button
            class="event-marker"
            style={`left:${(event.tick / max) * 100}%; --marker:${markerColor[event.kind]}`}
            title={`${event.title} — day ${event.tick}`}
            aria-label={`Go to ${event.title}, day ${event.tick}`}
            onclick={() => onchange(event.tick)}
          ></button>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .timeline { display: flex; align-items: center; gap: 0.9rem; padding: 0.85rem 1rem 1rem; background: rgba(15,17,23,0.94); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: 0 14px 40px rgba(0,0,0,0.24); }
  .play { width: 38px; height: 38px; flex: 0 0 38px; padding: 0; background: var(--accent); border: 0; border-radius: 50%; color: white; font-size: 0.85rem; }
  .play:hover { background: var(--accent-hover); }
  .timeline-body { min-width: 0; flex: 1; }
  .labels { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin-bottom: 0.42rem; color: var(--text-faint); font-size: 0.63rem; text-transform: uppercase; letter-spacing: 0.1em; }
  .labels strong { color: var(--text); font: 700 0.76rem var(--font-mono); }
  .labels span:last-child { text-align: right; }
  .range-wrap { position: relative; }
  input[type='range'] { position: relative; z-index: 2; width: 100%; height: 5px; margin: 0; appearance: none; background: linear-gradient(90deg, #344039, #40322e); border-radius: 10px; cursor: pointer; }
  input[type='range']::-webkit-slider-thumb { width: 16px; height: 16px; appearance: none; background: #fff; border: 3px solid var(--accent); border-radius: 50%; box-shadow: 0 0 16px rgba(255,90,31,0.55); }
  input[type='range']::-moz-range-thumb { width: 12px; height: 12px; background: #fff; border: 3px solid var(--accent); border-radius: 50%; }
  .event-track { position: absolute; inset: 0 6px; pointer-events: none; }
  .event-marker { position: absolute; top: -3px; z-index: 3; width: 10px; height: 10px; padding: 0; transform: translateX(-50%) rotate(45deg); pointer-events: auto; background: var(--marker); border: 2px solid #101218; border-radius: 2px; box-shadow: 0 0 8px color-mix(in srgb, var(--marker) 50%, transparent); }
</style>
