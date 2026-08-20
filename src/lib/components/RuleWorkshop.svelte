<script lang="ts">
  import RuleEditor from './RuleEditor.svelte';
  import { tryCompileRulePack, validateRulePack } from '../rules';
  import type { RuleDefinition, RuleKind, RulePack } from '../rules';

  interface Props {
    pack: RulePack;
    onchange: (pack: RulePack) => void;
    onexport: (pack: RulePack) => void;
  }

  let { pack, onchange, onexport }: Props = $props();
  let search = $state('');
  let kind = $state<'all' | RuleKind>('all');
  let selectedId = $state('');
  let page = $state(0);
  const pageSize = 24;

  const issues = $derived(validateRulePack(pack));
  const compiled = $derived(tryCompileRulePack(pack));
  const kinds = $derived(
    [...new Set(pack.rules.map((rule) => rule.kind))].sort() as RuleKind[]
  );
  const filtered = $derived(
    pack.rules.filter((rule) => {
      const query = search.trim().toLowerCase();
      const matchesKind = kind === 'all' || rule.kind === kind;
      const matchesSearch =
        !query ||
        rule.name.toLowerCase().includes(query) ||
        rule.id.toLowerCase().includes(query) ||
        rule.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesKind && matchesSearch;
    })
  );
  const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
  const pageRules = $derived(filtered.slice(page * pageSize, page * pageSize + pageSize));
  const selectedRule = $derived(
    pack.rules.find((rule) => rule.id === selectedId) ?? pageRules[0] ?? pack.rules[0]
  );

  function replaceRule(updated: RuleDefinition) {
    const previousId = selectedRule?.id ?? selectedId;
    onchange({
      ...pack,
      rules: pack.rules.map((rule) => (rule.id === previousId ? updated : rule))
    });
    selectedId = updated.id;
  }

  function uniqueId(base: string) {
    const ids = new Set(pack.rules.map((rule) => rule.id));
    let suffix = 1;
    let candidate = base;
    while (ids.has(candidate)) candidate = `${base}-${suffix++}`;
    return candidate;
  }

  function addRule() {
    const id = uniqueId('user/capability/new-rule');
    const next: RuleDefinition = {
      id, version: 1, kind: 'capability', name: 'New capability', summary: '', enabled: true,
      priority: 50, tags: ['draft'], requires: [], conditions: [], effects: []
    };
    onchange({ ...pack, rules: [...pack.rules, next] });
    selectedId = id;
    search = '';
    kind = 'all';
    page = Math.floor(pack.rules.length / pageSize);
  }

  function duplicateSelected() {
    if (!selectedRule) return;
    const id = uniqueId(`${selectedRule.id}-copy`);
    const duplicate = { ...structuredClone(selectedRule), id, name: `${selectedRule.name} copy`, version: 1 };
    onchange({ ...pack, rules: [...pack.rules, duplicate] });
    selectedId = id;
    search = '';
    kind = 'all';
    page = Math.floor(pack.rules.length / pageSize);
  }

  function updateSearch(value: string) {
    search = value;
    page = 0;
  }

  function updateKind(value: 'all' | RuleKind) {
    kind = value;
    page = 0;
  }
</script>

<section class="workshop-shell">
  <header class="workshop-header">
    <div>
      <span class="overline">Reusable authoring surface</span>
      <h1>Rule Workshop</h1>
      <p>Build declarative life possibilities without teaching the runtime about this interface—or SSE.</p>
    </div>
    <div class="pack-actions">
      <div><span>Pack</span><strong>{pack.manifest.name}</strong><small>{pack.manifest.version} · {compiled?.checksum ?? 'invalid draft'}</small></div>
      <button class="primary" onclick={() => onexport(pack)}>Export modpack</button>
    </div>
  </header>

  <div class="pack-health">
    <div><span>Rules</span><strong>{pack.rules.length}</strong></div>
    <div><span>Enabled</span><strong>{pack.rules.filter((rule) => rule.enabled).length}</strong></div>
    <div><span>Errors</span><strong class:error={issues.some((issue) => issue.severity === 'error')}>{issues.filter((issue) => issue.severity === 'error').length}</strong></div>
    <div><span>Warnings</span><strong>{issues.filter((issue) => issue.severity === 'warning').length}</strong></div>
    <p>Runtime receives the compiled immutable pack; drafts and editor state stay here.</p>
  </div>

  <div class="workshop-grid">
    <aside class="library">
      <div class="library-title"><div><span class="overline">Pack library</span><h2>{filtered.length} matching rules</h2></div><button onclick={addRule}>+ New</button></div>
      <input class="search" aria-label="Search rules" placeholder="Search IDs, names or tags…" value={search} oninput={(event) => updateSearch(event.currentTarget.value)} />
      <select class="kind-filter" aria-label="Filter rule kind" value={kind} onchange={(event) => updateKind(event.currentTarget.value as 'all' | RuleKind)}>
        <option value="all">All rule kinds</option>
        {#each kinds as option}<option value={option}>{option}</option>{/each}
      </select>

      <div class="rule-list">
        {#each pageRules as rule (rule.id)}
          <button class:selected={selectedRule?.id === rule.id} class="rule-card" onclick={() => (selectedId = rule.id)}>
            <span class={`kind-dot ${rule.kind}`}></span>
            <span><strong>{rule.name}</strong><small>{rule.id}</small></span>
            <span class:off={!rule.enabled} class="state">{rule.enabled ? rule.kind : 'off'}</span>
          </button>
        {:else}
          <p class="no-results">Nothing matches this filter.</p>
        {/each}
      </div>

      <div class="pagination">
        <button disabled={page === 0} onclick={() => (page -= 1)}>←</button>
        <span>Page {Math.min(page + 1, pageCount)} / {pageCount}</span>
        <button disabled={page >= pageCount - 1} onclick={() => (page += 1)}>→</button>
      </div>
    </aside>

    {#if selectedRule}
      <RuleEditor
        rule={selectedRule}
        issues={issues.filter((issue) => issue.ruleId === selectedRule.id)}
        onchange={replaceRule}
        onduplicate={duplicateSelected}
      />
    {/if}
  </div>
</section>

<style>
  .workshop-shell { display: grid; gap: 0.8rem; }
  .workshop-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; padding: 1.2rem; background: linear-gradient(135deg, rgba(25,31,29,0.96), rgba(19,20,26,0.96)); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .overline { color: #72d6a0; font-size: 0.63rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; }
  h1 { margin: 0.15rem 0; font-size: 1.7rem; }
  h2 { margin: 0.14rem 0 0; font-size: 0.95rem; }
  .workshop-header p { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.78rem; }
  .pack-actions { display: flex; align-items: center; gap: 0.8rem; }
  .pack-actions div { min-width: 210px; }
  .pack-actions span, .pack-actions strong, .pack-actions small { display: block; }
  .pack-actions span { color: var(--text-faint); font-size: 0.57rem; text-transform: uppercase; }
  .pack-actions strong { margin-top: 0.18rem; font-size: 0.78rem; }
  .pack-actions small { margin-top: 0.14rem; color: var(--text-faint); font: 0.58rem var(--font-mono); }
  .primary { padding: 0.62rem 0.85rem; color: white; background: var(--accent); border-color: var(--accent); border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 750; }
  .pack-health { display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 0.9rem; background: #101218; border: 1px solid var(--border-soft); border-radius: var(--radius-lg); }
  .pack-health div { min-width: 74px; padding-right: 0.7rem; border-right: 1px solid var(--border-soft); }
  .pack-health span, .pack-health strong { display: block; }
  .pack-health span { color: var(--text-faint); font-size: 0.54rem; text-transform: uppercase; }
  .pack-health strong { margin-top: 0.16rem; font: 0.82rem var(--font-mono); }
  .pack-health strong.error { color: #f07f73; }
  .pack-health p { margin: 0 0 0 auto; color: var(--text-faint); font-size: 0.65rem; }
  .workshop-grid { display: grid; grid-template-columns: minmax(270px, 0.62fr) minmax(0, 1.7fr); gap: 0.8rem; align-items: start; }
  .library { position: sticky; top: 0.5rem; padding: 0.9rem; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .library-title { display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; }
  .library-title button { padding: 0.4rem 0.55rem; border-radius: var(--radius-sm); font-size: 0.66rem; }
  .search, .kind-filter { width: 100%; margin-top: 0.55rem; padding: 0.53rem 0.58rem; color: var(--text); background: #0e1015; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.7rem; }
  .rule-list { display: grid; gap: 0.3rem; max-height: 650px; margin-top: 0.6rem; overflow-y: auto; }
  .rule-card { display: grid; grid-template-columns: 7px minmax(0,1fr) auto; align-items: center; gap: 0.55rem; width: 100%; padding: 0.58rem; text-align: left; background: #101218; border-color: transparent; border-radius: var(--radius-sm); }
  .rule-card:hover, .rule-card.selected { background: #20232b; border-color: #3b404c; }
  .rule-card.selected { box-shadow: inset 2px 0 0 #68e0a3; }
  .rule-card strong, .rule-card small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rule-card strong { font-size: 0.7rem; }
  .rule-card small { margin-top: 0.13rem; color: var(--text-faint); font: 0.56rem var(--font-mono); }
  .kind-dot { width: 6px; height: 24px; background: #a7b8ca; border-radius: 6px; }
  .kind-dot.capability { background: #68e0a3; }
  .kind-dot.transformation { background: #74bfff; }
  .kind-dot.innovation { background: #f07f73; }
  .kind-dot.signature { background: #9e82da; }
  .kind-dot.visual { background: #ffbf68; }
  .state { color: var(--text-faint); font-size: 0.53rem; text-transform: uppercase; }
  .state.off { color: #f07f73; }
  .pagination { display: flex; justify-content: center; align-items: center; gap: 0.7rem; margin-top: 0.65rem; color: var(--text-faint); font: 0.6rem var(--font-mono); }
  .pagination button { width: 28px; height: 25px; padding: 0; border-radius: var(--radius-sm); }
  .pagination button:disabled { opacity: 0.3; cursor: default; }
  .no-results { color: var(--text-faint); font-size: 0.7rem; }

  @media (max-width: 900px) {
    .workshop-header { align-items: stretch; flex-direction: column; }
    .pack-actions { justify-content: space-between; }
    .pack-health { overflow-x: auto; }
    .pack-health p { display: none; }
    .workshop-grid { grid-template-columns: 1fr; }
    .library { position: static; }
    .rule-list { max-height: 320px; }
  }
</style>
