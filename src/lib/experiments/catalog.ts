import type { EvolutionExperiment } from './types';
import { MICROBIAL_SCENARIO_ID, MICROBIAL_SCENARIO_VERSION } from '../core/scenario';
import { DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE } from '../contracts';
import { validateExperimentCatalogue } from './validate';
import { ALIEN_LAKE_DEFAULT_SEED, ALIEN_LAKE_SCENARIO_ID, ALIEN_LAKE_SCENARIO_VERSION } from '../analysis/alienLake';

export const EXPERIMENTS: EvolutionExperiment[] = [
  {
    id: MICROBIAL_SCENARIO_ID,
    version: MICROBIAL_SCENARIO_VERSION,
    title: 'The first microbial flask',
    summary:
      'Tests whether producers, recyclers and grazers can form a legible resource cycle and leave persistent environmental evidence.',
    status: 'reference',
    manifestHash: 'experiment-manifest/v1-e27027da',
    masterSeed: 'fish-and-strawberries',
    environmentProvider: 'scripted-microbial-film@0.4.0',
    providerInput: {
      profileId: DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE.profile.id,
      profileVersion: DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE.profile.version,
      fixtureId: DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE.id,
      fixtureVersion: DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE.version,
      fixtureHash: DEFAULT_EXOBIOLOGY_PROVIDER_FIXTURE.hash
    },
    rulePackIds: ['evolution-lab/base-microbial@0.1.0'],
    tags: ['microbial', 'detritus', 'oxygenation', 'disturbance'],
    questions: [
      'Does detritus become a useful resource before it overwhelms the film?',
      'Does a sustained shadow create a visible bottleneck and recovery?',
      'Can one oxygen flux support both live ecology and a later mineral signature?'
    ],
    lessons: [
      'Death and waste need first-class reservoirs.',
      'The physical environment must be a swappable provider.',
      'Environmental memory belongs to every process, not only civilisations.'
    ],
    checkpoints: [
      { tick: 24, expectedHash: 'evolution-checkpoint-v1-ff2339c6', note: 'Light harvesting becomes viable.' },
      { tick: 126, expectedHash: 'evolution-checkpoint-v1-2ef23db2', note: 'Direct grazing opens the first predator–prey cycle.' },
      { tick: 231, expectedHash: 'evolution-checkpoint-v1-36fcf117', note: 'Verified fork boundary immediately before the long shadow.' },
      { tick: 269, expectedHash: 'evolution-checkpoint-v1-ef2c5832', note: 'Recovery begins after light returns.' }
    ]
  },
  {
    id: ALIEN_LAKE_SCENARIO_ID,
    version: ALIEN_LAKE_SCENARIO_VERSION,
    title: 'Alien Lake',
    summary: 'Tests spectral opportunity, costly response functions, connected liquid habitats, closed material accounting and exact retained-state scale recursion.',
    status: 'draft',
    masterSeed: ALIEN_LAKE_DEFAULT_SEED,
    environmentProvider: 'pinned-sse-beta-spectral-fixture@1',
    rulePackIds: ['evolution-lab/alien-lake-responses@0.1.0'],
    tags: ['exobiology', 'spectrum', 'liquid-habitats', 'scale-recursion', 'accounting'],
    questions: [
      'Does the same response obtain different usable power under a different physical spectrum?',
      'Do different costly responses obtain different usable power from the same spectrum?',
      'Can a stable habitat hide behind a boundary and re-expand to the exact always-detailed result?'
    ],
    lessons: [
      'The provider owns the physical field while evolving populations own their bounded response.',
      'Spectral capture, accessible power, returned power and operating cost must stay separate.',
      'Exact retained-state wrapping proves identity and reversibility, not computational saving.'
    ],
    checkpoints: [
      { tick: 72, note: 'A named-draw daughter response branches from existing biomass.' },
      { tick: 120, note: 'The stable sediment refuge enters an exact retained-state wrapper.' },
      { tick: 168, note: 'A turbidity disturbance triggers exact re-expansion.' }
    ]
  }
];

const catalogueIssues = validateExperimentCatalogue(EXPERIMENTS);
if (catalogueIssues.length) {
  throw new Error('Invalid experiment catalogue:\n' + catalogueIssues.join('\n'));
}
