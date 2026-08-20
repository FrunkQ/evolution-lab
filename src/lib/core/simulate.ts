import { createRng, deriveSeed } from './rng';
import { DEFAULT_CONFIG, LINEAGES } from './scenario';
import { scriptedMicrocosmEnvironment } from './environment';
import type {
  EnvironmentProvider,
  FlowRecord,
  PopulationState,
  ResourceLedger,
  SignatureState,
  SimulationConfig,
  SimulationEvent,
  SimulationRun,
  WorldSnapshot
} from './types';

const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, minimum = 0, maximum = Number.POSITIVE_INFINITY) =>
  Math.max(minimum, Math.min(maximum, value));

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

export function simulate(
  seed = 'fish-and-strawberries',
  config: SimulationConfig = DEFAULT_CONFIG,
  environment: EnvironmentProvider = scriptedMicrocosmEnvironment
): SimulationRun {
  const seedPath = ['evolution', 'microbial-flask', 'ecology-v1'];
  const scopedSeed = deriveSeed(seed, ...seedPath);
  const rng = createRng(scopedSeed);
  const variation = 0.94 + rng() * 0.12;
  const resources: ResourceLedger = {
    light: 74,
    carbon: 190,
    minerals: 145,
    oxygen: 1.2,
    detritus: 5
  };
  const signatures: SignatureState = {
    oxygenation: 0,
    oxidizedMinerals: 0,
    organicSediment: 0
  };
  const populations = new Map<string, PopulationState>([
    ['basal-loop', population('basal-loop', 10, true)],
    ['light-weavers', population('light-weavers', 0)],
    ['silt-recyclers', population('silt-recyclers', 0)],
    ['veil-grazers', population('veil-grazers', 0)]
  ]);
  const snapshots: WorldSnapshot[] = [];
  const events: SimulationEvent[] = [
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

  let phototrophActive = false;
  let recyclerActive = false;
  let grazerActive = false;

  for (let tick = 0; tick <= config.duration; tick += 1) {
    const tickEvents: SimulationEvent[] = events.filter((item) => item.tick === tick);
    const flows: FlowRecord[] = [];
    const environmentFrame = environment.frameAt(tick, config);
    resources.light = clamp(environmentFrame.light, 0, 100);
    resources.minerals += environmentFrame.inflows.minerals ?? 0;
    resources.carbon += environmentFrame.inflows.carbon ?? 0;
    resources.oxygen += environmentFrame.inflows.oxygen ?? 0;
    resources.detritus += environmentFrame.inflows.detritus ?? 0;
    events.push(...environmentFrame.events);
    tickEvents.push(...environmentFrame.events);

    const basal = populations.get('basal-loop')!;
    const basalLimit = Math.min(resources.carbon / 32, resources.minerals / 26, 1);
    const basalGrowth = basal.biomass * 0.022 * basalLimit * variation;
    const basalMaintenance = basal.biomass * 0.009;
    basal.productivity = basalGrowth - basalMaintenance;
    basal.stress = clamp(1 - basalLimit, 0, 1);
    basal.biomass = clamp(basal.biomass + basal.productivity, 0.05, 70);
    resources.carbon = clamp(resources.carbon - basalGrowth * 0.6 + basalMaintenance * 0.18);
    resources.minerals = clamp(resources.minerals - basalGrowth * 0.42);
    resources.detritus += basalMaintenance * 0.75;
    flows.push({ source: 'Minerals', target: basal.lineageId, amount: basalGrowth * 0.42, resource: 'reduced compounds', color: '#a7b8ca' });
    flows.push({ source: basal.lineageId, target: 'Detritus', amount: basalMaintenance * 0.75, resource: 'dead biomass', color: '#b98e62' });

    if (!phototrophActive && tick >= 24 && basal.biomass > 12) {
      phototrophActive = true;
      const phototroph = populations.get('light-weavers')!;
      phototroph.active = true;
      phototroph.biomass = 1.4;
      const innovation = event(
        'light-harvesting',
        tick,
        'innovation',
        'Light harvesting opens a new energy market',
        'A pigment-bearing branch gains first access to the habitat’s strongest energy gradient.',
        ['abundant light', 'carbon availability', 'pigment innovation'],
        ['basal-loop', 'light-weavers']
      );
      events.push(innovation);
      tickEvents.push(innovation);
    }

    const phototroph = populations.get('light-weavers')!;
    if (phototroph.active) {
      const lightLimit = resources.light / 76;
      const mineralLimit = resources.minerals / (resources.minerals + 26);
      const carbonLimit = resources.carbon / (resources.carbon + 28);
      const photoLimit = Math.min(lightLimit, mineralLimit * 1.9, carbonLimit * 1.8, 1.15);
      const photoGrowth = phototroph.biomass * 0.048 * photoLimit * variation;
      const photoMaintenance = phototroph.biomass * 0.011;
      phototroph.productivity = photoGrowth - photoMaintenance;
      phototroph.stress = clamp(1 - photoLimit, 0, 1);
      phototroph.biomass = clamp(phototroph.biomass + phototroph.productivity, 0.03, 155);
      resources.carbon = clamp(resources.carbon - photoGrowth * 0.72 + photoMaintenance * 0.12);
      resources.minerals = clamp(resources.minerals - photoGrowth * 0.24);
      resources.oxygen = clamp(resources.oxygen + photoGrowth * 0.82 - photoMaintenance * 0.09, 0, 240);
      resources.detritus += photoMaintenance * 0.78;
      flows.push({ source: 'Light', target: phototroph.lineageId, amount: photoGrowth * 0.9, resource: 'radiant energy', color: '#ffe078' });
      flows.push({ source: phototroph.lineageId, target: 'Oxygen', amount: photoGrowth * 0.82, resource: 'reactive waste', color: '#78c8ff' });
      flows.push({ source: phototroph.lineageId, target: 'Detritus', amount: photoMaintenance * 0.78, resource: 'dead biomass', color: '#b98e62' });
    }

    if (!recyclerActive && tick >= 63 && resources.detritus > 9) {
      recyclerActive = true;
      const recycler = populations.get('silt-recyclers')!;
      recycler.active = true;
      recycler.biomass = 1.1;
      const innovation = event(
        'detritus-recycling',
        tick,
        'innovation',
        'Death becomes a living resource',
        'A sediment guild begins reclaiming nutrients from accumulated remains.',
        ['persistent detritus', 'oxidant availability', 'sediment habitat'],
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
      const recycleMaintenance = recycler.biomass * 0.008;
      const consumed = Math.min(resources.detritus, recycleRate);
      recycler.productivity = consumed * 0.44 - recycleMaintenance;
      recycler.stress = clamp(1 - detritusLimit, 0, 1);
      recycler.biomass = clamp(recycler.biomass + recycler.productivity, 0.04, 80);
      resources.detritus = clamp(resources.detritus - consumed + recycleMaintenance * 0.72);
      resources.oxygen = clamp(resources.oxygen - consumed * 0.18);
      resources.minerals = clamp(resources.minerals + consumed * 0.34, 0, 250);
      resources.carbon = clamp(resources.carbon + consumed * 0.2, 0, 260);
      flows.push({ source: 'Detritus', target: recycler.lineageId, amount: consumed, resource: 'organic remains', color: '#d4a46c' });
      flows.push({ source: recycler.lineageId, target: 'Minerals', amount: consumed * 0.34, resource: 'recycled nutrients', color: '#9bc2a5' });
    }

    if (!grazerActive && tick >= 126 && phototroph.biomass > 34) {
      grazerActive = true;
      const grazer = populations.get('veil-grazers')!;
      grazer.active = true;
      grazer.biomass = 0.8;
      const innovation = event(
        'direct-grazing',
        tick,
        'innovation',
        'The producer monopoly ends',
        'Motile cells begin consuming light harvesters directly, creating the first predator–prey cycle.',
        ['dense producer veil', 'directed motility', 'membrane recognition'],
        ['light-weavers', 'veil-grazers']
      );
      events.push(innovation);
      tickEvents.push(innovation);
    }

    const grazer = populations.get('veil-grazers')!;
    if (grazer.active) {
      const preyLimit = phototroph.biomass / (phototroph.biomass + 24);
      const grazing = Math.min(phototroph.biomass * 0.055, grazer.biomass * 0.072 * preyLimit);
      const grazerMaintenance = grazer.biomass * 0.017;
      grazer.productivity = grazing * 0.38 - grazerMaintenance;
      grazer.stress = clamp(1 - preyLimit, 0, 1);
      grazer.biomass = clamp(grazer.biomass + grazer.productivity, 0.02, 52);
      phototroph.biomass = clamp(phototroph.biomass - grazing, 0.03);
      resources.detritus += grazing * 0.46 + grazerMaintenance * 0.8;
      resources.oxygen = clamp(resources.oxygen - grazing * 0.14);
      flows.push({ source: phototroph.lineageId, target: grazer.lineageId, amount: grazing, resource: 'living biomass', color: '#ee897e' });
      flows.push({ source: grazer.lineageId, target: 'Detritus', amount: grazing * 0.46, resource: 'waste and remains', color: '#b98e62' });
    }

    const biologicalOxygenDemand =
      basal.biomass * 0.002 + recycler.biomass * 0.004 + grazer.biomass * 0.005;
    resources.oxygen = clamp(resources.oxygen - biologicalOxygenDemand);
    const oxidizedToday = Math.min(resources.oxygen * 0.0025, resources.minerals * 0.0015);
    signatures.oxidizedMinerals += oxidizedToday;
    signatures.oxygenation = resources.oxygen;
    signatures.organicSediment += resources.detritus * 0.0012;

    if (tick > 0 && tick % 52 === 0) {
      resources.carbon = clamp(resources.carbon + 10, 0, 260);
      resources.minerals = clamp(resources.minerals + 4, 0, 250);
    }

    const roundedPopulations = Array.from(populations.values()).map((item) => ({
      ...item,
      biomass: round(item.biomass),
      productivity: round(item.productivity),
      stress: round(item.stress)
    }));

    snapshots.push({
      tick,
      resources: Object.fromEntries(
        Object.entries(resources).map(([key, value]) => [key, round(value)])
      ) as ResourceLedger,
      populations: roundedPopulations,
      flows: flows.filter((flow) => flow.amount > 0.01).map((flow) => ({ ...flow, amount: round(flow.amount) })),
      signatures: {
        oxygenation: round(signatures.oxygenation),
        oxidizedMinerals: round(signatures.oxidizedMinerals),
        organicSediment: round(signatures.organicSediment)
      },
      events: [...tickEvents]
    });
  }

  return {
    seed,
    manifest: {
      masterSeed: seed,
      scopedSeed,
      seedPath,
      engineVersion: '0.1.0',
      schemaVersion: 'evolution-run/0.1',
      scenarioId: 'microbial-flask',
      environmentProvider: `${environment.id}@${environment.version}`
    },
    config,
    lineages: LINEAGES,
    snapshots,
    events
  };
}
