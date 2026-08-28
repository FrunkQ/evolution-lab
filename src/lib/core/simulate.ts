import { stableChecksum } from './canonical';
import {
  createMicrobialMatterAccountingTracker,
  fromCentiUnits,
  splitCentiUnits,
  toCentiUnits,
  type MaterialAccountingState
} from './accounting';
import { createRng, deriveSeed } from './rng';
import { DEFAULT_CONFIG, LINEAGES, MICROBIAL_SCENARIO_IDENTITY } from './scenario';
import { scriptedMicrocosmEnvironment } from './environment';
import { ENGINE_VERSION, RUN_SCHEMA_VERSION } from '../version';
import type {
  EnvironmentProvider,
  FlowRecord,
  LineageDefinition,
  MatterAccountingFrame,
  PopulationState,
  ResourceKey,
  ResourceLedger,
  SignatureState,
  SimulationCheckpoint,
  SimulationConfig,
  SimulationEvent,
  SimulationForkManifest,
  SimulationPerturbation,
  SimulationRun,
  WorldSnapshot
} from './types';

const round = (value: number) => Math.round(value * 100) / 100;
const clampRatio = (value: number) => Math.max(0, Math.min(1, value));

export const MICROBIAL_RUNTIME_PARAMETER_IDS = {
  lightWeaverGrowthRate: 'biology/light-weaver/growth-rate',
  lightWeaverMaintenanceRate: 'biology/light-weaver/maintenance-rate',
  lightWeaverLightHalfSaturation: 'biology/light-weaver/light-half-saturation'
} as const;

export const MICROBIAL_RUNTIME_PARAMETER_BASELINE = Object.freeze({
  [MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverGrowthRate]: 0.048,
  [MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverMaintenanceRate]: 0.011,
  [MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverLightHalfSaturation]: 76
});

function runtimeParameter(config: SimulationConfig, id: string, fallback: number): number {
  return config.runtimeParameters?.values[id] ?? fallback;
}

type MaterialResourceKey = Exclude<ResourceKey, 'light'>;

function population(lineageId: string, biomass: number, active = false): PopulationState {
  return { lineageId, biomass, productivity: 0, stress: 0, active };
}

function event(
  id: string,
  tick: number,
  kind: SimulationEvent['kind'],
  title: string,
  summary: string,
  causes: string[],
  affectedLineageIds: string[] = []
): SimulationEvent {
  return { id, tick, kind, title, summary, causes, affectedLineageIds };
}

function cloneEvent(source: SimulationEvent): SimulationEvent {
  return {
    ...source,
    causes: [...source.causes],
    affectedLineageIds: [...source.affectedLineageIds]
  };
}

function cloneLineage(source: LineageDefinition): LineageDefinition {
  return {
    ...source,
    vocabulary: { ...source.vocabulary },
    capabilities: source.capabilities.map((capability) => ({ ...capability }))
  };
}

function cloneAccounting(source: MatterAccountingFrame): MatterAccountingFrame {
  return {
    ...source,
    transactions: source.transactions.map((transaction) => ({
      ...transaction,
      postings: transaction.postings.map((posting) => ({ ...posting })),
      causes: [...transaction.causes]
    }))
  };
}

function cloneSnapshot(source: WorldSnapshot): WorldSnapshot {
  return {
    tick: source.tick,
    resources: { ...source.resources },
    populations: source.populations.map((item) => ({ ...item })),
    flows: source.flows.map((flow) => ({ ...flow })),
    signatures: { ...source.signatures },
    accounting: cloneAccounting(source.accounting),
    events: source.events.map(cloneEvent)
  };
}

function manifestFor(
  seed: string,
  config: SimulationConfig,
  environment: EnvironmentProvider
): SimulationRun['manifest'] {
  const seedPath = ['evolution', 'microbial-flask', 'ecology-v2-accounted'];
  return {
    masterSeed: seed,
    scopedSeed: deriveSeed(seed, ...seedPath),
    seedPath,
    engineVersion: ENGINE_VERSION,
    schemaVersion: RUN_SCHEMA_VERSION,
    scenarioId: MICROBIAL_SCENARIO_IDENTITY,
    environmentProvider: `${environment.id}@${environment.version}`,
    configHash: stableChecksum('simulation-config-v1', config),
    providerInput: config.providerInput ? { ...config.providerInput } : undefined
  };
}

interface SimulationStart {
  checkpoint?: SimulationCheckpoint;
  fork?: SimulationForkManifest;
}

export function validateSimulationConfig(config: SimulationConfig): void {
  const integerFields = [
    ['duration', config.duration],
    ['nutrientPulseAt', config.nutrientPulseAt],
    ['shadowStartsAt', config.shadowStartsAt],
    ['shadowEndsAt', config.shadowEndsAt]
  ] as const;
  for (const [label, value] of integerFields) {
    if (!Number.isInteger(value) || value < 0) throw new Error('Simulation config ' + label + ' must be a non-negative integer.');
  }
  if (config.shadowEndsAt < config.shadowStartsAt) throw new Error('Simulation shadow must end on or after it starts.');
  if (!Number.isFinite(config.shadowLightFraction) || config.shadowLightFraction < 0 || config.shadowLightFraction > 1) {
    throw new Error('Simulation shadowLightFraction must be between 0 and 1.');
  }
  const optionalNonNegative = [
    ['meanUsableLight', config.meanUsableLight],
    ['lightCycleAmplitude', config.lightCycleAmplitude]
  ] as const;
  for (const [label, value] of optionalNonNegative) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new Error('Simulation config ' + label + ' must be finite and non-negative.');
    }
  }
  if (config.lightCycleDays !== undefined && (!Number.isFinite(config.lightCycleDays) || config.lightCycleDays <= 0)) {
    throw new Error('Simulation config lightCycleDays must be finite and positive.');
  }
  if (config.providerInput && (!config.providerInput.profileId.trim() || !config.providerInput.profileVersion.trim() || !config.providerInput.fixtureHash.trim())) {
    throw new Error('Simulation provider input identity must be complete.');
  }
  if (config.runtimeParameters) {
    const parameters = config.runtimeParameters;
    if (
      parameters.schemaVersion !== 'evolution-runtime-parameters/0.1' ||
      !parameters.specId.trim() ||
      !parameters.specVersion.trim() ||
      !parameters.specHash.trim() ||
      !parameters.candidateHash.trim()
    ) {
      throw new Error('Simulation runtime parameter identity must be complete.');
    }
    if (Object.values(parameters.values).some((value) => !Number.isFinite(value))) {
      throw new Error('Simulation runtime parameter values must be finite.');
    }
    for (const id of Object.values(MICROBIAL_RUNTIME_PARAMETER_IDS)) {
      const value = parameters.values[id];
      if (value !== undefined && value <= 0) {
        throw new Error(`Simulation runtime parameter ${id} must be positive.`);
      }
    }
  }
}

function addResource(resources: ResourceLedger, key: MaterialResourceKey, deltaMinorUnits: number): void {
  const next = toCentiUnits(resources[key]) + deltaMinorUnits;
  if (next < 0) throw new Error(`Material transaction would make ${key} negative.`);
  resources[key] = fromCentiUnits(next);
}

function addBiomass(populationState: PopulationState, deltaMinorUnits: number): void {
  const next = toCentiUnits(populationState.biomass) + deltaMinorUnits;
  if (next < 0) throw new Error(`Material transaction would make ${populationState.lineageId} biomass negative.`);
  populationState.biomass = fromCentiUnits(next);
  if (next === 0) populationState.active = false;
}

function addDeposit(signatures: SignatureState, key: 'oxidizedMinerals' | 'organicSediment', deltaMinorUnits: number): void {
  const next = toCentiUnits(signatures[key]) + deltaMinorUnits;
  if (next < 0) throw new Error(`Material transaction would make ${key} negative.`);
  signatures[key] = fromCentiUnits(next);
}

function boundedCentiUnits(candidate: number, fits: (amount: number) => boolean): number {
  let amount = Math.max(0, Math.floor(candidate));
  while (amount > 0 && !fits(amount)) amount -= 1;
  return amount;
}

function runSimulation(
  seed: string,
  config: SimulationConfig,
  environment: EnvironmentProvider,
  start: SimulationStart = {}
): SimulationRun {
  validateSimulationConfig(config);
  const manifest = manifestFor(seed, config, environment);
  const rng = createRng(manifest.scopedSeed);
  const variation = 0.94 + rng() * 0.12;
  const checkpointSnapshot = start.checkpoint?.snapshots.at(-1);
  const resources: ResourceLedger = checkpointSnapshot
    ? { ...checkpointSnapshot.resources }
    : { light: 74, carbon: 190, minerals: 145, oxygen: 1.2, detritus: 5 };
  const signatures: SignatureState = checkpointSnapshot
    ? { ...checkpointSnapshot.signatures }
    : { oxygenation: 0, oxidizedMinerals: 0, organicSediment: 0 };
  const populations = new Map<string, PopulationState>(
    checkpointSnapshot
      ? checkpointSnapshot.populations.map((item) => [item.lineageId, { ...item }])
      : [
          ['basal-loop', population('basal-loop', 10, true)],
          ['light-weavers', population('light-weavers', 0)],
          ['silt-recyclers', population('silt-recyclers', 0)],
          ['veil-grazers', population('veil-grazers', 0)]
        ]
  );
  const accountingState: MaterialAccountingState = { resources, populations, signatures };
  const snapshots: WorldSnapshot[] = start.checkpoint
    ? start.checkpoint.snapshots.map(cloneSnapshot)
    : [];
  const events: SimulationEvent[] = start.checkpoint
    ? start.checkpoint.events.map(cloneEvent)
    : [
        event(
          'microcosm-begins',
          0,
          'origin',
          'The warm film is seeded',
          'Basal chemical replicators enter a carbon-rich mineral film.',
          ['Liquid connectivity', 'reduced minerals', 'available carbon'],
          ['basal-loop']
        )
      ];
  const lineages = (start.checkpoint?.lineages ?? LINEAGES).map(cloneLineage);
  let phototrophActive = populations.get('light-weavers')?.active ?? false;
  let recyclerActive = populations.get('silt-recyclers')?.active ?? false;
  let grazerActive = populations.get('veil-grazers')?.active ?? false;
  const firstTick = start.checkpoint ? start.checkpoint.tick + 1 : 0;

  for (let tick = firstTick; tick <= config.duration; tick += 1) {
    const tickEvents: SimulationEvent[] = events.filter((item) => item.tick === tick);
    const flows: FlowRecord[] = [];
    const accounting = createMicrobialMatterAccountingTracker(tick, accountingState);
    const environmentFrame = environment.frameAt(tick, config);
    resources.light = round(environmentFrame.light);
    const inflowCentiUnits = {
      carbon: toCentiUnits(environmentFrame.inflows.carbon ?? 0),
      minerals: toCentiUnits(environmentFrame.inflows.minerals ?? 0),
      oxygen: toCentiUnits(environmentFrame.inflows.oxygen ?? 0),
      detritus: toCentiUnits(environmentFrame.inflows.detritus ?? 0)
    };
    const totalInflow = Object.values(inflowCentiUnits).reduce((sum, value) => sum + value, 0);
    if (totalInflow > 0) {
      accounting.record(
        accountingState,
        {
          id: `environment/import/${tick}`,
          kind: 'boundary-import',
          label: 'Scripted provider material inflow',
          boundaryDeltaMinorUnits: totalInflow,
          causes: environmentFrame.events.map(({ id }) => id).length
            ? environmentFrame.events.map(({ id }) => id)
            : ['scripted-periodic-boundary']
        },
        () => {
          for (const key of Object.keys(inflowCentiUnits) as MaterialResourceKey[]) {
            addResource(resources, key, inflowCentiUnits[key]);
          }
        }
      );
    }
    events.push(...environmentFrame.events.map(cloneEvent));
    tickEvents.push(...environmentFrame.events.map(cloneEvent));

    const basal = populations.get('basal-loop')!;
    const basalLimit = Math.min(resources.carbon / 32, resources.minerals / 26, 1);
    const basalMaintenance = Math.min(toCentiUnits(basal.biomass), toCentiUnits(basal.biomass * 0.009));
    const basalCapacity = Math.max(0, 7000 - toCentiUnits(basal.biomass) + basalMaintenance);
    const basalCandidate = Math.min(
      basalCapacity,
      toCentiUnits(basal.biomass * 0.022 * basalLimit * variation)
    );
    const basalGrowth = boundedCentiUnits(basalCandidate, (amount) => {
      const [carbon, minerals] = splitCentiUnits(amount, [60, 40]);
      return carbon <= toCentiUnits(resources.carbon) && minerals <= toCentiUnits(resources.minerals);
    });
    const [basalCarbon, basalMinerals] = splitCentiUnits(basalGrowth, [60, 40]);
    const [basalDetritus, basalReturnCarbon, basalReturnMinerals] = splitCentiUnits(basalMaintenance, [75, 18, 7]);
    accounting.record(
      accountingState,
      {
        id: `metabolism/basal-loop/${tick}`,
        kind: 'transformation',
        label: 'Basal growth and maintenance',
        causes: ['capability/chemotrophy', 'resource/carbon', 'resource/minerals']
      },
      () => {
        addBiomass(basal, basalGrowth - basalMaintenance);
        addResource(resources, 'carbon', -basalCarbon + basalReturnCarbon);
        addResource(resources, 'minerals', -basalMinerals + basalReturnMinerals);
        addResource(resources, 'detritus', basalDetritus);
      }
    );
    basal.productivity = fromCentiUnits(basalGrowth - basalMaintenance);
    basal.stress = round(clampRatio(1 - basalLimit));
    flows.push({ source: 'Minerals', target: basal.lineageId, amount: fromCentiUnits(basalMinerals), resource: 'reduced compounds', color: '#a7b8ca' });
    flows.push({ source: basal.lineageId, target: 'Detritus', amount: fromCentiUnits(basalDetritus), resource: 'dead biomass', color: '#b98e62' });

    if (!phototrophActive && tick >= 24 && basal.biomass > 12) {
      const seedBiomass = Math.min(140, toCentiUnits(basal.biomass));
      const phototroph = populations.get('light-weavers')!;
      accounting.record(
        accountingState,
        {
          id: `lineage/light-weavers/${tick}`,
          kind: 'transfer',
          label: 'Light-weaver founder split',
          causes: ['lineage/basal-loop', 'innovation/light-harvesting']
        },
        () => {
          addBiomass(basal, -seedBiomass);
          phototroph.active = true;
          addBiomass(phototroph, seedBiomass);
        }
      );
      phototrophActive = seedBiomass > 0;
      const innovation = event(
        'light-harvesting',
        tick,
        'innovation',
        'Light harvesting opens a new energy market',
        'A pigment-bearing branch gains first access to the habitat’s strongest energy gradient.',
        ['abundant light', 'carbon availability', 'pigment innovation', 'founder biomass transferred from basal-loop'],
        ['basal-loop', 'light-weavers']
      );
      events.push(innovation);
      tickEvents.push(innovation);
    }

    const phototroph = populations.get('light-weavers')!;
    if (phototroph.active) {
      const lightHalfSaturation = runtimeParameter(
        config,
        MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverLightHalfSaturation,
        MICROBIAL_RUNTIME_PARAMETER_BASELINE[MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverLightHalfSaturation]
      );
      const maintenanceRate = runtimeParameter(
        config,
        MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverMaintenanceRate,
        MICROBIAL_RUNTIME_PARAMETER_BASELINE[MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverMaintenanceRate]
      );
      const growthRate = runtimeParameter(
        config,
        MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverGrowthRate,
        MICROBIAL_RUNTIME_PARAMETER_BASELINE[MICROBIAL_RUNTIME_PARAMETER_IDS.lightWeaverGrowthRate]
      );
      const lightLimit = resources.light / lightHalfSaturation;
      const mineralLimit = resources.minerals / (resources.minerals + 26);
      const carbonLimit = resources.carbon / (resources.carbon + 28);
      const photoLimit = Math.min(lightLimit, mineralLimit * 1.9, carbonLimit * 1.8, 1.15);
      const photoMaintenance = Math.min(toCentiUnits(phototroph.biomass), toCentiUnits(phototroph.biomass * maintenanceRate));
      const photoCapacity = Math.max(0, 15500 - toCentiUnits(phototroph.biomass) + photoMaintenance);
      const photoCandidate = Math.min(
        photoCapacity,
        toCentiUnits(phototroph.biomass * growthRate * photoLimit * variation)
      );
      const photoStoichiometry = (growth: number) => {
        const oxygen = Math.round(growth * 0.82);
        const minerals = Math.round(growth * 0.24);
        const carbon = growth + oxygen - minerals;
        return { carbon, minerals, oxygen };
      };
      const photoGrowth = boundedCentiUnits(photoCandidate, (amount) => {
        const requirement = photoStoichiometry(amount);
        return requirement.carbon <= toCentiUnits(resources.carbon) && requirement.minerals <= toCentiUnits(resources.minerals);
      });
      const photoMatter = photoStoichiometry(photoGrowth);
      const [photoDetritus, photoReturnCarbon, photoReturnMinerals] = splitCentiUnits(photoMaintenance, [78, 12, 10]);
      accounting.record(
        accountingState,
        {
          id: `metabolism/light-weavers/${tick}`,
          kind: 'transformation',
          label: 'Light-weaver growth and maintenance',
          causes: ['capability/light-harvesting', 'field/usable-light', 'resource/carbon', 'resource/minerals']
        },
        () => {
          addBiomass(phototroph, photoGrowth - photoMaintenance);
          addResource(resources, 'carbon', -photoMatter.carbon + photoReturnCarbon);
          addResource(resources, 'minerals', -photoMatter.minerals + photoReturnMinerals);
          addResource(resources, 'oxygen', photoMatter.oxygen);
          addResource(resources, 'detritus', photoDetritus);
        }
      );
      phototroph.productivity = fromCentiUnits(photoGrowth - photoMaintenance);
      phototroph.stress = round(clampRatio(1 - photoLimit));
      flows.push({ source: 'Light', target: phototroph.lineageId, amount: round(fromCentiUnits(photoGrowth) * 0.9), resource: 'radiant energy', color: '#ffe078' });
      flows.push({ source: phototroph.lineageId, target: 'Oxygen', amount: fromCentiUnits(photoMatter.oxygen), resource: 'reactive waste', color: '#78c8ff' });
      flows.push({ source: phototroph.lineageId, target: 'Detritus', amount: fromCentiUnits(photoDetritus), resource: 'dead biomass', color: '#b98e62' });
    }

    if (!recyclerActive && tick >= 63 && resources.detritus > 9) {
      const seedBiomass = Math.min(110, toCentiUnits(basal.biomass));
      const recycler = populations.get('silt-recyclers')!;
      accounting.record(
        accountingState,
        {
          id: `lineage/silt-recyclers/${tick}`,
          kind: 'transfer',
          label: 'Silt-recycler founder split',
          causes: ['lineage/basal-loop', 'innovation/detritus-recycling']
        },
        () => {
          addBiomass(basal, -seedBiomass);
          recycler.active = true;
          addBiomass(recycler, seedBiomass);
        }
      );
      recyclerActive = seedBiomass > 0;
      const innovation = event(
        'detritus-recycling',
        tick,
        'innovation',
        'Death becomes a living resource',
        'A sediment guild begins reclaiming nutrients from accumulated remains.',
        ['persistent detritus', 'oxidant availability', 'sediment habitat', 'founder biomass transferred from basal-loop'],
        ['silt-recyclers']
      );
      events.push(innovation);
      tickEvents.push(innovation);
    }

    const recycler = populations.get('silt-recyclers')!;
    if (recycler.active) {
      const detritusLimit = resources.detritus / (resources.detritus + 14);
      const oxygenLimit = resources.oxygen / (resources.oxygen + 12);
      const recycleRate = recycler.biomass * 0.056 * Math.min(detritusLimit * 1.8, oxygenLimit * 1.7, 1);
      const recycleMaintenance = Math.min(toCentiUnits(recycler.biomass), toCentiUnits(recycler.biomass * 0.008));
      const consumed = Math.min(toCentiUnits(resources.detritus), toCentiUnits(recycleRate));
      const [recycledBiomass, recycledMinerals, recycledCarbon, recycledSediment] = splitCentiUnits(consumed, [44, 34, 20, 2]);
      const oxygenUse = Math.min(toCentiUnits(resources.oxygen), Math.round(consumed * 0.18));
      const [recycleDetritus, recycleReturnCarbon, recycleReturnMinerals] = splitCentiUnits(recycleMaintenance, [72, 20, 8]);
      accounting.record(
        accountingState,
        {
          id: `metabolism/silt-recyclers/${tick}`,
          kind: 'transformation',
          label: 'Detritus recycling and maintenance',
          causes: ['capability/detritivory', 'resource/detritus', 'resource/oxygen']
        },
        () => {
          addResource(resources, 'detritus', -consumed + recycleDetritus);
          addBiomass(recycler, recycledBiomass - recycleMaintenance);
          addResource(resources, 'minerals', recycledMinerals + recycleReturnMinerals);
          addResource(resources, 'carbon', recycledCarbon + recycleReturnCarbon);
          addDeposit(signatures, 'organicSediment', recycledSediment);
          addResource(resources, 'oxygen', -oxygenUse);
          addDeposit(signatures, 'oxidizedMinerals', oxygenUse);
        }
      );
      recycler.productivity = fromCentiUnits(recycledBiomass - recycleMaintenance);
      recycler.stress = round(clampRatio(1 - detritusLimit));
      flows.push({ source: 'Detritus', target: recycler.lineageId, amount: fromCentiUnits(consumed), resource: 'organic remains', color: '#d4a46c' });
      flows.push({ source: recycler.lineageId, target: 'Minerals', amount: fromCentiUnits(recycledMinerals), resource: 'recycled nutrients', color: '#9bc2a5' });
    }

    if (!grazerActive && tick >= 126 && phototroph.biomass > 34) {
      const seedBiomass = Math.min(80, toCentiUnits(phototroph.biomass));
      const grazer = populations.get('veil-grazers')!;
      accounting.record(
        accountingState,
        {
          id: `lineage/veil-grazers/${tick}`,
          kind: 'transfer',
          label: 'Veil-grazer founder split',
          causes: ['lineage/light-weavers', 'innovation/direct-grazing']
        },
        () => {
          addBiomass(phototroph, -seedBiomass);
          grazer.active = true;
          addBiomass(grazer, seedBiomass);
        }
      );
      grazerActive = seedBiomass > 0;
      const innovation = event(
        'direct-grazing',
        tick,
        'innovation',
        'The producer monopoly ends',
        'Motile cells begin consuming light harvesters directly, creating the first predator–prey cycle.',
        ['dense producer veil', 'directed motility', 'membrane recognition', 'founder biomass transferred from light-weavers'],
        ['light-weavers', 'veil-grazers']
      );
      events.push(innovation);
      tickEvents.push(innovation);
    }

    const grazer = populations.get('veil-grazers')!;
    if (grazer.active) {
      const preyLimit = phototroph.biomass / (phototroph.biomass + 24);
      const grazing = Math.min(
        toCentiUnits(phototroph.biomass * 0.055),
        toCentiUnits(grazer.biomass * 0.072 * preyLimit)
      );
      const grazerMaintenance = Math.min(toCentiUnits(grazer.biomass), toCentiUnits(grazer.biomass * 0.017));
      const [grazerGrowth, grazerDetritus, grazerCarbon, grazerMinerals] = splitCentiUnits(grazing, [38, 46, 12, 4]);
      const [grazerMaintenanceDetritus, grazerMaintenanceCarbon, grazerMaintenanceMinerals] = splitCentiUnits(grazerMaintenance, [80, 15, 5]);
      const grazerOxygenUse = Math.min(toCentiUnits(resources.oxygen), Math.round(grazing * 0.14));
      accounting.record(
        accountingState,
        {
          id: `metabolism/veil-grazers/${tick}`,
          kind: 'transformation',
          label: 'Grazing and maintenance',
          causes: ['capability/grazing', 'population/light-weavers', 'resource/oxygen']
        },
        () => {
          addBiomass(phototroph, -grazing);
          addBiomass(grazer, grazerGrowth - grazerMaintenance);
          addResource(resources, 'detritus', grazerDetritus + grazerMaintenanceDetritus);
          addResource(resources, 'carbon', grazerCarbon + grazerMaintenanceCarbon);
          addResource(resources, 'minerals', grazerMinerals + grazerMaintenanceMinerals);
          addResource(resources, 'oxygen', -grazerOxygenUse);
          addDeposit(signatures, 'oxidizedMinerals', grazerOxygenUse);
        }
      );
      grazer.productivity = fromCentiUnits(grazerGrowth - grazerMaintenance);
      grazer.stress = round(clampRatio(1 - preyLimit));
      flows.push({ source: phototroph.lineageId, target: grazer.lineageId, amount: fromCentiUnits(grazing), resource: 'living biomass', color: '#ee897e' });
      flows.push({ source: grazer.lineageId, target: 'Detritus', amount: fromCentiUnits(grazerDetritus + grazerMaintenanceDetritus), resource: 'waste and remains', color: '#b98e62' });
    }

    const biologicalOxygenDemand = toCentiUnits(
      basal.biomass * 0.002 + recycler.biomass * 0.004 + grazer.biomass * 0.005
    );
    const oxidizedToday = toCentiUnits(Math.min(resources.oxygen * 0.0025, resources.minerals * 0.0015));
    const oxygenToDeposit = Math.min(
      toCentiUnits(resources.oxygen),
      biologicalOxygenDemand + oxidizedToday
    );
    if (oxygenToDeposit > 0) {
      accounting.record(
        accountingState,
        {
          id: `environment/oxygen-deposition/${tick}`,
          kind: 'transformation',
          label: 'Reactive oxygen becomes persistent oxidized material',
          causes: ['biological oxygen demand', 'mineral oxidation']
        },
        () => {
          addResource(resources, 'oxygen', -oxygenToDeposit);
          addDeposit(signatures, 'oxidizedMinerals', oxygenToDeposit);
        }
      );
    }

    const buriedSediment = Math.min(
      toCentiUnits(resources.detritus),
      toCentiUnits(resources.detritus * 0.0012)
    );
    if (buriedSediment > 0) {
      accounting.record(
        accountingState,
        {
          id: `environment/sediment-burial/${tick}`,
          kind: 'transfer',
          label: 'Detritus becomes preserved organic sediment',
          causes: ['sediment settling', 'persistent detritus']
        },
        () => {
          addResource(resources, 'detritus', -buriedSediment);
          addDeposit(signatures, 'organicSediment', buriedSediment);
        }
      );
    }

    signatures.oxygenation = round(resources.oxygen);
    for (const item of populations.values()) {
      item.productivity = round(item.productivity);
      item.stress = round(item.stress);
    }

    snapshots.push({
      tick,
      resources: { ...resources },
      populations: Array.from(populations.values()).map((item) => ({ ...item })),
      flows: flows
        .filter((flow) => flow.amount > 0.01)
        .map((flow) => ({ ...flow, amount: round(flow.amount) })),
      signatures: { ...signatures },
      accounting: accounting.finish(accountingState),
      events: tickEvents.map(cloneEvent)
    });
  }

  return {
    seed,
    manifest,
    config: { ...config },
    lineages,
    snapshots,
    events,
    ...(start.fork ? { fork: { ...start.fork } } : {})
  };
}

export function simulate(
  seed = 'fish-and-strawberries',
  config: SimulationConfig = DEFAULT_CONFIG,
  environment: EnvironmentProvider = scriptedMicrocosmEnvironment
): SimulationRun {
  return runSimulation(seed, config, environment);
}

function checkpointPayload(checkpoint: Omit<SimulationCheckpoint, 'hash'>) {
  return checkpoint;
}

export function createSimulationCheckpoint(run: SimulationRun, tick: number): SimulationCheckpoint {
  if (!Number.isInteger(tick) || tick < 0 || tick > run.config.duration) {
    throw new Error('Checkpoint tick must be an integer inside the stored run.');
  }
  const snapshots = run.snapshots.filter((snapshot) => snapshot.tick <= tick).map(cloneSnapshot);
  if (snapshots.at(-1)?.tick !== tick) throw new Error(`Run has no stored snapshot for checkpoint day ${tick}.`);
  const withoutHash: Omit<SimulationCheckpoint, 'hash'> = {
    format: 'evolution-checkpoint/0.1',
    tick,
    seed: run.seed,
    manifest: { ...run.manifest, seedPath: [...run.manifest.seedPath] },
    config: { ...run.config },
    lineages: run.lineages.map(cloneLineage),
    snapshots,
    events: run.events.filter((item) => item.tick <= tick).map(cloneEvent)
  };
  return {
    ...withoutHash,
    hash: stableChecksum('evolution-checkpoint-v1', checkpointPayload(withoutHash))
  };
}

export function validateSimulationCheckpoint(checkpoint: SimulationCheckpoint): boolean {
  const { hash, ...withoutHash } = checkpoint;
  return hash === stableChecksum('evolution-checkpoint-v1', checkpointPayload(withoutHash));
}

export function resumeSimulation(
  checkpoint: SimulationCheckpoint,
  config: SimulationConfig = checkpoint.config,
  environment: EnvironmentProvider = scriptedMicrocosmEnvironment,
  fork?: SimulationForkManifest
): SimulationRun {
  if (!validateSimulationCheckpoint(checkpoint)) throw new Error('Checkpoint content hash does not match its stored state.');
  if (config.duration < checkpoint.tick) throw new Error('A resumed duration cannot end before its parent checkpoint.');
  if (`${environment.id}@${environment.version}` !== checkpoint.manifest.environmentProvider) {
    throw new Error('Checkpoint resume requires the pinned environment provider identity.');
  }
  return runSimulation(checkpoint.seed, config, environment, { checkpoint, fork });
}

export function forkSimulation(
  checkpoint: SimulationCheckpoint,
  perturbation: SimulationPerturbation,
  environment: EnvironmentProvider = scriptedMicrocosmEnvironment
): SimulationRun {
  if (perturbation.appliedAt !== checkpoint.tick + 1) {
    throw new Error('A fork perturbation must activate on the first day after its parent checkpoint.');
  }
  const perturbationHash = stableChecksum('simulation-perturbation-v1', perturbation);
  return resumeSimulation(checkpoint, perturbation.config, environment, {
    parentCheckpointHash: checkpoint.hash,
    role: perturbation.role,
    perturbationId: perturbation.id,
    perturbationVersion: perturbation.version,
    perturbationHash,
    appliedAt: perturbation.appliedAt,
    description: perturbation.description
  });
}
