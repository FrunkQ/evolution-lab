import type {
  AlienLakeEvent,
  AlienLakeExperimentResult,
  AlienLakeSnapshot,
  LakePatchId,
  LakePopulationSnapshot,
  LakeResolutionState
} from '../analysis';

export interface LakePlotPoint {
  coordinate: number;
  value: number;
}
export interface LakeSpectrumSeries {
  id: string;
  label: string;
  color: string;
  dash?: string;
  symbol: string;
  points: readonly LakePlotPoint[];
}

export interface LakePopulationView {
  id: string;
  title: string;
  ancestry: string;
  responseCenterNm: number;
  responseWidthNm: number;
  biomass: number;
  incidentPower: number;
  absorbedPower: number;
  accessiblePower: number;
  operatingCost: number;
  netPower: number;
  capturePercent: number;
  captureProfile: readonly LakePlotPoint[];
}

export interface LakePatchView {
  id: LakePatchId;
  label: string;
  depthM: number;
  nutrient: number;
  detritus: number;
  incidentPower: number;
  returnedPeakNm: number;
  populations: readonly LakePopulationView[];
  field: readonly LakePlotPoint[];
}

export interface LakeHistorySeries {
  id: 'biomass' | 'nutrient' | 'detritus';
  label: string;
  unit: string;
  color: string;
  symbol: string;
  samples: readonly { tick: number; value: number }[];
}

export interface AlienLakeView {
  id: string;
  tick: number;
  duration: number;
  spectrumId: string;
  spectrumLabel: string;
  providerReference: string;
  resolution: LakeResolutionState;
  patches: readonly LakePatchView[];
  selectedPatch: LakePatchView;
  spectrumSeries: readonly LakeSpectrumSeries[];
  history: readonly LakeHistorySeries[];
  events: readonly AlienLakeEvent[];
  visibleEvents: readonly AlienLakeEvent[];
  totals: { biomass: number; nutrient: number; detritus: number; material: number };
  scaleProof: AlienLakeExperimentResult['scaleProof'];
  comparisons: {
    sameResponseDifferentLightPercent: number;
    sameLightDifferentResponsePercent: number;
  };
  accounting: AlienLakeSnapshot['accounting'];
  runHash: string;
}

const PATCH_STYLES: Readonly<Record<LakePatchId, { color: string; dash?: string; symbol: string }>> = Object.freeze({
  'lake/surface': { color: '#ffe08a', symbol: '☀' },
  'lake/mixed-water': { color: '#74bfff', dash: '7 3', symbol: '≈' },
  'lake/sediment-refuge': { color: '#b99cff', dash: '2 3', symbol: '◆' }
});

const POPULATION_STYLES = ['#68e0a3', '#ffb765', '#d7a4ff', '#ff7f9f'] as const;

const round = (value: number, digits = 3): number => Number(value.toFixed(digits));

function populationView(population: LakePopulationSnapshot): LakePopulationView {
  const firstBand = population.responseBands[0];
  return {
    id: population.id,
    title: population.responseTitle,
    ancestry: population.parentId ? `Daughter of ${population.parentId.replace('population/', '')}` : 'Starting response family',
    responseCenterNm: firstBand.center,
    responseWidthNm: firstBand.width,
    biomass: round(population.biomassMinor / 100, 2),
    incidentPower: round(population.incidentWm2),
    absorbedPower: round(population.absorbedWm2),
    accessiblePower: round(population.accessibleWm2),
    operatingCost: round(population.operatingCostWm2),
    netPower: round(population.netAccessibleWm2),
    capturePercent: round(population.captureFraction * 100, 1),
    captureProfile: population.captureProfile.map(({ coordinate, value }) => ({ coordinate, value: round(value, 6) }))
  };
}

export function projectAlienLake(
  experiment: AlienLakeExperimentResult,
  requestedTick: number,
  requestedPatchId: LakePatchId = 'lake/mixed-water'
): AlienLakeView {
  const tick = Math.max(0, Math.min(experiment.run.snapshots.length - 1, Math.round(requestedTick)));
  const snapshot = experiment.run.snapshots[tick];
  const patches = snapshot.patches.map((patch) => ({
    id: patch.id,
    label: patch.label,
    depthM: patch.depthM,
    nutrient: round(patch.nutrientMinor / 100, 2),
    detritus: round(patch.detritusMinor / 100, 2),
    incidentPower: round(patch.incidentWm2),
    returnedPeakNm: patch.returnedPeakNm,
    populations: patch.populations.map(populationView),
    field: patch.spectralField.samples.map(({ coordinate, value }) => ({ coordinate, value: round(value, 6) }))
  }));
  const selectedPatch = patches.find(({ id }) => id === requestedPatchId) ?? patches[0];
  const fieldSeries: LakeSpectrumSeries = {
    id: `field/${selectedPatch.id}`,
    label: `${selectedPatch.label} light`,
    ...PATCH_STYLES[selectedPatch.id],
    points: selectedPatch.field
  };
  const responseSeries = selectedPatch.populations.map((population, index): LakeSpectrumSeries => ({
    id: `response/${population.id}`,
    label: `${population.title} capture`,
    color: POPULATION_STYLES[index % POPULATION_STYLES.length],
    dash: index % 2 ? '5 3' : undefined,
    symbol: index % 2 ? '◇' : '●',
    points: population.captureProfile
  }));
  const totalAt = (sample: AlienLakeSnapshot, key: 'totalBiomassMinor' | 'totalNutrientMinor' | 'totalDetritusMinor') => round(sample[key] / 100, 2);
  const history: LakeHistorySeries[] = [
    { id: 'biomass', label: 'Living biomass', unit: 'lake mass', color: '#68e0a3', symbol: '●', samples: experiment.run.snapshots.map((sample) => ({ tick: sample.tick, value: totalAt(sample, 'totalBiomassMinor') })) },
    { id: 'nutrient', label: 'Accessible nutrient', unit: 'lake mass', color: '#74bfff', symbol: '◇', samples: experiment.run.snapshots.map((sample) => ({ tick: sample.tick, value: totalAt(sample, 'totalNutrientMinor') })) },
    { id: 'detritus', label: 'Detritus', unit: 'lake mass', color: '#c99d75', symbol: '▲', samples: experiment.run.snapshots.map((sample) => ({ tick: sample.tick, value: totalAt(sample, 'totalDetritusMinor') })) }
  ];
  const totals = {
    biomass: totalAt(snapshot, 'totalBiomassMinor'),
    nutrient: totalAt(snapshot, 'totalNutrientMinor'),
    detritus: totalAt(snapshot, 'totalDetritusMinor'),
    material: round((snapshot.totalBiomassMinor + snapshot.totalNutrientMinor + snapshot.totalDetritusMinor) / 100, 2)
  };
  const percentChange = (baseline: number, alternate: number): number => round((alternate - baseline) / Math.max(Math.abs(baseline), 1e-9) * 100, 1);
  return {
    id: `projection/alien-lake/${experiment.run.runHash}/${tick}/${selectedPatch.id}`,
    tick,
    duration: experiment.run.snapshots.length - 1,
    spectrumId: experiment.run.spectrumId,
    spectrumLabel: experiment.run.spectrumLabel,
    providerReference: experiment.run.providerReference,
    resolution: snapshot.resolution,
    patches,
    selectedPatch,
    spectrumSeries: [fieldSeries, ...responseSeries],
    history,
    events: experiment.run.events,
    visibleEvents: experiment.run.events.filter((event) => event.tick <= tick).slice(-5).reverse(),
    totals,
    scaleProof: experiment.scaleProof,
    comparisons: {
      sameResponseDifferentLightPercent: percentChange(experiment.spectrumCounterfactual.baselineAccessibleWm2, experiment.spectrumCounterfactual.alternateAccessibleWm2),
      sameLightDifferentResponsePercent: percentChange(experiment.responseCounterfactual.firstAccessibleWm2, experiment.responseCounterfactual.secondAccessibleWm2)
    },
    accounting: snapshot.accounting,
    runHash: experiment.run.runHash
  };
}
