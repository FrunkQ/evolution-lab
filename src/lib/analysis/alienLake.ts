import {
  AccountingTracker,
  compileExactWrapper,
  compareContractObservables,
  expandExactWrapper,
  randomAt,
  stableChecksum,
  validateAccountingFrames,
  type ExactRetainedStateWrapper,
  type MatterAccountingFrame
} from '../core';
import { HABITAT_GRAPH_SCHEMA, compileHabitatGraph } from '../core/habitatGraph';
import { EXOBIOLOGY_SPECTRAL_PRESETS, type CurvePreset } from '../contracts';
import {
  RESPONSE_FUNCTION_SCHEMA,
  compileResponseFunction,
  evaluateResponseFunction,
  responseAt,
  type CompiledResponseFunction,
  type NumericField,
  type ResponseFunctionDefinition,
  type ResponseProjection
} from '../mechanisms';

export const ALIEN_LAKE_SCHEMA = 'evolution-alien-lake/0.1' as const;
export const ALIEN_LAKE_SCENARIO_ID = 'lab/alien-lake-001' as const;
export const ALIEN_LAKE_SCENARIO_VERSION = '0.1.0' as const;
export const ALIEN_LAKE_DURATION = 240;
export const ALIEN_LAKE_WRAP_AT = 120;
export const ALIEN_LAKE_REEXPAND_AT = 168;
export const ALIEN_LAKE_DEFAULT_SEED = 'violet-tides-over-copper-silt';
export const ALIEN_LAKE_DEFAULT_SPECTRUM = 'm-star-earthlike-surface';

export type LakePatchId = 'lake/surface' | 'lake/mixed-water' | 'lake/sediment-refuge';
export type LakeResolutionState = 'detailed' | 'exact-wrapper' | 're-expanded';

export interface LakePatchState {
  id: LakePatchId;
  nutrientMinor: number;
  detritusMinor: number;
}

export interface LakePopulationState {
  id: string;
  parentId?: string;
  patchId: LakePatchId;
  responseId: string;
  biomassMinor: number;
  emergedAt: number;
}

interface MutableLakeState {
  patches: LakePatchState[];
  populations: LakePopulationState[];
}

export interface LakePopulationSnapshot extends LakePopulationState {
  responseTitle: string;
  responseBands: readonly { center: number; width: number; strength: number }[];
  captureProfile: readonly { coordinate: number; value: number }[];
  centerNm: number;
  captureFraction: number;
  incidentWm2: number;
  absorbedWm2: number;
  accessibleWm2: number;
  operatingCostWm2: number;
  netAccessibleWm2: number;
}

export interface LakePatchSnapshot extends LakePatchState {
  label: string;
  depthM: number;
  incidentWm2: number;
  returnedPeakNm: number;
  spectralField: NumericField;
  populations: LakePopulationSnapshot[];
}

export interface AlienLakeEvent {
  id: string;
  tick: number;
  kind: 'variation' | 'environment' | 'resolution';
  title: string;
  summary: string;
  causes: readonly string[];
}

export interface AlienLakeSnapshot {
  tick: number;
  resolution: LakeResolutionState;
  patches: readonly LakePatchSnapshot[];
  totalBiomassMinor: number;
  totalNutrientMinor: number;
  totalDetritusMinor: number;
  accounting: MatterAccountingFrame;
  stateHash: string;
}

export interface LakeScaleProof {
  wrapperId: string;
  wrappedAt: number;
  reexpandedAt: number;
  retainedMemberCount: number;
  exactResume: boolean;
  finalDetailedHash: string;
  finalWrappedHash: string;
  observableDistances: ReturnType<typeof compareContractObservables>;
  limitations: readonly string[];
}

export interface AlienLakeRun {
  schemaVersion: typeof ALIEN_LAKE_SCHEMA;
  seed: string;
  spectrumId: string;
  spectrumLabel: string;
  providerReference: string;
  habitatGraphHash: string;
  responseHashes: readonly string[];
  daughterShiftNm: number;
  snapshots: readonly AlienLakeSnapshot[];
  events: readonly AlienLakeEvent[];
  accounting: ReturnType<typeof validateAccountingFrames>;
  finalStateHash: string;
  runHash: string;
}

export interface AlienLakeExperimentResult {
  run: AlienLakeRun;
  detailedControl: AlienLakeRun;
  scaleProof: LakeScaleProof;
  spectrumCounterfactual: {
    responseId: string;
    baselineSpectrumId: string;
    alternateSpectrumId: string;
    baselineAccessibleWm2: number;
    alternateAccessibleWm2: number;
  };
  responseCounterfactual: {
    spectrumId: string;
    firstResponseId: string;
    secondResponseId: string;
    firstAccessibleWm2: number;
    secondAccessibleWm2: number;
  };
}

const patchFacts = {
  'lake/surface': { label: 'Sunlit skin', depthM: 0.2, attenuation: 1 },
  'lake/mixed-water': { label: 'Mixed water', depthM: 4, attenuation: 0.42 },
  'lake/sediment-refuge': { label: 'Sediment refuge', depthM: 18, attenuation: 0.08 }
} as const;

export const ALIEN_LAKE_HABITAT_GRAPH = compileHabitatGraph({
  schemaVersion: HABITAT_GRAPH_SCHEMA,
  id: 'exobiology/alien-lake-habitats',
  version: '0.1.0',
  nodes: (Object.entries(patchFacts) as [LakePatchId, (typeof patchFacts)[LakePatchId]][]).map(([id, facts]) => ({
    id, type: 'liquid-habitat-patch', label: facts.label, facts
  })),
  links: [
    { id: 'transport/surface-mixing', sourceId: 'lake/surface', targetId: 'lake/mixed-water', relation: 'mixes-with', transferFractionPerInterval: 0.025, bidirectional: true },
    { id: 'transport/mixed-sediment', sourceId: 'lake/mixed-water', targetId: 'lake/sediment-refuge', relation: 'settles-and-resuspends', transferFractionPerInterval: 0.012, bidirectional: true }
  ]
});

function responseDefinition(
  id: string,
  title: string,
  bands: ResponseFunctionDefinition['bands'],
  efficiency: number,
  construction: number,
  maintenance: number,
  repair: number
): ResponseFunctionDefinition {
  return {
    schemaVersion: RESPONSE_FUNCTION_SCHEMA,
    id,
    version: '0.1.0',
    title,
    input: {
      coordinateSemantic: 'physics/electromagnetic-wavelength', coordinateUnit: 'nm',
      valueSemantic: 'physics/spectral-irradiance', valueUnit: 'W.m-2.nm-1'
    },
    output: { accessibleSemantic: 'biology/accessible-photochemical-power', integratedUnit: 'W.m-2' },
    domain: { minimum: 280, maximum: 1400 },
    baselineCapture: 0.015,
    bands,
    efficiency,
    costs: { construction, maintenance, repair, unit: 'W.m-2' },
    evidence: 'fictional',
    limitations: [
      'Authored alien response used to test the mechanism contract; it is not a predicted pigment.',
      'Power-to-growth mapping is an uncalibrated aggregate experiment.'
    ]
  };
}

export const ALIEN_LAKE_BASE_RESPONSES = Object.freeze([
  compileResponseFunction(responseDefinition('biology/response/short-wave-crown', 'Short-wave crown', [{ center: 455, width: 38, strength: 0.82 }], 0.34, 13, 3.4, 1.1)),
  compileResponseFunction(responseDefinition('biology/response/amber-window', 'Amber window', [{ center: 610, width: 52, strength: 0.76 }], 0.31, 9, 2.3, 0.7)),
  compileResponseFunction(responseDefinition('biology/response/broad-deep-veil', 'Broad deep veil', [{ center: 540, width: 58, strength: 0.5 }, { center: 790, width: 72, strength: 0.58 }], 0.27, 18, 5.2, 1.4))
]);

const spectrumPreset = (id: string): CurvePreset => {
  const preset = EXOBIOLOGY_SPECTRAL_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unknown Alien Lake spectrum ${id}.`);
  return preset;
};

function providerField(preset: CurvePreset): NumericField {
  return {
    coordinateSemantic: 'physics/electromagnetic-wavelength', coordinateUnit: preset.value.xUnit,
    valueSemantic: 'physics/spectral-irradiance', valueUnit: preset.value.yUnit,
    samples: preset.value.x.map((coordinate, index) => ({ coordinate, value: preset.value.y[index] }))
  };
}

function patchField(preset: CurvePreset, patchId: LakePatchId, tick: number): NumericField {
  const base = providerField(preset);
  const facts = patchFacts[patchId];
  const turbulent = tick >= ALIEN_LAKE_REEXPAND_AT && tick < 190;
  return {
    ...base,
    samples: base.samples.map(({ coordinate, value }) => {
      const redPreference = 0.32 + 0.68 * Math.min(1, Math.max(0, (coordinate - 320) / 650));
      const depthTransmission = patchId === 'lake/surface' ? 1 : facts.attenuation * redPreference;
      const disturbance = turbulent && patchId !== 'lake/surface' ? 0.36 : 1;
      return { coordinate, value: value * depthTransmission * disturbance };
    })
  };
}

function initialState(): MutableLakeState {
  return {
    patches: [
      { id: 'lake/surface', nutrientMinor: 42_000, detritusMinor: 3_000 },
      { id: 'lake/mixed-water', nutrientMinor: 31_000, detritusMinor: 7_000 },
      { id: 'lake/sediment-refuge', nutrientMinor: 19_000, detritusMinor: 18_000 }
    ],
    populations: [
      { id: 'population/short-surface', patchId: 'lake/surface', responseId: 'biology/response/short-wave-crown', biomassMinor: 3_800, emergedAt: 0 },
      { id: 'population/amber-mixed', patchId: 'lake/mixed-water', responseId: 'biology/response/amber-window', biomassMinor: 3_200, emergedAt: 0 },
      { id: 'population/veil-sediment', patchId: 'lake/sediment-refuge', responseId: 'biology/response/broad-deep-veil', biomassMinor: 2_600, emergedAt: 0 }
    ]
  };
}

const captureLakeAccounts = (state: MutableLakeState): Record<string, number> => ({
  ...Object.fromEntries(state.patches.flatMap((patch) => [
    [`patch/${patch.id}/nutrient`, patch.nutrientMinor],
    [`patch/${patch.id}/detritus`, patch.detritusMinor]
  ])),
  ...Object.fromEntries(state.populations.map((population) => [`population/${population.id}`, population.biomassMinor]))
});

const lakeIdentity = { boundaryId: 'scenario/alien-lake', unit: 'lake-model-mass', minorUnit: 0.01 };

function responseMap(seed: string): { responses: Map<string, CompiledResponseFunction>; daughterShiftNm: number } {
  const parent = ALIEN_LAKE_BASE_RESPONSES[1];
  const daughterShiftNm = randomAt(seed, ['experiment', 'alien-lake', 'variation', parent.id], 0) < 0.5 ? -30 : 30;
  const daughter = compileResponseFunction({
    ...responseDefinition(
      'biology/response/amber-window-daughter-1',
      'Shifted amber daughter',
      parent.bands.map((band) => ({ ...band, center: band.center + daughterShiftNm })),
      parent.efficiency,
      parent.costs.construction + 1.5,
      parent.costs.maintenance + 0.35,
      parent.costs.repair + 0.1
    ),
    version: '0.1.0'
  });
  const responses = [...ALIEN_LAKE_BASE_RESPONSES, daughter];
  return { responses: new Map(responses.map((response) => [response.id, response])), daughterShiftNm };
}

function transfer(
  tracker: AccountingTracker<MutableLakeState>,
  state: MutableLakeState,
  tick: number,
  id: string,
  label: string,
  causes: string[],
  mutate: () => void
): void {
  tracker.record(state, { id: `${id}/${tick}`, kind: 'transfer', label, causes }, mutate);
}

function transformPopulations(
  state: MutableLakeState,
  tracker: AccountingTracker<MutableLakeState>,
  responses: ReadonlyMap<string, CompiledResponseFunction>,
  preset: CurvePreset,
  tick: number
): void {
  for (const population of [...state.populations].sort((left, right) => left.id.localeCompare(right.id))) {
    const patch = state.patches.find(({ id }) => id === population.patchId)!;
    const response = responses.get(population.responseId)!;
    const projection = evaluateResponseFunction(response, patchField(preset, patch.id, tick));
    const incident = Math.max(1, projection.incident);
    const constructionAmortized = response.costs.construction / 45;
    const netPower = projection.accessible - projection.operatingCost - constructionAmortized;
    const energyFraction = Math.max(0, netPower / incident);
    const growthDemand = Math.max(0, Math.floor(population.biomassMinor * Math.min(0.055, energyFraction * 0.21)));
    const growth = Math.min(patch.nutrientMinor, growthDemand);
    if (growth > 0) transfer(tracker, state, tick, `lake/growth/${population.id}`, 'Nutrient stock becomes aggregate biomass', [response.id, preset.id, patch.id], () => {
      patch.nutrientMinor -= growth;
      population.biomassMinor += growth;
    });
    const energyShortfall = Math.max(0, (projection.operatingCost + constructionAmortized - projection.accessible) / incident);
    const lossFraction = Math.min(0.045, 0.004 + energyShortfall * 0.22 + response.costs.maintenance / incident * 0.01);
    const loss = Math.min(population.biomassMinor, Math.max(1, Math.floor(population.biomassMinor * lossFraction)));
    if (loss > 0) transfer(tracker, state, tick, `lake/turnover/${population.id}`, 'Population turnover becomes detritus', [response.id, patch.id], () => {
      population.biomassMinor -= loss;
      patch.detritusMinor += loss;
    });
  }
}

function recycleAndTransport(state: MutableLakeState, tracker: AccountingTracker<MutableLakeState>, tick: number): void {
  for (const patch of state.patches) {
    const recycled = Math.floor(patch.detritusMinor * 0.016);
    if (recycled > 0) transfer(tracker, state, tick, `lake/recycle/${patch.id}`, 'Detritus returns to accessible nutrient stock', ['capability/recycling', patch.id], () => {
      patch.detritusMinor -= recycled;
      patch.nutrientMinor += recycled;
    });
  }
  for (const link of ALIEN_LAKE_HABITAT_GRAPH.links) {
    const source = state.patches.find(({ id }) => id === link.sourceId)!;
    const target = state.patches.find(({ id }) => id === link.targetId)!;
    for (const stock of ['nutrientMinor', 'detritusMinor'] as const) {
      const richer = source[stock] >= target[stock] ? source : target;
      const poorer = richer === source ? target : source;
      const amount = Math.floor((richer[stock] - poorer[stock]) * link.transferFractionPerInterval);
      if (amount > 0) transfer(tracker, state, tick, `lake/transport/${link.id}/${stock}`, 'Connected patches exchange material', [link.id], () => {
        richer[stock] -= amount;
        poorer[stock] += amount;
      });
    }
  }
}

function introduceDaughter(state: MutableLakeState, tracker: AccountingTracker<MutableLakeState>, tick: number): void {
  const parent = state.populations.find(({ id }) => id === 'population/amber-mixed')!;
  const founder = Math.floor(parent.biomassMinor * 0.12);
  transfer(tracker, state, tick, 'lake/variation/amber-daughter', 'A bounded daughter response branches from existing biomass', ['named-draw/variation-0', parent.responseId], () => {
    parent.biomassMinor -= founder;
    state.populations.push({
      id: 'population/amber-daughter-1', parentId: parent.id, patchId: parent.patchId,
      responseId: 'biology/response/amber-window-daughter-1', biomassMinor: founder, emergedAt: tick
    });
  });
}

function projectionFor(
  population: LakePopulationState,
  response: CompiledResponseFunction,
  preset: CurvePreset,
  tick: number
): ResponseProjection {
  return evaluateResponseFunction(response, patchField(preset, population.patchId, tick));
}

function peakReturnedWavelength(projection: ResponseProjection): number {
  return projection.returnedField.samples.reduce((peak, sample) => sample.value > peak.value ? sample : peak).coordinate;
}

function snapshot(
  state: MutableLakeState,
  accounting: MatterAccountingFrame,
  responses: ReadonlyMap<string, CompiledResponseFunction>,
  preset: CurvePreset,
  tick: number,
  resolution: LakeResolutionState
): AlienLakeSnapshot {
  const patches = state.patches.map((patch) => {
    const populations = state.populations.filter(({ patchId }) => patchId === patch.id).map((population) => {
      const response = responses.get(population.responseId)!;
      const projection = projectionFor(population, response, preset, tick);
      return {
        ...population,
        responseTitle: response.title,
        responseBands: response.bands.map(({ center, width, strength }) => ({ center, width, strength })),
        captureProfile: patchField(preset, patch.id, tick).samples.map(({ coordinate }) => ({ coordinate, value: responseAt(response, coordinate) })),
        centerNm: response.bands[0].center,
        captureFraction: projection.captureFraction,
        incidentWm2: projection.incident,
        absorbedWm2: projection.captured,
        accessibleWm2: projection.accessible,
        operatingCostWm2: projection.operatingCost + response.costs.construction / 45,
        netAccessibleWm2: projection.accessible - projection.operatingCost - response.costs.construction / 45
      };
    });
    const incident = populations[0]?.incidentWm2 ?? evaluateResponseFunction(ALIEN_LAKE_BASE_RESPONSES[0], patchField(preset, patch.id, tick)).incident;
    const returnedPeakNm = populations.length
      ? peakReturnedWavelength(projectionFor(populations[0], responses.get(populations[0].responseId)!, preset, tick))
      : 0;
    return { ...patch, ...patchFacts[patch.id], incidentWm2: incident, returnedPeakNm, spectralField: patchField(preset, patch.id, tick), populations };
  });
  const observable = {
    patches: patches.map(({ id, nutrientMinor, detritusMinor, populations }) => ({ id, nutrientMinor, detritusMinor, populations: populations.map(({ id: populationId, biomassMinor, responseId }) => ({ id: populationId, biomassMinor, responseId })) }))
  };
  return {
    tick, resolution, patches,
    totalBiomassMinor: state.populations.reduce((sum, population) => sum + population.biomassMinor, 0),
    totalNutrientMinor: state.patches.reduce((sum, patch) => sum + patch.nutrientMinor, 0),
    totalDetritusMinor: state.patches.reduce((sum, patch) => sum + patch.detritusMinor, 0),
    accounting,
    stateHash: stableChecksum('alien-lake-state/v1', observable)
  };
}

interface LakeWrapperBoundary {
  patchId: LakePatchId;
  totalMaterialMinor: number;
  biomassMinor: number;
  nutrientMinor: number;
  detritusMinor: number;
  responseDistribution: Readonly<Record<string, number>>;
}

interface LakeRetainedPatchState {
  patch: LakePatchState;
  populations: LakePopulationState[];
}

function retainedPatch(state: MutableLakeState, patchId: LakePatchId): LakeRetainedPatchState {
  return JSON.parse(JSON.stringify({
    patch: state.patches.find(({ id }) => id === patchId)!,
    populations: state.populations.filter(({ patchId: candidate }) => candidate === patchId)
  })) as LakeRetainedPatchState;
}

function boundaryFor(retained: LakeRetainedPatchState): LakeWrapperBoundary {
  const biomassMinor = retained.populations.reduce((sum, population) => sum + population.biomassMinor, 0);
  return {
    patchId: retained.patch.id,
    totalMaterialMinor: retained.patch.nutrientMinor + retained.patch.detritusMinor + biomassMinor,
    biomassMinor,
    nutrientMinor: retained.patch.nutrientMinor,
    detritusMinor: retained.patch.detritusMinor,
    responseDistribution: Object.fromEntries(retained.populations.map((population) => [population.responseId, population.biomassMinor]))
  };
}

function applyRetainedPatch(state: MutableLakeState, retained: LakeRetainedPatchState): void {
  state.patches = state.patches.map((patch) => patch.id === retained.patch.id ? { ...retained.patch } : patch);
  state.populations = [
    ...state.populations.filter(({ patchId }) => patchId !== retained.patch.id),
    ...retained.populations.map((population) => ({ ...population }))
  ];
}

function simulate(seed: string, preset: CurvePreset, useWrapper: boolean): AlienLakeRun & { lastWrapper?: ExactRetainedStateWrapper<LakeWrapperBoundary, LakeRetainedPatchState> } {
  const state = initialState();
  const { responses, daughterShiftNm } = responseMap(seed);
  const events: AlienLakeEvent[] = [];
  const snapshots: AlienLakeSnapshot[] = [];
  let wrapper: ExactRetainedStateWrapper<LakeWrapperBoundary, LakeRetainedPatchState> | undefined;
  const initialTracker = new AccountingTracker(0, state, lakeIdentity, captureLakeAccounts);
  snapshots.push(snapshot(state, initialTracker.finish(state), responses, preset, 0, 'detailed'));

  for (let tick = 1; tick <= ALIEN_LAKE_DURATION; tick += 1) {
    if (useWrapper && wrapper && tick < ALIEN_LAKE_REEXPAND_AT) applyRetainedPatch(state, expandExactWrapper(wrapper));
    if (useWrapper && wrapper && tick === ALIEN_LAKE_REEXPAND_AT) {
      applyRetainedPatch(state, expandExactWrapper(wrapper));
      events.push({ id: 'lake/resolution/reexpanded', tick, kind: 'resolution', title: 'The refuge opens back into detail', summary: 'A declared turbidity disturbance triggers exact re-expansion from retained member state.', causes: [wrapper.hash, 'scenario/turbidity-pulse'] });
    }
    const tracker = new AccountingTracker(tick, state, lakeIdentity, captureLakeAccounts);
    if (tick === 72) {
      introduceDaughter(state, tracker, tick);
      events.push({ id: 'lake/variation/amber-daughter', tick, kind: 'variation', title: 'A shifted response appears', summary: `A daughter band is displaced ${daughterShiftNm > 0 ? '+' : ''}${daughterShiftNm} nm and pays a higher operating cost.`, causes: ['named-draw/variation-0', 'biology/response/amber-window'] });
    }
    if (tick === ALIEN_LAKE_REEXPAND_AT) events.push({ id: 'lake/environment/turbidity', tick, kind: 'environment', title: 'The water column darkens', summary: 'A scripted turbidity pulse changes the field reaching deeper habitats; the provider spectrum itself remains pinned.', causes: [preset.id, 'scenario/turbidity-pulse'] });
    transformPopulations(state, tracker, responses, preset, tick);
    recycleAndTransport(state, tracker, tick);
    const accounting = tracker.finish(state);
    let resolution: LakeResolutionState = useWrapper && tick >= ALIEN_LAKE_WRAP_AT && tick < ALIEN_LAKE_REEXPAND_AT ? 'exact-wrapper' : useWrapper && tick >= ALIEN_LAKE_REEXPAND_AT ? 're-expanded' : 'detailed';
    if (useWrapper && tick >= ALIEN_LAKE_WRAP_AT && tick < ALIEN_LAKE_REEXPAND_AT) {
      const retained = retainedPatch(state, 'lake/sediment-refuge');
      wrapper = compileExactWrapper({
        id: 'wrapper/alien-lake-sediment-refuge', version: '0.1.0', wrappedAt: tick,
        sourceCheckpointHash: snapshots[snapshots.length - 1].stateHash,
        memberIds: [retained.patch.id, ...retained.populations.map(({ id }) => id)].sort(),
        boundary: boundaryFor(retained), retainedState: retained,
        exactResumeTriggers: ['scenario/turbidity-pulse', 'boundary/observable-error']
      });
      if (tick === ALIEN_LAKE_WRAP_AT) events.push({ id: 'lake/resolution/wrapped', tick, kind: 'resolution', title: 'The stable refuge becomes one boundary', summary: 'The UI may treat the sediment network as one higher-order node while exact member state remains retained.', causes: [wrapper.hash, 'policy/exact-retained-state-v1'] });
    }
    snapshots.push(snapshot(state, accounting, responses, preset, tick, resolution));
  }

  const accounting = validateAccountingFrames(snapshots.map(({ accounting: frame }) => frame));
  const responseHashes = [...responses.values()].map(({ hash }) => hash).sort();
  const finalStateHash = snapshots[snapshots.length - 1].stateHash;
  const canonical = {
    schemaVersion: ALIEN_LAKE_SCHEMA,
    seed, spectrumId: preset.id, providerReference: preset.value.source.reference,
    habitatGraphHash: ALIEN_LAKE_HABITAT_GRAPH.hash, responseHashes, daughterShiftNm,
    snapshotHashes: snapshots.map(({ stateHash }) => stateHash),
    eventIds: events.map(({ id }) => id), accounting, finalStateHash
  };
  return {
    schemaVersion: ALIEN_LAKE_SCHEMA,
    seed, spectrumId: preset.id, spectrumLabel: preset.label, providerReference: preset.value.source.reference,
    habitatGraphHash: ALIEN_LAKE_HABITAT_GRAPH.hash, responseHashes, daughterShiftNm,
    snapshots, events, accounting, finalStateHash,
    runHash: stableChecksum('alien-lake-run/v1', canonical),
    ...(wrapper ? { lastWrapper: wrapper } : {})
  };
}

function finalObservables(run: AlienLakeRun): Record<string, number> {
  const final = run.snapshots[run.snapshots.length - 1];
  return {
    biomass: final.totalBiomassMinor,
    nutrient: final.totalNutrientMinor,
    detritus: final.totalDetritusMinor,
    populations: final.patches.reduce((sum, patch) => sum + patch.populations.length, 0)
  };
}

export function createAlienLakeExperiment(
  seed = ALIEN_LAKE_DEFAULT_SEED,
  spectrumId = ALIEN_LAKE_DEFAULT_SPECTRUM
): AlienLakeExperimentResult {
  const preset = spectrumPreset(spectrumId);
  const detailedControl = simulate(seed, preset, false);
  const wrapped = simulate(seed, preset, true);
  const observableDistances = compareContractObservables(finalObservables(detailedControl), finalObservables(wrapped), { biomass: 0, nutrient: 0, detritus: 0, populations: 0 });
  const alternate = EXOBIOLOGY_SPECTRAL_PRESETS.find(({ id }) => id !== spectrumId)!;
  const firstResponse = ALIEN_LAKE_BASE_RESPONSES[0];
  const secondResponse = ALIEN_LAKE_BASE_RESPONSES[1];
  const baselineProjection = evaluateResponseFunction(firstResponse, patchField(preset, 'lake/surface', 0));
  const alternateProjection = evaluateResponseFunction(firstResponse, patchField(alternate, 'lake/surface', 0));
  const secondProjection = evaluateResponseFunction(secondResponse, patchField(preset, 'lake/surface', 0));
  return {
    run: wrapped,
    detailedControl,
    scaleProof: {
      wrapperId: 'wrapper/alien-lake-sediment-refuge',
      wrappedAt: ALIEN_LAKE_WRAP_AT,
      reexpandedAt: ALIEN_LAKE_REEXPAND_AT,
      retainedMemberCount: wrapped.lastWrapper?.memberIds.length ?? 0,
      exactResume: detailedControl.finalStateHash === wrapped.finalStateHash && observableDistances.every(({ passed }) => passed),
      finalDetailedHash: detailedControl.finalStateHash,
      finalWrappedHash: wrapped.finalStateHash,
      observableDistances,
      limitations: [
        'The wrapper retains and advances exact member state; this is not yet a compute-saving coarse model.',
        'No information-discarding reconstruction or adaptive resolution policy is implemented.'
      ]
    },
    spectrumCounterfactual: {
      responseId: firstResponse.id,
      baselineSpectrumId: preset.id,
      alternateSpectrumId: alternate.id,
      baselineAccessibleWm2: baselineProjection.accessible,
      alternateAccessibleWm2: alternateProjection.accessible
    },
    responseCounterfactual: {
      spectrumId: preset.id,
      firstResponseId: firstResponse.id,
      secondResponseId: secondResponse.id,
      firstAccessibleWm2: baselineProjection.accessible,
      secondAccessibleWm2: secondProjection.accessible
    }
  };
}

export const ALIEN_LAKE_SPECTRUM_OPTIONS = Object.freeze(EXOBIOLOGY_SPECTRAL_PRESETS.map(({ id, label, summary }) => ({ id, label, summary })));
