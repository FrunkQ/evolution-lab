import { stableChecksum, stableStringify } from './canonical';

export const EXACT_WRAPPER_SCHEMA = 'evolution-exact-wrapper/0.1' as const;

export interface ExactWrapperDefinition<TBoundary, TRetained> {
  id: string;
  version: string;
  wrappedAt: number;
  sourceCheckpointHash: string;
  memberIds: readonly string[];
  boundary: TBoundary;
  retainedState: TRetained;
  exactResumeTriggers: readonly string[];
}

export interface ExactRetainedStateWrapper<TBoundary, TRetained> extends ExactWrapperDefinition<TBoundary, TRetained> {
  schemaVersion: typeof EXACT_WRAPPER_SCHEMA;
  boundaryHash: string;
  retainedStateHash: string;
  hash: string;
}

export interface ObservableDistance {
  id: string;
  detailed: number;
  wrapped: number;
  tolerance: number;
  distance: number;
  passed: boolean;
}

const clone = <T>(value: T): T => JSON.parse(stableStringify(value)) as T;

export function compileExactWrapper<TBoundary, TRetained>(
  definition: ExactWrapperDefinition<TBoundary, TRetained>
): ExactRetainedStateWrapper<TBoundary, TRetained> {
  if (
    !definition.id.trim() || !definition.version.trim() || !Number.isInteger(definition.wrappedAt) ||
    definition.wrappedAt < 0 || !definition.sourceCheckpointHash.trim() || !definition.memberIds.length ||
    new Set(definition.memberIds).size !== definition.memberIds.length ||
    !definition.exactResumeTriggers.length
  ) throw new Error('Exact wrappers require identity, checkpoint, unique members and resume triggers.');
  const snapshot = clone(definition);
  const boundaryHash = stableChecksum('wrapper-boundary/v1', snapshot.boundary);
  const retainedStateHash = stableChecksum('wrapper-retained-state/v1', snapshot.retainedState);
  const canonical = { schemaVersion: EXACT_WRAPPER_SCHEMA, ...snapshot, boundaryHash, retainedStateHash };
  return Object.freeze({ ...canonical, hash: stableChecksum('exact-wrapper/v1', canonical) });
}

export function expandExactWrapper<TBoundary, TRetained>(
  wrapper: ExactRetainedStateWrapper<TBoundary, TRetained>
): TRetained {
  if (wrapper.schemaVersion !== EXACT_WRAPPER_SCHEMA) throw new Error('Unknown exact wrapper schema.');
  if (stableChecksum('wrapper-boundary/v1', wrapper.boundary) !== wrapper.boundaryHash) throw new Error('Exact wrapper boundary hash mismatch.');
  if (stableChecksum('wrapper-retained-state/v1', wrapper.retainedState) !== wrapper.retainedStateHash) throw new Error('Exact wrapper retained-state hash mismatch.');
  const { hash, ...canonical } = wrapper;
  if (stableChecksum('exact-wrapper/v1', canonical) !== hash) throw new Error('Exact wrapper manifest hash mismatch.');
  return clone(wrapper.retainedState);
}

export function compareContractObservables(
  detailed: Readonly<Record<string, number>>,
  wrapped: Readonly<Record<string, number>>,
  tolerances: Readonly<Record<string, number>>
): ObservableDistance[] {
  const ids = [...new Set([...Object.keys(detailed), ...Object.keys(wrapped), ...Object.keys(tolerances)])].sort();
  return ids.map((id) => {
    const distance = Math.abs((detailed[id] ?? Number.NaN) - (wrapped[id] ?? Number.NaN));
    const tolerance = tolerances[id] ?? 0;
    return { id, detailed: detailed[id], wrapped: wrapped[id], tolerance, distance, passed: Number.isFinite(distance) && distance <= tolerance };
  });
}
