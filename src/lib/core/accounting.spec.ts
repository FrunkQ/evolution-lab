import { describe, expect, it } from 'vitest';
import { AccountingTracker, validateAccountingFrames } from './accounting';

interface TestState {
  available: number;
  retained: number;
}

const identity = {
  boundaryId: 'scenario/galaxy-region',
  unit: 'formation-mass-bucket',
  minorUnit: 0.001
};
const capture = (state: TestState) => ({
  'region/available': state.available,
  'region/retained': state.retained
});

describe('generic transactional accounting', () => {
  it('supports a non-biological boundary, unit and sparse stored ticks', () => {
    const state = { available: 100, retained: 0 };
    const first = new AccountingTracker(10, state, identity, capture);
    first.record(
      state,
      {
        id: 'galaxy/accretion/10',
        kind: 'boundary-import',
        label: 'Resolved external accretion',
        boundaryDeltaMinorUnits: 5,
        causes: ['provider/accretion-event']
      },
      () => { state.available += 5; }
    );
    first.record(
      state,
      {
        id: 'galaxy/retention/10',
        kind: 'transfer',
        label: 'Material retained in the region',
        causes: ['capability/gravitational-retention']
      },
      () => {
        state.available -= 2;
        state.retained += 2;
      }
    );
    const second = new AccountingTracker(20, state, identity, capture);
    const validation = validateAccountingFrames([first.finish(state), second.finish(state)]);
    expect(validation).toEqual({
      balanced: true,
      debtFree: true,
      continuity: true,
      structuralIntegrity: true,
      maximumResidualMinorUnits: 0,
      totalAdjustmentDebtMinorUnits: 0
    });
  });

  it('separates balanced postings from explicitly declared adjustment debt', () => {
    const state = { available: 100, retained: 0 };
    const tracker = new AccountingTracker(3, state, identity, capture);
    tracker.record(
      state,
      {
        id: 'test/repair/3',
        kind: 'adjustment',
        label: 'Deliberate numerical repair',
        adjustmentDebtMinorUnits: 1,
        causes: ['test/injected-repair']
      },
      () => {}
    );
    const validation = validateAccountingFrames([tracker.finish(state)]);
    expect(validation).toMatchObject({
      balanced: true,
      debtFree: false,
      structuralIntegrity: true,
      totalAdjustmentDebtMinorUnits: 1
    });
  });

  it('rejects a unit identity change even when stored totals claim closure', () => {
    const state = { available: 100, retained: 0 };
    const first = new AccountingTracker(1, state, identity, capture).finish(state);
    const second = new AccountingTracker(2, state, { ...identity, unit: 'different-unit' }, capture).finish(state);
    expect(validateAccountingFrames([first, second])).toMatchObject({
      balanced: false,
      debtFree: false,
      structuralIntegrity: false
    });
  });
});