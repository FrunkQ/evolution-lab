import { biomassWeightedStress, productiveBiomassFlux } from '../analysis';
import type { ResourceKey, SimulationRun, WorldSnapshot } from '../core';
import {
  projectMicrobialBiomassHistory,
  projectRunMarkers,
  type TemporalProjection,
  type TemporalSeries
} from './temporal';

export type MicrobialHistoryId =
  | 'biology/microbial-biomass-history'
  | 'biology/productive-flux-history'
  | 'biology/stress-history'
  | 'biology/resource-history';

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  light: 'Usable light',
  carbon: 'Carbon stock',
  minerals: 'Mineral stock',
  oxygen: 'Oxygen field',
  detritus: 'Detritus stock'
};

function samples(run: SimulationRun, value: (snapshot: WorldSnapshot) => number) {
  return run.snapshots.map((snapshot) => ({ tick: snapshot.tick, value: value(snapshot) }));
}

function pairedSeries(
  id: string,
  label: string,
  description: string,
  unit: string,
  shadow: SimulationRun,
  control: SimulationRun,
  value: (snapshot: WorldSnapshot) => number
): TemporalSeries[] {
  return [
    { id: id + '/shadow', label: label + ' · long shadow', description, unit, samples: samples(shadow, value) },
    {
      id: id + '/control',
      label: label + ' · control',
      description: description + ' in the no-shadow future resumed from the same checkpoint.',
      unit,
      samples: samples(control, value)
    }
  ];
}

export function projectProductiveFluxHistory(shadow: SimulationRun, control: SimulationRun): TemporalProjection {
  const unit = 'experimental biomass units/day';
  return {
    id: 'biology/productive-flux-history',
    selectorLabel: 'New living mass',
    title: 'Productive flow through time',
    timeLabel: 'Simulation day',
    quantityLabel: 'Positive population productivity',
    unit,
    accessibilityLabel: 'Positive aggregate biomass production for the long-shadow and control futures. Use left and right arrow keys to inspect another day.',
    explanation: [
      'This sums only positive net productivity across active populations on each stored day. It is a practical prototype measure of new living mass, not total material throughput.',
      'Negative productivity, recycling and futile churn are not included. A complete unit-aware flux and conservation ledger remains the next engine boundary.'
    ],
    relativeMode: 'series-maximum',
    series: pairedSeries(
      'productive',
      'New living mass',
      'Sum of positive stored population productivity.',
      unit,
      shadow,
      control,
      productiveBiomassFlux
    ),
    markers: projectRunMarkers(shadow)
  };
}

export function projectStressHistory(shadow: SimulationRun, control: SimulationRun): TemporalProjection {
  const unit = '% biomass-weighted stress';
  return {
    id: 'biology/stress-history',
    selectorLabel: 'Community strain',
    title: 'Community strain through time',
    timeLabel: 'Simulation day',
    quantityLabel: 'Biomass-weighted stress',
    unit,
    accessibilityLabel: 'Biomass-weighted community stress for the long-shadow and control futures. Use left and right arrow keys to inspect another day.',
    explanation: [
      'Each population stores a unitless stress value. This view weights those values by living mass, so a tiny stressed population does not dominate the whole-community reading.',
      'This is an authored engine signal, not a measured biological stress biomarker. Higher means the current rules report more pressure on the represented populations.'
    ],
    relativeMode: null,
    series: pairedSeries(
      'stress',
      'Community strain',
      'Stored population stress weighted by active biomass.',
      unit,
      shadow,
      control,
      (snapshot) => biomassWeightedStress(snapshot) * 100
    ),
    markers: projectRunMarkers(shadow)
  };
}

export function projectResourceHistory(shadow: SimulationRun, control: SimulationRun): TemporalProjection {
  const resourceSeries = (Object.keys(RESOURCE_LABELS) as ResourceKey[]).map((resource): TemporalSeries => ({
    id: 'resource/' + resource,
    label: RESOURCE_LABELS[resource],
    description: 'Stored ' + resource + ' value in the long-shadow future.',
    unit: 'experimental ledger units',
    samples: samples(shadow, (snapshot) => snapshot.resources[resource])
  }));
  return {
    id: 'biology/resource-history',
    selectorLabel: 'Resources',
    title: 'Available resources through time',
    timeLabel: 'Simulation day',
    quantityLabel: 'Stored resource level',
    unit: 'experimental ledger units',
    accessibilityLabel: 'Stored resource levels in the long-shadow future, with usable light from the checkpoint control. Use left and right arrow keys to inspect another day.',
    explanation: [
      'These are the five resource values already stored by the prototype. The dashed blue line is usable light in the control future, making the declared external change visible.',
      'The shared experimental unit is a modelling convenience: light, carbon, minerals, oxygen and detritus are not physically interchangeable. Relative view compares curve shapes only.'
    ],
    relativeMode: 'series-maximum',
    series: [
      ...resourceSeries,
      {
        id: 'resource/control-light',
        label: 'Usable light · control',
        description: 'Stored usable light in the no-shadow future resumed from the same checkpoint.',
        unit: 'experimental ledger units',
        samples: samples(control, (snapshot) => snapshot.resources.light)
      }
    ],
    markers: projectRunMarkers(shadow)
  };
}

export function projectMicrobialHistories(shadow: SimulationRun, control: SimulationRun): readonly TemporalProjection[] {
  return [
    projectMicrobialBiomassHistory(shadow, control),
    projectProductiveFluxHistory(shadow, control),
    projectStressHistory(shadow, control),
    projectResourceHistory(shadow, control)
  ];
}