import type { RuleDefinition, RulePack } from './types';

const rule = (definition: RuleDefinition): RuleDefinition => definition;

export const DEFAULT_RULE_PACK: RulePack = {
  manifest: {
    id: 'evolution-lab/base-microbial',
    name: 'Base Microbial Possibilities',
    version: '0.1.0',
    schemaVersion: 'evolution-rulepack/0.1',
    engineRange: '^0.1.0',
    description: 'Starter facts and mechanisms used by the microbial flask experiments.',
    authors: ['Evolution Lab'],
    dependencies: [],
    seedNamespace: 'base-microbial-v1'
  },
  rules: [
    rule({
      id: 'base/resource/light', version: 1, kind: 'resource', name: 'Accessible light',
      summary: 'Radiant energy available to compatible light-harvesting chemistry.', enabled: true,
      priority: 10, tags: ['energy', 'surface'], requires: [], conditions: [],
      effects: [{ action: 'declare-resource', target: 'resource/light', unit: 'flux-unit' }]
    }),
    rule({
      id: 'base/resource/detritus', version: 1, kind: 'resource', name: 'Detritus pool',
      summary: 'Dead biomass and organic waste available for later transformations.', enabled: true,
      priority: 10, tags: ['matter', 'legacy'], requires: [], conditions: [],
      effects: [{ action: 'declare-resource', target: 'resource/detritus', unit: 'mass-unit' }]
    }),
    rule({
      id: 'base/capability/compartment', version: 1, kind: 'capability', name: 'Persistent compartment',
      summary: 'Maintains a distinct internal chemistry at an ongoing material cost.', enabled: true,
      priority: 20, tags: ['structure'], requires: [],
      conditions: [{ fact: 'environment.mixing', operator: 'exists' }],
      effects: [{ action: 'enable-capability', target: 'capability/compartment' }]
    }),
    rule({
      id: 'base/capability/light-harvesting', version: 1, kind: 'capability', name: 'Light harvesting',
      summary: 'Uses pigment-assisted charge separation to access radiant energy.', enabled: true,
      priority: 30, tags: ['energy', 'pigment'], requires: ['base/capability/compartment', 'base/resource/light'],
      conditions: [{ fact: 'resource.light.accessible', operator: 'gt', value: 18, unit: 'flux-unit' }],
      effects: [{ action: 'enable-capability', target: 'capability/light-harvesting' }],
      vocabulary: { story: 'A lineage learns to drink the light.' }
    }),
    rule({
      id: 'base/capability/detritivory', version: 1, kind: 'capability', name: 'Detritus recycling',
      summary: 'Reclaims carbon and limiting minerals from dead organic matter.', enabled: true,
      priority: 30, tags: ['metabolism', 'recycling'], requires: ['base/capability/compartment', 'base/resource/detritus'],
      conditions: [{ fact: 'resource.detritus.quantity', operator: 'gte', value: 9, unit: 'mass-unit' }],
      effects: [{ action: 'enable-capability', target: 'capability/detritivory' }]
    }),
    rule({
      id: 'base/transformation/oxygenic-production', version: 1, kind: 'transformation', name: 'Oxygenic production',
      summary: 'Fixes carbon using light and emits reactive oxygen as a reusable planetary fact.', enabled: true,
      priority: 40, tags: ['atmosphere', 'metabolism'], requires: ['base/capability/light-harvesting'],
      conditions: [
        { fact: 'resource.carbon.quantity', operator: 'gt', value: 0 },
        { fact: 'resource.minerals.quantity', operator: 'gt', value: 0 }
      ],
      effects: [
        { action: 'consume', target: 'resource/carbon', value: 0.72, unit: 'mass-unit' },
        { action: 'emit', target: 'resource/oxygen', value: 0.82, unit: 'mass-unit' }
      ]
    }),
    rule({
      id: 'base/innovation/direct-grazing', version: 1, kind: 'innovation', name: 'Direct grazing',
      summary: 'Combines motility and recognition to exploit concentrated living biomass.', enabled: true,
      priority: 60, tags: ['first-mover', 'predation'], requires: ['base/capability/compartment'],
      conditions: [{ fact: 'population.producer.biomass', operator: 'gt', value: 34, unit: 'mass-unit' }],
      effects: [{ action: 'open-niche', target: 'niche/direct-grazer' }]
    }),
    rule({
      id: 'base/signature/oxidised-minerals', version: 1, kind: 'signature', name: 'Oxidised mineral record',
      summary: 'Preserves part of a reactive-oxygen episode in mineral chemistry.', enabled: true,
      priority: 70, tags: ['geology', 'evidence'], requires: ['base/transformation/oxygenic-production'],
      conditions: [{ fact: 'resource.oxygen.quantity', operator: 'gt', value: 1 }],
      effects: [{ action: 'accumulate-signature', target: 'signature/oxidised-minerals', unit: 'deposit-unit' }]
    }),
    rule({
      id: 'base/visual/radial-cell', version: 1, kind: 'visual', name: 'Radial cell grammar',
      summary: 'Deterministic visual grammar for simple compartment-bearing lineages.', enabled: true,
      priority: 90, tags: ['2d', '3d', 'morphology'], requires: ['base/capability/compartment'],
      conditions: [{ fact: 'lineage.capability.compartment', operator: 'eq', value: true }],
      effects: [{ action: 'emit-visual-recipe', target: 'visual/radial-cell-v1' }]
    })
  ]
};

export function cloneDefaultRulePack(): RulePack {
  return structuredClone(DEFAULT_RULE_PACK);
}
