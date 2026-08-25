import type { MicrobialShadowResponseFamily } from '../analysis';

export interface EvaluationResponseMapCell {
  id: string;
  rowValue: number;
  columnValue: number;
  status: 'recovered' | 'survived' | 'collapsed' | 'invalid';
  statusLabel: string;
  isReference: boolean;
  headline: string;
  measures: readonly { label: string; value: string }[];
  manifestHash: string;
}

export interface EvaluationResponseMapView {
  id: string;
  version: string;
  title: string;
  eyebrow: string;
  summary: string;
  rowAxis: { id: string; label: string; unit: string; values: readonly number[] };
  columnAxis: { id: string; label: string; unit: string; values: readonly number[] };
  cells: readonly EvaluationResponseMapCell[];
  profile: { id: string; version: string; hash: string };
  parentCheckpointHash: string;
}

const percent = (value: number) => `${Math.round(value)}%`;

export function projectMicrobialShadowResponse(
  family: MicrobialShadowResponseFamily
): EvaluationResponseMapView {
  const rowAxis = family.axes.find(({ id }) => id === 'duration-days');
  const columnAxis = family.axes.find(({ id }) => id === 'retained-light');
  if (!rowAxis || !columnAxis) throw new Error('Microbial response family is missing a display axis.');

  return {
    id: 'view/biology/microbial-shadow-response',
    version: '0.1.0',
    title: 'How much darkness can this community absorb?',
    eyebrow: 'One saved day · nine controlled futures',
    summary: 'Every square starts from the same checkpoint. Across the map, less usable light remains. Down the map, the dim period lasts longer. This is still the same experiment—not nine hand-authored stories.',
    rowAxis,
    columnAxis,
    profile: family.profile,
    parentCheckpointHash: family.parentCheckpointHash,
    cells: family.cases.map(({ id, parameters, manifestHash, outcome }) => ({
      id,
      rowValue: parameters.durationDays,
      columnValue: parameters.retainedLightFraction,
      status: outcome.status,
      statusLabel: outcome.status === 'recovered' ? 'Recovered' : outcome.status === 'survived' ? 'Still changed' : outcome.status === 'collapsed' ? 'Collapsed' : 'Invalid',
      isReference: id === family.referenceCaseId,
      headline: `${percent(outcome.lowestBiomassRetentionPercent)} living mass at the lowest point`,
      measures: [
        { label: 'new-mass production', value: `${percent(outcome.lowestProductiveFluxRetentionPercent)} of control` },
        { label: 'recovery after light returns', value: outcome.recoveryDaysAfterLightReturns === null ? 'not within this run' : outcome.recoveryDaysAfterLightReturns === 0 ? 'same day' : `${outcome.recoveryDaysAfterLightReturns} days` },
        { label: 'represented functions retained', value: percent(outcome.retainedFunctionPercent) },
        { label: 'difference at the end', value: `${outcome.endDifferencePercent > 0 ? '+' : ''}${outcome.endDifferencePercent}%` }
      ],
      manifestHash
    }))
  };
}
