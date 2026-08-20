<script lang="ts">
  import type {
    RuleCondition,
    RuleDefinition,
    RuleEffect,
    RuleKind,
    RuleOperator,
    RuleValidationIssue
  } from '../rules';

  interface Props {
    rule: RuleDefinition;
    issues: RuleValidationIssue[];
    onchange: (rule: RuleDefinition) => void;
    onduplicate: () => void;
  }

  let { rule, issues, onchange, onduplicate }: Props = $props();

  const kinds: RuleKind[] = [
    'resource', 'gradient', 'capability', 'transformation', 'innovation', 'signature', 'visual'
  ];
  const operators: RuleOperator[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists'];

  const update = (change: Partial<RuleDefinition>) => onchange({ ...rule, ...change });

  function updateCondition(index: number, change: Partial<RuleCondition>) {
    const conditions = rule.conditions.map((condition, current) =>
      current === index ? { ...condition, ...change } : condition
    );
    update({ conditions });
  }

  function updateEffect(index: number, change: Partial<RuleEffect>) {
    const effects = rule.effects.map((effect, current) =>
      current === index ? { ...effect, ...change } : effect
    );
    update({ effects });
  }

  const asValue = (value: string): string | number | boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
    return value;
  };
</script>

<section class="editor" aria-label={`Edit ${rule.name}`}>
  <header>
    <div><span class="eyebrow">Rule definition</span><h2>{rule.name || 'Untitled rule'}</h2></div>
    <div class="header-actions">
      <label class="enabled"><input type="checkbox" checked={rule.enabled} onchange={(event) => update({ enabled: event.currentTarget.checked })} /> Enabled</label>
      <button onclick={onduplicate}>Duplicate</button>
    </div>
  </header>

  {#if issues.length > 0}
    <div class="issues">
      {#each issues as issue (`${issue.code}-${issue.message}`)}
        <p class:error={issue.severity === 'error'}><strong>{issue.code}</strong> {issue.message}</p>
      {/each}
    </div>
  {/if}

  <div class="form-grid">
    <label class="wide"><span>Stable namespaced ID</span><input value={rule.id} oninput={(event) => update({ id: event.currentTarget.value })} /></label>
    <label><span>Kind</span><select value={rule.kind} onchange={(event) => update({ kind: event.currentTarget.value as RuleKind })}>{#each kinds as kind}<option value={kind}>{kind}</option>{/each}</select></label>
    <label><span>Priority</span><input type="number" step="1" value={rule.priority} oninput={(event) => update({ priority: Number(event.currentTarget.value) })} /></label>
    <label class="wide"><span>Name</span><input value={rule.name} oninput={(event) => update({ name: event.currentTarget.value })} /></label>
    <label class="wide"><span>Summary</span><textarea rows="3" value={rule.summary} oninput={(event) => update({ summary: event.currentTarget.value })}></textarea></label>
    <label class="wide"><span>Tags — comma separated</span><input value={rule.tags.join(', ')} oninput={(event) => update({ tags: event.currentTarget.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></label>
    <label class="wide"><span>Required rule IDs — comma separated</span><input value={rule.requires.join(', ')} oninput={(event) => update({ requires: event.currentTarget.value.split(',').map((id) => id.trim()).filter(Boolean) })} /></label>
  </div>

  <section class="rule-block">
    <div class="block-title"><div><span class="eyebrow">Conditions</span><h3>When is this a candidate?</h3></div><button onclick={() => update({ conditions: [...rule.conditions, { fact: '', operator: 'exists' }] })}>+ Condition</button></div>
    <div class="rows">
      {#each rule.conditions as condition, index (`condition-${index}`)}
        <div class="condition-row">
          <input aria-label={`Condition ${index + 1} fact`} placeholder="environment.fact.path" value={condition.fact} oninput={(event) => updateCondition(index, { fact: event.currentTarget.value })} />
          <select aria-label={`Condition ${index + 1} operator`} value={condition.operator} onchange={(event) => updateCondition(index, { operator: event.currentTarget.value as RuleOperator })}>{#each operators as operator}<option value={operator}>{operator}</option>{/each}</select>
          <input aria-label={`Condition ${index + 1} value`} placeholder="value" disabled={condition.operator === 'exists'} value={condition.value === undefined ? '' : String(condition.value)} oninput={(event) => updateCondition(index, { value: asValue(event.currentTarget.value) })} />
          <input aria-label={`Condition ${index + 1} unit`} placeholder="unit" value={condition.unit ?? ''} oninput={(event) => updateCondition(index, { unit: event.currentTarget.value || undefined })} />
          <button class="remove" aria-label={`Remove condition ${index + 1}`} onclick={() => update({ conditions: rule.conditions.filter((_, current) => current !== index) })}>×</button>
        </div>
      {:else}
        <p class="empty">Always eligible; no conditions declared.</p>
      {/each}
    </div>
  </section>

  <section class="rule-block">
    <div class="block-title"><div><span class="eyebrow">Effects</span><h3>What reusable facts change?</h3></div><button onclick={() => update({ effects: [...rule.effects, { action: '', target: '' }] })}>+ Effect</button></div>
    <div class="rows">
      {#each rule.effects as effect, index (`effect-${index}`)}
        <div class="effect-row">
          <input aria-label={`Effect ${index + 1} action`} placeholder="action" value={effect.action} oninput={(event) => updateEffect(index, { action: event.currentTarget.value })} />
          <input aria-label={`Effect ${index + 1} target`} placeholder="resource/target" value={effect.target} oninput={(event) => updateEffect(index, { target: event.currentTarget.value })} />
          <input aria-label={`Effect ${index + 1} value`} placeholder="value" value={effect.value === undefined ? '' : String(effect.value)} oninput={(event) => updateEffect(index, { value: asValue(event.currentTarget.value) })} />
          <input aria-label={`Effect ${index + 1} unit`} placeholder="unit" value={effect.unit ?? ''} oninput={(event) => updateEffect(index, { unit: event.currentTarget.value || undefined })} />
          <button class="remove" aria-label={`Remove effect ${index + 1}`} onclick={() => update({ effects: rule.effects.filter((_, current) => current !== index) })}>×</button>
        </div>
      {:else}
        <p class="empty">No effect declared yet.</p>
      {/each}
    </div>
  </section>
</section>

<style>
  .editor { min-width: 0; padding: 1.15rem; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  header, .block-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  h2 { margin: 0.15rem 0 0; font-size: 1.28rem; }
  h3 { margin: 0.15rem 0 0; font-size: 0.9rem; }
  .eyebrow { color: var(--accent-soft); font-size: 0.61rem; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; }
  .header-actions { display: flex; align-items: center; gap: 0.5rem; }
  .header-actions button, .block-title button { padding: 0.45rem 0.62rem; border-radius: var(--radius-sm); font-size: 0.68rem; }
  .enabled { display: flex; align-items: center; gap: 0.35rem; color: var(--text-muted); font-size: 0.7rem; }
  .enabled input { accent-color: #68e0a3; }
  .issues { display: grid; gap: 0.3rem; margin-top: 0.8rem; }
  .issues p { margin: 0; padding: 0.45rem 0.6rem; color: #ffd18f; background: rgba(255,179,95,0.08); border-left: 2px solid #ffb35f; font-size: 0.68rem; }
  .issues p.error { color: #ffaea3; background: rgba(240,127,115,0.08); border-color: #f07f73; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; margin-top: 1rem; }
  label span { display: block; margin-bottom: 0.28rem; color: var(--text-faint); font-size: 0.58rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .wide { grid-column: 1 / -1; }
  input:not([type='checkbox']), select, textarea { width: 100%; padding: 0.55rem 0.6rem; color: var(--text); background: #0e1015; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.72rem; }
  textarea { resize: vertical; line-height: 1.45; }
  input:disabled { color: var(--text-faint); opacity: 0.55; }
  .rule-block { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-soft); }
  .rows { display: grid; gap: 0.42rem; margin-top: 0.65rem; }
  .condition-row, .effect-row { display: grid; grid-template-columns: minmax(180px, 1.4fr) minmax(80px, 0.55fr) minmax(85px, 0.6fr) minmax(75px, 0.5fr) 32px; gap: 0.38rem; }
  .remove { padding: 0; color: #f6a398; background: transparent; border-color: transparent; border-radius: var(--radius-sm); font-size: 1rem; }
  .remove:hover { background: rgba(240,127,115,0.1); border-color: rgba(240,127,115,0.25); }
  .empty { margin: 0; color: var(--text-faint); font-size: 0.7rem; }

  @media (max-width: 720px) {
    header, .block-title { align-items: stretch; flex-direction: column; }
    .form-grid { grid-template-columns: 1fr; }
    .wide { grid-column: auto; }
    .condition-row, .effect-row { grid-template-columns: 1fr 0.55fr; padding: 0.6rem; background: #101218; border-radius: var(--radius-md); }
    .condition-row input:first-child, .effect-row input:nth-child(2) { grid-column: 1 / -1; }
  }
</style>
