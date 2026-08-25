import type { EvolutionExperiment } from './types';
import { MICROBIAL_SCENARIO_ID, MICROBIAL_SCENARIO_VERSION } from '../core/scenario';
import { validateExperimentCatalogue } from './validate';

export const EXPERIMENTS: EvolutionExperiment[] = [
  {
    id: MICROBIAL_SCENARIO_ID,
    version: MICROBIAL_SCENARIO_VERSION,
    title: 'The first microbial flask',
    summary:
      'Tests whether producers, recyclers and grazers can form a legible resource cycle and leave persistent environmental evidence.',
    status: 'reference',
    manifestHash: 'experiment-manifest/v1-610cd8f1',
    masterSeed: 'fish-and-strawberries',
    environmentProvider: 'scripted-microbial-film@0.2.0',
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
      { tick: 24, expectedHash: 'evolution-checkpoint-v1-54e3a608', note: 'Light harvesting becomes viable.' },
      { tick: 126, expectedHash: 'evolution-checkpoint-v1-05f96f67', note: 'Direct grazing opens the first predator–prey cycle.' },
      { tick: 231, expectedHash: 'evolution-checkpoint-v1-8fe3ac59', note: 'Verified fork boundary immediately before the long shadow.' },
      { tick: 269, expectedHash: 'evolution-checkpoint-v1-dc713711', note: 'Recovery begins after light returns.' }
    ]
  }
];

const catalogueIssues = validateExperimentCatalogue(EXPERIMENTS);
if (catalogueIssues.length) {
  throw new Error('Invalid experiment catalogue:\n' + catalogueIssues.join('\n'));
}