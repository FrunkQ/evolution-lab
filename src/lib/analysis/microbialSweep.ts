import { stableChecksum, DEFAULT_CONFIG } from '../core';
import type { SimulationConfig } from '../core';
import type { EvaluationFamily } from '../evaluation';
import { MICROBIAL_SHADOW_PROFILE } from './microbialProfile';
import { createMicrobialShadowEvaluation } from './pairedBiomass';

export interface MicrobialShadowParameters {
  retainedLightFraction: number;
  durationDays: number;
}

export interface MicrobialShadowOutcome {
  status: 'recovered' | 'survived' | 'collapsed' | 'invalid';
  valid: boolean;
  lowestBiomassRetentionPercent: number;
  lowestProductiveFluxRetentionPercent: number;
  peakStressPercent: number;
  recoveryDaysAfterLightReturns: number | null;
  retainedFunctionPercent: number;
  endDifferencePercent: number;
}

export type MicrobialShadowResponseFamily = EvaluationFamily<MicrobialShadowParameters, MicrobialShadowOutcome> & {
  parentCheckpointHash: string;
  referenceCaseId: string;
};

export const MICROBIAL_SHADOW_LIGHT_LEVELS = [0.5, 0.3, 0.1] as const;
export const MICROBIAL_SHADOW_DURATIONS = [14, 37, 90] as const;

function caseConfig(
  retainedLightFraction: number,
  durationDays: number,
  base: SimulationConfig
): SimulationConfig {
  return {
    ...base,
    shadowLightFraction: retainedLightFraction,
    shadowEndsAt: base.shadowStartsAt + durationDays - 1
  };
}

export function createMicrobialShadowResponseFamily(
  seed: string,
  base: SimulationConfig = DEFAULT_CONFIG
): MicrobialShadowResponseFamily {
  const cases = MICROBIAL_SHADOW_DURATIONS.flatMap((durationDays) =>
    MICROBIAL_SHADOW_LIGHT_LEVELS.map((retainedLightFraction) => {
      const parameters = { retainedLightFraction, durationDays };
      const bundle = createMicrobialShadowEvaluation(
        seed,
        caseConfig(retainedLightFraction, durationDays, base)
      );
      const evaluation = bundle.evaluation;
      const id = `light-${Math.round(retainedLightFraction * 100)}/days-${durationDays}`;
      const manifestHash = stableChecksum('evaluation-family-case/v1', {
        id,
        parameters,
        parentCheckpointHash: bundle.checkpoint.hash,
        perturbationHash: bundle.run.fork?.perturbationHash,
        profileHash: MICROBIAL_SHADOW_PROFILE.hash
      });
      return {
        id,
        parameters,
        manifestHash,
        parentCheckpointHash: bundle.checkpoint.hash,
        outcome: {
          status: evaluation.status,
          valid: evaluation.status !== 'invalid',
          lowestBiomassRetentionPercent: evaluation.metrics.lowestRetentionPercent,
          lowestProductiveFluxRetentionPercent: evaluation.metrics.lowestProductiveFluxRetentionPercent,
          peakStressPercent: evaluation.metrics.peakStressPercent,
          recoveryDaysAfterLightReturns: evaluation.metrics.recoveryDaysAfterLightReturns,
          retainedFunctionPercent: evaluation.metrics.retainedFunctionPercent,
          endDifferencePercent: evaluation.metrics.endDifferencePercent
        }
      };
    })
  );
  const parentHashes = [...new Set(cases.map(({ parentCheckpointHash }) => parentCheckpointHash))];
  if (parentHashes.length !== 1) throw new Error('A paired response family must share one parent checkpoint.');
  const familyCases = cases.map(({ parentCheckpointHash: _parentCheckpointHash, ...item }) => item);
  const definition = {
    id: 'biology/microbial-long-shadow-response-family',
    version: '0.1.0',
    profile: {
      id: MICROBIAL_SHADOW_PROFILE.id,
      version: MICROBIAL_SHADOW_PROFILE.version,
      hash: MICROBIAL_SHADOW_PROFILE.hash
    },
    axes: [
      { id: 'duration-days', label: 'Shadow duration', unit: 'days', values: MICROBIAL_SHADOW_DURATIONS },
      { id: 'retained-light', label: 'Usable light retained', unit: 'ratio', values: MICROBIAL_SHADOW_LIGHT_LEVELS }
    ],
    cases: familyCases
  };
  return {
    ...definition,
    parentCheckpointHash: parentHashes[0],
    referenceCaseId: 'light-30/days-37',
    hash: stableChecksum('evaluation-family/v1', definition)
  };
}
