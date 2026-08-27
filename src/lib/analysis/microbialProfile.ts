import { compileEvaluationProfile, thresholdValue } from '../evaluation';

export const MICROBIAL_SHADOW_PROFILE = compileEvaluationProfile({
  id: 'biology/microbial-long-shadow',
  version: '0.2.0',
  title: 'Microbial long-shadow response',
  comparisonKind: 'checkpoint-control-shadow',
  thresholds: [
    { id: 'survival-retention', label: 'Survival floor', value: 0.1, unit: 'ratio', description: 'Lowest active biomass retained versus same-time control.' },
    { id: 'recovery-retention', label: 'Recovery floor', value: 0.9, unit: 'ratio', description: 'Active biomass retained versus same-time control during recovery.' },
    { id: 'recovery-sustain-days', label: 'Sustained recovery', value: 14, unit: 'days', description: 'Consecutive days at or above the recovery floor.' },
    { id: 'runaway-window-days', label: 'Runaway window', value: 30, unit: 'days', description: 'Tail window inspected for unsupported growth.' },
    { id: 'runaway-growth-factor', label: 'Runaway multiplier', value: 2.2, unit: 'ratio', description: 'Total growth across the runaway window.' },
    { id: 'runaway-daily-growth', label: 'Runaway daily growth', value: 0.025, unit: 'ratio/day', description: 'Minimum daily growth throughout the runaway window.' },
    { id: 'stored-difference-epsilon', label: 'Stored difference', value: 0.01, unit: 'stored units', description: 'Smallest stored difference called out in the explanation.' }
  ],
  gates: [
    { id: 'checkpoint-integrity', version: '1', scope: 'universal', question: 'Does the shared checkpoint match its content hash?', summary: 'The saved prefix, exact state, manifest and history are checked before either future resumes.', availability: 'implemented' },
    { id: 'fork-prefix', version: '1', scope: 'universal', question: 'Are both histories identical before the change?', summary: 'Both branches copy the same checkpoint prefix and activate on the next stored day.', availability: 'implemented' },
    { id: 'branch-isolation', version: '1', scope: 'universal', question: 'Did we alter only the declared shadow input?', summary: 'Seed, provider and pre-fork state stay pinned; only declared light-reduction fields differ.', availability: 'implemented' },
    { id: 'resume-equivalence', version: '1', scope: 'universal', question: 'Does resume reproduce the uninterrupted history?', summary: 'Checkpoint resume must not alter the ordinary shadow outcome.', availability: 'implemented' },
    { id: 'finite-state', version: '1', scope: 'universal', question: 'Did every stored number remain usable?', summary: 'All stored resources, populations, flows and signatures must remain finite.', availability: 'implemented' },
    { id: 'non-negative-stocks', version: '1', scope: 'profile', question: 'Did any stored stock go below zero?', summary: 'For this profile, resource stocks, biomass, signatures and recorded flows may not be negative.', availability: 'implemented' },
    { id: 'repeatability', version: '1', scope: 'universal', question: 'Did the same checkpoint fork repeat exactly?', summary: 'The complete shadow branch is compared with an immediate repeat.', availability: 'implemented' },
    { id: 'unsupported-growth', version: '1', scope: 'profile', question: 'Did either future enter unsupported runaway growth?', summary: 'Rejects a sustained tail that grows above the authored daily and total limits.', availability: 'implemented' },
    { id: 'matter-balance', version: '2', scope: 'profile', question: 'Can we account for all tracked material across the boundary?', summary: 'Every stored model-mass interval must close exactly through internal postings and explicit provider imports or exports.', availability: 'implemented' },
    { id: 'accounting-debt', version: '2', scope: 'profile', question: 'Did any floor, cap or numerical repair create hidden stock?', summary: 'Any post-hoc stock adjustment or unresolved centi-unit residual is hard-gated debt.', availability: 'implemented' }
  ],
  metricIds: ['lowest-retention', 'recovery-time', 'integrated-biomass-loss', 'post-return-volatility', 'peak-stress', 'productive-flux-retention', 'retained-functions'],
  questionIds: ['survival', 'recovery', 'change', 'fragility', 'function'],
  limitationIds: ['model-mass-not-si-chemistry', 'no-energy-conversion-ledger', 'provider-physical-conservation-external', 'predefined-lineages']
});

export const microbialThreshold = (id: string): number => thresholdValue(MICROBIAL_SHADOW_PROFILE, id);
