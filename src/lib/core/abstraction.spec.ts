import { describe, expect, it } from 'vitest';
import { compareContractObservables, compileExactWrapper, expandExactWrapper } from './abstraction';

describe('exact retained-state wrapper precursor', () => {
  it('round-trips retained state and detects tampering', () => {
    const wrapper = compileExactWrapper({
      id: 'wrapper/test-region', version: '1.0.0', wrappedAt: 12, sourceCheckpointHash: 'checkpoint-12',
      memberIds: ['node/a', 'node/b'], boundary: { stock: 15, capabilities: ['capture'] },
      retainedState: { nodes: [{ id: 'node/a', stock: 5 }, { id: 'node/b', stock: 10 }] },
      exactResumeTriggers: ['instability']
    });
    expect(expandExactWrapper(wrapper)).toEqual(wrapper.retainedState);
    expect(() => expandExactWrapper({ ...wrapper, boundary: { stock: 16, capabilities: ['capture'] } })).toThrow('boundary hash');
  });

  it('compares declared observables without presentation input', () => {
    expect(compareContractObservables({ stock: 10, flux: 3 }, { stock: 10, flux: 3.01 }, { stock: 0, flux: 0.02 }))
      .toEqual([
        { id: 'flux', detailed: 3, wrapped: 3.01, tolerance: 0.02, distance: 0.009999999999999787, passed: true },
        { id: 'stock', detailed: 10, wrapped: 10, tolerance: 0, distance: 0, passed: true }
      ]);
  });
});
