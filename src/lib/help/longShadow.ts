import type { PairedBiomassEvaluation } from '../analysis';
import type { HelpAudience, HelpLens, HelpTopic } from './types';

function lens(id: HelpAudience, heading: string, scopeNote: string, paragraphs: string[], terms: HelpLens['terms'], evaluation: PairedBiomassEvaluation): HelpLens {
  return {
    id,
    label: id === 'curious' ? 'Curious' : id === 'biology' ? 'Biology' : 'Engine',
    heading,
    scopeNote,
    paragraphs,
    terms,
    sourceFactIds: [...evaluation.factIds],
    limitationIds: [...evaluation.limitationIds]
  };
}

export function createLongShadowHelpTopic(evaluation: PairedBiomassEvaluation): HelpTopic {
  const metrics = evaluation.metrics;
  const recoveryText = metrics.recoveryTick === null ? 'did not return close enough to the comparison before the stored run ended' : `returned close to the comparison by day ${metrics.recoveryTick}`;
  return {
    id: 'help/biology/long-shadow-comparison',
    version: '0.1.0',
    title: 'How to read the long-shadow result',
    intro: 'Read the lenses in order to build from the intuitive idea to the biological and technical details. All three explain the same stored result.',
    lenses: {
      curious: lens('curious', 'Start with the question, not the metric', 'No biology or computer-science knowledge is assumed here.', [
        'We run the same tiny world twice. One version receives a long period of weak light; the other does not. Everything else we can currently hold fixed stays the same.',
        `The weakest point retained ${metrics.lowestRetentionPercent}% of the total living material seen in the no-shadow version. It ${recoveryText}.`,
        'This does not tell us what real alien life would do. It tells us whether the rules in this particular toy world produce a believable chain of strain and recovery.'
      ], [
        { term: 'Comparison run', meaning: 'The same setup without the one change we want to understand.' },
        { term: 'Recovery', meaning: 'Staying close to the comparison for long enough that a one-day bounce does not count.' }
      ], evaluation),
      biology: lens('biology', 'Interpret the aggregate ecology', 'Claim level: plausibly close, conceptually defensible causal ecology at population-aggregate resolution - not calibrated rates, species dynamics or an empirical reconstruction.', [
        'The perturbation reduces the externally supplied light gradient. Producer growth changes first; grazers then experience prey limitation, while detrital pools and recyclers provide a partial buffer.',
        `The current persistence result retains ${metrics.lineagesStillPresent} of ${metrics.comparedLineages} authored guilds, but the engine uses prototype biomass floors. Presence is therefore weaker evidence than a mechanistic extinction/recolonisation model would provide.`,
        'The scientifically useful challenge is whether the dependencies, signs of the feedbacks, resource bottlenecks and missing mechanisms are defensible. Exact parameter values are not claimed.'
      ], [
        { term: 'Guild', meaning: 'An aggregate population grouped by ecological function rather than a resolved species.' },
        { term: 'Perturbation', meaning: 'A declared change to an input; here, reduced incident light.' },
        { term: 'Buffer', meaning: 'Stored material or a process that reduces the immediate effect of lost input.' }
      ], evaluation),
      engine: lens('engine', 'Inspect how the comparison is made', 'Claim level: deterministic prototype mechanics and transparent projections - not a completed checkpoint/fork engine, full conservation system or calibrated Fitness Vector.', [
        'The app performs two full deterministic reruns with the same master seed, scenario and scripted provider. The only declared config difference moves the long-shadow interval beyond the run in the comparison.',
        `Recovery is an authored projection: at least ${evaluation.comparison.recoveryThresholdPercent}% of same-time control biomass for ${evaluation.comparison.recoverySustainDays} consecutive days. The changed run is compared with the control at each day, never with its own pre-shock snapshot.`,
        'Repeatability, finite values and non-negative stored stocks are checked now. Complete conservation, accounting debt, content-addressed checkpoint forks, order-independent counter draws and the wider Fitness Vector remain unimplemented and are reported as such.'
      ], [
        { term: 'Same-time control', meaning: 'A comparison snapshot from the same simulated day, not a snapshot from before the change.' },
        { term: 'Fitness Vector', meaning: 'The planned set of separate validity, persistence, resilience, sensitivity and cost measures; not one magic score.' },
        { term: 'Projection', meaning: 'A read-only interpretation calculated from stored run facts.' }
      ], evaluation)
    },
    diagram: {
      kind: 'paired-rerun', label: 'Schematic comparison method', shared: 'Same seed, starting state, rules and provider',
      changed: `Long shadow: light reduced on days ${evaluation.comparison.startTick}-${evaluation.comparison.endTick}`, comparison: 'No long shadow: seasonal light continues'
    },
    conceptDemo: {
      id: 'concept/light-support-chain',
      title: 'Try the idea: usable light',
      summary: 'Move one slider to see the direction of one simple relationship before returning to the full simulation.',
      disclaimer: 'Illustrative concept only. This does not run the engine, use the seed or predict biomass.',
      slider: { label: 'Usable light', minimum: 0, maximum: 100, step: 5, initialValue: 30, unit: '%' },
      outputs: [
        { id: 'producer-opportunity', label: 'Producer opportunity', relation: 'direct', lowText: 'little light-driven input', highText: 'stronger light-driven input' },
        { id: 'dependent-pressure', label: 'Pressure on dependants', relation: 'inverse', lowText: 'less pressure from light loss', highText: 'more pressure from light loss' }
      ]
    }
  };
}
