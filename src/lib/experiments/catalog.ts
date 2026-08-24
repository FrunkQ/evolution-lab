import type { EvolutionExperiment } from './types';
import { MICROBIAL_SCENARIO_ID, MICROBIAL_SCENARIO_VERSION } from '../core/scenario';

export const EXPERIMENTS: EvolutionExperiment[] = [
  {
    id: MICROBIAL_SCENARIO_ID,
    version: MICROBIAL_SCENARIO_VERSION,
    title: 'The first microbial flask',
    summary:
      'Tests whether producers, recyclers and grazers can form a legible resource cycle and leave persistent environmental evidence.',
    status: 'draft',
    masterSeed: 'fish-and-strawberries',
    environmentProvider: 'scripted-microbial-film@0.1.0',
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
      { tick: 24, note: 'Light harvesting becomes viable.' },
      { tick: 126, note: 'Direct grazing opens the first predator–prey cycle.' },
      { tick: 232, note: 'The long shadow begins.' },
      { tick: 269, note: 'Recovery begins after light returns.' }
    ]
  }
];
