<script lang="ts">
  import { validateProviderFixture } from '../contracts';
  import type { CompiledProviderFixture, CurveProviderRequirement, CurveProviderValue, ProviderContractIssue, ProviderFixtureDraft, ProviderRequirementProfile, ScalarProviderRequirement } from '../contracts';
  interface Props {
    profile: ProviderRequirementProfile; fixture: ProviderFixtureDraft;
    compiled: CompiledProviderFixture | null; issues: readonly ProviderContractIssue[];
    activeHash?: string; onchange: (fixture: ProviderFixtureDraft) => void;
    oninject: (fixture: CompiledProviderFixture) => void; onreset: () => void;
    onexport: (fixture: CompiledProviderFixture) => void; onimport: (fixture: ProviderFixtureDraft) => void;
  }
  let { profile, fixture, compiled, issues, activeHash, onchange, oninject, onreset, onexport, onimport }: Props = $props();
  let importError = $state('');
  const groups = $derived([...new Set(profile.requirements.map(({ group }) => group))]);
  function replaceValue(id: string, value: ProviderFixtureDraft['values'][string]) {
    onchange({ ...fixture, values: { ...fixture.values, [id]: JSON.parse(JSON.stringify(value)) } });
  }
  function setScalar(requirement: ScalarProviderRequirement, raw: string) {
    const value = fixture.values[requirement.id];
    if (value?.shape === 'scalar') replaceValue(requirement.id, { ...value, value: Number(raw) });
  }
  function setCurve(requirement: CurveProviderRequirement, presetId: string) {
    const preset = requirement.presets.find(({ id }) => id === presetId);
    if (preset) replaceValue(requirement.id, preset.value);
  }
  function selectedPreset(requirement: CurveProviderRequirement) {
    const value = fixture.values[requirement.id];
    return value?.shape === 'curve'
      ? requirement.presets.find((preset) => preset.value.source.reference === value.source.reference)?.id ?? requirement.defaultPresetId
      : requirement.defaultPresetId;
  }
  function curvePoints(value: CurveProviderValue) {
    const minX = value.x[0], maxX = value.x.at(-1)!, maxY = Math.max(...value.y, 1e-9);
    return value.x.map((x, index) => `${(((x - minX) / (maxX - minX)) * 620).toFixed(2)},${(130 - (value.y[index] / maxY) * 122).toFixed(2)}`).join(' ');
  }
  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0];
    if (!file) return;
    try {
      importError = '';
      const parsed = JSON.parse(await file.text()) as ProviderFixtureDraft;
      const fileIssues = validateProviderFixture(profile, parsed);
      if (fileIssues.length) throw new Error('File rejected: ' + fileIssues[0].path + ' · ' + fileIssues[0].message);
      onimport(parsed);
    }
    catch (error) { importError = error instanceof Error ? error.message : 'This file is not valid JSON.'; }
    finally { input.value = ''; }
  }
  const useLabel = (use: string) => use === 'drives-prototype' ? 'Drives this experiment' : use === 'recorded-only' ? 'Recorded, not yet modelled' : 'Future provider value';
</script>

<section class="harness" aria-labelledby="provider-input-title">
  <header class="hero"><div><span>Reusable data injector · generated from a typed profile</span><h1 id="provider-input-title">{profile.title}</h1><p>{profile.summary}</p></div><aside><small>Input profile</small><strong>{profile.id}@{profile.version}</strong><code>{compiled?.hash ?? 'invalid draft'}</code></aside></header>
  <div class="sources"><div class="now"><small>Available now</small><strong>Lab controls or JSON file</strong><span>Create, validate and push one immutable dataset.</span></div><div><small>Adapter seam</small><strong>SSE / System Lab stream</strong><span>Not connected yet. It must satisfy this same profile.</span></div><div><small>Experiment input</small><strong>{activeHash === compiled?.hash ? 'This dataset is active' : 'Draft is not active'}</strong><span>{activeHash ?? 'The run keeps its previous pinned input.'}</span></div></div>
  <aside class="truth"><strong>What push means here</strong><p>Only controls marked <b>Drives this experiment</b> feed the current microbial equations. Other physical facts are validated, stored and hashed without pretending their mechanisms exist yet.</p></aside>
  {#each groups as group (group)}
    <section class="group"><header><strong>{group}</strong><span>{profile.requirements.filter((item) => item.group === group).length} inputs</span></header><div class="grid">
      {#each profile.requirements.filter((item) => item.group === group) as requirement (requirement.id)}
        {@const value = fixture.values[requirement.id]}
        {#if requirement.shape === 'curve' && value?.shape === 'curve'}
          <article class="curve"><div class="heading"><div><strong>{requirement.label}</strong><small>{requirement.summary}</small></div><em>{useLabel(requirement.use)}</em></div>
            <select aria-label={`${requirement.label} fixture`} value={selectedPreset(requirement)} onchange={(event) => setCurve(requirement, event.currentTarget.value)}>{#each requirement.presets as preset (preset.id)}<option value={preset.id}>{preset.label} · {preset.summary}</option>{/each}</select>
            <svg viewBox="0 0 620 150" role="img" aria-label={`${requirement.label}: ${value.x[0]} to ${value.x.at(-1)} ${value.xUnit}`}><line x1="0" y1="130" x2="620" y2="130"/><polyline points={curvePoints(value)}/><text x="4" y="146">{value.x[0]} {value.xUnit}</text><text x="616" y="146" text-anchor="end">{value.x.at(-1)} {value.xUnit}</text></svg>
            <footer><span>{value.y.length} samples · {value.yUnit}</span><span>{value.source.evidence} · pinned output</span></footer>
          </article>
        {:else if requirement.shape === 'scalar' && value?.shape === 'scalar'}
          <article><div class="heading"><div><strong>{requirement.label}</strong><small>{requirement.summary}</small></div><em class:live={requirement.use === 'drives-prototype'}>{useLabel(requirement.use)}</em></div>
            <div class="control"><input aria-label={`${requirement.label} slider`} type="range" min={requirement.minimum} max={requirement.maximum} step={requirement.step} value={value.value} oninput={(event) => setScalar(requirement, event.currentTarget.value)}/><label><span>{requirement.unit}</span><input aria-label={`${requirement.label} value`} type="number" min={requirement.minimum} max={requirement.maximum} step={requirement.step} value={value.value} oninput={(event) => setScalar(requirement, event.currentTarget.value)}/></label></div>
            <footer><span>{requirement.minimum}–{requirement.maximum} {requirement.unit}</span><span>{value.source.evidence} · {requirement.authority}</span></footer>
          </article>
        {/if}
      {/each}
    </div></section>
  {/each}
  {#if issues.length}<section class="issues"><strong>Dataset cannot be pushed yet</strong>{#each issues as issue}<p><code>{issue.path}</code> · {issue.message}</p>{/each}</section>{/if}
  {#if importError}<p class="issues" role="alert">{importError}</p>{/if}
  <footer class="actions"><div><label>Load JSON<input type="file" accept="application/json,.json" onchange={importFile}/></label><button onclick={onreset}>Reset defaults</button><button disabled={!compiled} onclick={() => compiled && onexport(compiled)}>Download JSON</button></div><button class="push" disabled={!compiled} onclick={() => compiled && oninject(compiled)}>Push dataset into experiment</button></footer>
</section>

<style>
  .harness{display:grid;gap:.8rem}.hero{display:flex;justify-content:space-between;align-items:flex-end;gap:1.4rem;padding:1.1rem;background:linear-gradient(135deg,#151e20,#12141b);border:1px solid var(--border);border-radius:var(--radius-lg)}.hero>div>span{color:#65d6ef;font-size:.6rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}h1{margin:.18rem 0;font-size:1.55rem}.hero p{max-width:720px;margin:.2rem 0 0;color:var(--text-muted);font-size:.74rem}.hero aside{min-width:260px;padding:.6rem;background:#101319;border:1px solid var(--border-soft);border-radius:var(--radius-md)}.hero aside>*{display:block}.hero small,.sources small{color:var(--text-faint);font-size:.52rem;text-transform:uppercase}.hero aside strong{margin:.15rem 0;font-size:.67rem}.hero code{color:#9fcbd5;font:.53rem var(--font-mono);overflow-wrap:anywhere}.sources{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}.sources>div{padding:.7rem;background:#101319;border:1px solid var(--border-soft);border-radius:var(--radius-md)}.sources .now{border-color:#65d6ef80;box-shadow:inset 2px 0 #65d6ef}.sources strong,.sources span{display:block}.sources strong{margin:.14rem 0;font-size:.68rem}.sources span{color:var(--text-faint);font-size:.56rem;overflow-wrap:anywhere}.truth{padding:.68rem .8rem;background:#ffc46b12;border:1px solid #ffc46b40;border-radius:var(--radius-md)}.truth strong{color:#ffe0a8;font-size:.68rem}.truth p{margin:.18rem 0 0;color:var(--text-muted);font-size:.64rem}.group{padding:.8rem;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--radius-lg)}.group>header{display:flex;justify-content:space-between;padding-bottom:.5rem;color:var(--text-faint);font-size:.56rem;text-transform:uppercase}.group>header strong{color:#dfe5ec}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}article{min-width:0;padding:.68rem;background:#101319;border:1px solid var(--border-soft);border-radius:var(--radius-md)}article.curve{grid-column:1/-1}.heading{display:flex;justify-content:space-between;gap:.6rem}.heading strong,.heading small{display:block}.heading strong{font-size:.7rem}.heading small{max-width:580px;margin-top:.13rem;color:var(--text-faint);font-size:.56rem;line-height:1.35}.heading em{flex:0 0 auto;height:fit-content;padding:.18rem .3rem;color:#9fa8b5;background:#1a1e25;border-radius:999px;font:normal .47rem var(--font-mono)}.heading em.live{color:#a8f0c6;background:#68e0a31a}.curve select{width:100%;margin-top:.5rem;padding:.45rem;color:var(--text);background:#0c0e13;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.64rem}.curve svg{width:100%;height:150px;margin-top:.4rem;background:#0b0e12}.curve line{stroke:#303640}.curve polyline{fill:none;stroke:#8ebcff;stroke-width:2}.curve text{fill:#717b89;font:9px var(--font-mono)}.control{display:grid;grid-template-columns:1fr 125px;gap:.5rem;align-items:end;margin-top:.55rem}.control>input{width:100%;accent-color:var(--accent)}.control label{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.3rem;color:var(--text-faint);font-size:.48rem}.control input[type=number]{min-width:0;width:100%;padding:.35rem;color:var(--text);background:#0c0e13;border:1px solid var(--border);border-radius:4px;font:.58rem var(--font-mono)}article footer{display:flex;justify-content:space-between;gap:.5rem;margin-top:.4rem;padding-top:.32rem;color:var(--text-faint);border-top:1px solid #222832;font:.49rem var(--font-mono)}.issues{padding:.7rem;color:#ffc0b8;background:#f07f7314;border:1px solid #f07f7340;border-radius:var(--radius-md)}.issues p{margin:.2rem 0 0;font-size:.56rem}.actions{display:flex;justify-content:space-between;gap:.7rem;padding:.7rem;background:#101319;border:1px solid var(--border-soft);border-radius:var(--radius-lg)}.actions div{display:flex;gap:.35rem}.actions button,.actions label{padding:.52rem .66rem;color:var(--text-muted);background:#191d24;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.61rem;font-weight:700;cursor:pointer}.actions label input{position:absolute;width:1px;height:1px;opacity:0}.actions .push{color:white;background:var(--accent);border-color:var(--accent)}.actions button:disabled{opacity:.38;cursor:not-allowed}@media(max-width:850px){.hero{align-items:stretch;flex-direction:column}.hero aside{min-width:0}.sources,.grid{grid-template-columns:1fr}article.curve{grid-column:auto}.actions{align-items:stretch;flex-direction:column}.actions div{flex-wrap:wrap}.actions .push{width:100%}}
</style>
