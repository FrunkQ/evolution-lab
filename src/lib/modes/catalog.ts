import { MICROBIAL_SCENARIO_IDENTITY } from '../core/scenario';

export type ModeId = 'biology' | 'firstlife' | 'galaxy';
export type ModeLifecycle = 'live' | 'scaffold';

export interface ModeReleaseMetadata {
  version: string;
  lastUpdated: `${number}-${number}-${number}`;
  lifecycle: ModeLifecycle;
  statusLabel: string;
  currentFocus: string;
}

export interface ModeComposition {
  scenarioIdentity: string | null;
  providerIdentity: string | null;
  domainContentIdentity: string | null;
  presentationIdentity: string;
}

export interface InstalledMode {
  id: ModeId;
  route: `/${string}`;
  title: string;
  eyebrow: string;
  summary: string;
  release: ModeReleaseMetadata;
  composition: ModeComposition;
  intendedInputs: readonly string[];
  intendedOutputs: readonly string[];
  nextStep: string;
}

export type ResolvedRoute =
  | { kind: 'catalogue' }
  | { kind: 'mode'; mode: InstalledMode }
  | { kind: 'not-found'; pathname: string };

const modes: InstalledMode[] = [
  {
    id: 'biology',
    route: '/exobiology',
    title: 'Exobiology',
    eyebrow: 'Working experiment',
    summary:
      'An Earth-like microbial starting point used to explore plausible life beyond Earth through resource flows, environmental forcing and recorded events.',
    release: {
      version: '0.9.0',
      lastUpdated: '2026-08-28',
      lifecycle: 'live',
      statusLabel: 'Live prototype',
      currentFocus: 'Bounded candidate tuning with held-out deterministic review'
    },
    composition: {
      scenarioIdentity: MICROBIAL_SCENARIO_IDENTITY,
      providerIdentity: 'scripted-microbial-film@0.4.0',
      domainContentIdentity: 'evolution-lab/base-microbial@0.1.0',
      presentationIdentity: 'evolution-lab/exobiology-prototype@0.8.0'
    },
    intendedInputs: ['Master seed', 'Typed physical-input fixture', 'Scripted daily light and resource inflows'],
    intendedOutputs: ['Aggregate lineage biomass', 'Resource ledgers', 'Recorded causal events', 'Paired long-shadow feedback'],
    nextStep: 'Exercise the completed candidate boundary with the Alien Lake spectral and scale-recursion integration experiment.'
  },
  {
    id: 'firstlife',
    route: '/firstlife',
    title: 'First Life',
    eyebrow: 'Experiment scaffold',
    summary:
      'The route and experiment brief exist; an origin-of-life rulepack and provider-backed linked-habitat engine do not yet.',
    release: {
      version: '0.1.0',
      lastUpdated: '2026-08-25',
      lifecycle: 'scaffold',
      statusLabel: 'Scaffold · no simulation',
      currentFocus: 'Define the first reproducible linked-habitat fixture'
    },
    composition: {
      scenarioIdentity: null,
      providerIdentity: null,
      domainContentIdentity: null,
      presentationIdentity: 'evolution-lab/firstlife-scaffold@0.1.0'
    },
    intendedInputs: [
      'Linked habitat states and transport',
      'Accessible versus total resources',
      'Externally supplied catalytic capabilities',
      'A versioned seed and provider fixture'
    ],
    intendedOutputs: [
      'Competing proto-lineage histories',
      'Capability-dependency and autonomy evidence',
      'Checkpointed resource and lineage projections'
    ],
    nextStep:
      'Run one deterministic vent-network fixture with parallel solutions and reproducible checkpoints.'
  },
  {
    id: 'galaxy',
    route: '/galaxy',
    title: 'Galaxy',
    eyebrow: 'Experiment scaffold',
    summary:
      'A domain-neutrality target with no galactic state, rules, provider integration or simulation behind it yet.',
    release: {
      version: '0.1.0',
      lastUpdated: '2026-08-25',
      lifecycle: 'scaffold',
      statusLabel: 'Scaffold · no simulation',
      currentFocus: 'Specify a minimal merger-history contract without biology fields'
    },
    composition: {
      scenarioIdentity: null,
      providerIdentity: null,
      domainContentIdentity: null,
      presentationIdentity: 'evolution-lab/galaxy-scaffold@0.1.0'
    },
    intendedInputs: [
      'Provider-resolved galactic structures and environments',
      'Typed merger, stripping and accretion events',
      'Versioned domain rules and a master seed'
    ],
    intendedOutputs: [
      'Lineage/provenance projections for structures',
      'Resource and capability-network histories',
      'Recorded event and legacy projections'
    ],
    nextStep:
      'Demonstrate one non-biological typed split/merge history through the generic projection seam.'
  }
];

export function sortModesByRecent(modesToSort: readonly InstalledMode[]): InstalledMode[] {
  return [...modesToSort].sort(
    (left, right) =>
      right.release.lastUpdated.localeCompare(left.release.lastUpdated) ||
      left.id.localeCompare(right.id)
  );
}

export const INSTALLED_MODES = Object.freeze(sortModesByRecent(modes));

export function normalizePathname(pathname: string): string {
  const withoutQueryOrHash = pathname.split(/[?#]/, 1)[0] || '/';
  if (withoutQueryOrHash === '/') return '/';
  return withoutQueryOrHash.replace(/\/+$/, '') || '/';
}

export function resolveRoute(pathname: string): ResolvedRoute {
  const normalized = normalizePathname(pathname);
  if (normalized === '/') return { kind: 'catalogue' };

  const mode = INSTALLED_MODES.find((candidate) => candidate.route === normalized);
  return mode ? { kind: 'mode', mode } : { kind: 'not-found', pathname: normalized };
}

export function validateModeCatalogue(modesToValidate: readonly InstalledMode[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const routes = new Set<string>();
  const semanticVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;

  for (const mode of modesToValidate) {
    if (ids.has(mode.id)) issues.push(`Duplicate mode id: ${mode.id}`);
    if (routes.has(mode.route)) issues.push(`Duplicate mode route: ${mode.route}`);
    ids.add(mode.id);
    routes.add(mode.route);

    if (!semanticVersion.test(mode.release.version)) {
      issues.push(`Invalid semantic version for ${mode.id}: ${mode.release.version}`);
    }
    const parsedDate = new Date(`${mode.release.lastUpdated}T00:00:00Z`);
    const dateRoundTrips = !Number.isNaN(parsedDate.valueOf()) && parsedDate.toISOString().slice(0, 10) === mode.release.lastUpdated;
    if (
      !isoDate.test(mode.release.lastUpdated) ||
      !dateRoundTrips
    ) {
      issues.push(`Invalid ISO lastUpdated date for ${mode.id}: ${mode.release.lastUpdated}`);
    }
    if (mode.release.lifecycle === 'live' && !mode.composition.scenarioIdentity) {
      issues.push(`Live mode ${mode.id} must identify a scenario`);
    }
    if (mode.release.lifecycle === 'scaffold' && mode.composition.scenarioIdentity) {
      issues.push(`Scaffold mode ${mode.id} must not claim an installed scenario`);
    }
    if (!['live', 'scaffold'].includes(mode.release.lifecycle)) {
      issues.push(`Invalid lifecycle for ${mode.id}: ${mode.release.lifecycle}`);
    }
    if (!mode.release.statusLabel.trim() || !mode.release.currentFocus.trim()) {
      issues.push(`Mode ${mode.id} must expose readable status and current focus`);
    }
  }

  return issues;
}

const catalogueIssues = validateModeCatalogue(INSTALLED_MODES);
if (catalogueIssues.length > 0) {
  throw new Error(`Invalid mode catalogue:\n${catalogueIssues.join('\n')}`);
}
