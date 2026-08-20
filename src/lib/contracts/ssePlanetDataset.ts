export const SSE_PLANET_DATASET_SCHEMA = 'evolution-lab/sse-planet-dataset/1' as const;
export const SSE_SPECTRAL_FRAME_SCHEMA = 'sse-spectrum/280-1400nm-10nm/v1' as const;

export type DatasetStatus = 'draft' | 'reference' | 'retired';

export interface SseDatasetSource {
  repository: string;
  branch: string;
  commit: string;
  packageVersion: string;
  generator: string;
  rulepack: string;
  license: string;
  content: string;
}

export interface SpectralGrid {
  id: typeof SSE_SPECTRAL_FRAME_SCHEMA;
  minimumNm: number;
  maximumNm: number;
  stepNm: number;
  valueUnit: 'W.m-2.nm-1';
}

export interface SseAtmosphereInput {
  pressure_bar: number;
  molarMassKg: number;
  composition: Record<string, number>;
}

export interface SseSpectralFrame {
  id: string;
  systemId: string;
  bodyId: string;
  regionId: string;
  level: 'surface' | '1 bar';
  input: {
    star: {
      starTempK: number;
      luminositySolar: number;
      distanceAU: number;
    };
    gravityMs2: number;
    atmosphere: SseAtmosphereInput;
  };
  irradianceWm2Nm: readonly number[];
}

export interface SsePlanetDataset {
  fixtureSchema: typeof SSE_PLANET_DATASET_SCHEMA;
  status: DatasetStatus;
  source: SseDatasetSource;
  payload: {
    masterSeed: string;
    seedPath: string[];
    grid: SpectralGrid;
    frames: SseSpectralFrame[];
  };
  payloadSha256: string;
}

export interface DatasetIssue {
  path: string;
  message: string;
}

export interface CompiledSsePlanetDataset {
  readonly source: Readonly<SseDatasetSource>;
  readonly masterSeed: string;
  readonly seedPath: readonly string[];
  readonly grid: Readonly<SpectralGrid>;
  readonly payloadSha256: string;
  readonly framesById: ReadonlyMap<string, Readonly<SseSpectralFrame>>;
  frame(frameId: string): Readonly<SseSpectralFrame>;
}

export function spectralBinCount(grid: SpectralGrid): number {
  if (!(grid.stepNm > 0) || grid.maximumNm < grid.minimumNm) return 0;
  return Math.floor((grid.maximumNm - grid.minimumNm) / grid.stepNm + 1e-9) + 1;
}

export function wavelengthAtIndex(grid: SpectralGrid, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= spectralBinCount(grid)) {
    throw new RangeError(`Spectral index ${index} is outside ${grid.id}.`);
  }
  return grid.minimumNm + index * grid.stepNm;
}

export function irradianceAt(
  frame: Pick<SseSpectralFrame, 'irradianceWm2Nm'>,
  grid: SpectralGrid,
  wavelengthNm: number
): number {
  const offset = (wavelengthNm - grid.minimumNm) / grid.stepNm;
  const index = Math.round(offset);
  if (Math.abs(offset - index) > 1e-9) {
    throw new RangeError(`Wavelength ${wavelengthNm} nm is not on ${grid.id}.`);
  }
  if (index < 0 || index >= frame.irradianceWm2Nm.length) {
    throw new RangeError(`Wavelength ${wavelengthNm} nm is outside ${grid.id}.`);
  }
  return frame.irradianceWm2Nm[index];
}

export function peakWavelength(
  frame: Pick<SseSpectralFrame, 'irradianceWm2Nm'>,
  grid: SpectralGrid
): number {
  let peakIndex = 0;
  for (let index = 1; index < frame.irradianceWm2Nm.length; index += 1) {
    if (frame.irradianceWm2Nm[index] > frame.irradianceWm2Nm[peakIndex]) peakIndex = index;
  }
  return wavelengthAtIndex(grid, peakIndex);
}

export function validateSsePlanetDataset(dataset: SsePlanetDataset): DatasetIssue[] {
  const issues: DatasetIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  if (dataset.fixtureSchema !== SSE_PLANET_DATASET_SCHEMA) {
    add('fixtureSchema', `Expected ${SSE_PLANET_DATASET_SCHEMA}.`);
  }
  if (!dataset.payload.masterSeed.trim()) add('payload.masterSeed', 'Master seed is required.');
  if (dataset.payload.seedPath.some((part) => !part.trim())) {
    add('payload.seedPath', 'Seed paths cannot contain empty parts.');
  }
  const { grid } = dataset.payload;
  if (grid.id !== SSE_SPECTRAL_FRAME_SCHEMA) add('payload.grid.id', 'Unknown spectral grid.');
  if (grid.minimumNm !== 280 || grid.maximumNm !== 1400 || grid.stepNm !== 10) {
    add('payload.grid', 'The v1 grid must match SSE beta: 280–1400 nm in 10 nm bins.');
  }
  if (!/^[a-f0-9]{64}$/.test(dataset.payloadSha256)) {
    add('payloadSha256', 'Reference payload hash must be a lowercase SHA-256 hex string.');
  }
  if (dataset.status === 'reference' && !dataset.payloadSha256) {
    add('payloadSha256', 'Reference datasets require an expected payload hash.');
  }

  const expectedBins = spectralBinCount(grid);
  const frameIds = new Set<string>();
  for (const [index, frame] of dataset.payload.frames.entries()) {
    const path = `payload.frames[${index}]`;
    if (!frame.id.trim()) add(`${path}.id`, 'Frame ID is required.');
    if (frameIds.has(frame.id)) add(`${path}.id`, `Duplicate frame ID ${frame.id}.`);
    frameIds.add(frame.id);
    for (const key of ['systemId', 'bodyId', 'regionId'] as const) {
      if (!frame[key].trim()) add(`${path}.${key}`, `${key} is required.`);
    }
    if (frame.irradianceWm2Nm.length !== expectedBins) {
      add(
        `${path}.irradianceWm2Nm`,
        `Expected ${expectedBins} spectral bins, received ${frame.irradianceWm2Nm.length}.`
      );
    }
    if (frame.irradianceWm2Nm.some((value) => !Number.isFinite(value) || value < 0)) {
      add(`${path}.irradianceWm2Nm`, 'Irradiance values must be finite and non-negative.');
    }
    if (!(frame.input.star.starTempK > 0)) add(`${path}.input.star.starTempK`, 'Temperature must be positive.');
    if (!(frame.input.star.luminositySolar > 0)) {
      add(`${path}.input.star.luminositySolar`, 'Luminosity must be positive.');
    }
    if (!(frame.input.star.distanceAU > 0)) add(`${path}.input.star.distanceAU`, 'Distance must be positive.');
  }
  return issues;
}

export function compileSsePlanetDataset(dataset: SsePlanetDataset): CompiledSsePlanetDataset {
  const issues = validateSsePlanetDataset(dataset);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join(' '));
  }
  const frames = dataset.payload.frames.map((frame) =>
    Object.freeze({ ...frame, irradianceWm2Nm: Object.freeze([...frame.irradianceWm2Nm]) })
  );
  const framesById = new Map(frames.map((frame) => [frame.id, frame]));
  return Object.freeze({
    source: Object.freeze({ ...dataset.source }),
    masterSeed: dataset.payload.masterSeed,
    seedPath: Object.freeze([...dataset.payload.seedPath]),
    grid: Object.freeze({ ...dataset.payload.grid }),
    payloadSha256: dataset.payloadSha256,
    framesById,
    frame(frameId: string) {
      const frame = framesById.get(frameId);
      if (!frame) throw new Error(`Unknown SSE fixture frame: ${frameId}`);
      return frame;
    }
  });
}
