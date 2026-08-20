function hash32(input: string): number {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/**
 * Derive a stable named stream from one master seed. Adding an unrelated random
 * choice elsewhere must not reshuffle this subsystem's history.
 */
export function deriveSeed(masterSeed: string, ...path: string[]): string {
  const framed = [masterSeed, ...path].map((part) => `${part.length}:${part}`).join('|');
  return `seed-v1-${hash32(framed).toString(16).padStart(8, '0')}`;
}

/** Small deterministic generator used only for bounded experimental variation. */
export function createRng(seed: string): () => number {
  let value = hash32(seed);

  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
