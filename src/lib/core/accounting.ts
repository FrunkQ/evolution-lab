import type {
  AccountingTransactionKind,
  MatterAccountingFrame,
  MatterTransaction,
  PopulationState,
  ResourceLedger,
  SignatureState
} from './types';

export const ACCOUNTING_SCHEMA_VERSION = 'evolution-accounting/0.1' as const;
export const ACCOUNTING_BOUNDARY_ID = 'scenario/microbial-film' as const;
export const ACCOUNTING_UNIT = 'model-mass' as const;
export const ACCOUNTING_MINOR_UNIT = 0.01 as const;

export interface AccountingIdentity {
  boundaryId: string;
  unit: string;
  minorUnit: number;
}

export interface MaterialAccountingState {
  resources: ResourceLedger;
  populations: Map<string, PopulationState>;
  signatures: SignatureState;
}

export interface MatterTransactionDefinition {
  id: string;
  kind: AccountingTransactionKind;
  label: string;
  boundaryDeltaMinorUnits?: number;
  adjustmentDebtMinorUnits?: number;
  causes: string[];
}

export interface AccountingValidation {
  balanced: boolean;
  debtFree: boolean;
  continuity: boolean;
  structuralIntegrity: boolean;
  maximumResidualMinorUnits: number;
  totalAdjustmentDebtMinorUnits: number;
}

export type AccountCapture<TState> = (state: TState) => Readonly<Record<string, number>>;

export const toCentiUnits = (value: number): number => Math.round(value * 100);
export const fromCentiUnits = (value: number): number => value / 100;
export const quantizeModelMass = (value: number): number => fromCentiUnits(toCentiUnits(value));

export function splitCentiUnits(total: number, weights: readonly number[]): number[] {
  if (!Number.isInteger(total) || total < 0) throw new Error('Accounting split total must be a non-negative integer.');
  if (!weights.length || weights.some((weight) => !Number.isInteger(weight) || weight < 0)) {
    throw new Error('Accounting split weights must be non-negative integers.');
  }
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal <= 0) throw new Error('Accounting split requires a positive total weight.');
  let allocated = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return total - allocated;
    const share = Math.floor((total * weight) / weightTotal);
    allocated += share;
    return share;
  });
}

export function captureMatterAccounts(state: MaterialAccountingState): Record<string, number> {
  const accounts: Record<string, number> = {
    'resource/carbon': toCentiUnits(state.resources.carbon),
    'resource/minerals': toCentiUnits(state.resources.minerals),
    'resource/oxygen': toCentiUnits(state.resources.oxygen),
    'resource/detritus': toCentiUnits(state.resources.detritus),
    'deposit/oxidized-minerals': toCentiUnits(state.signatures.oxidizedMinerals),
    'deposit/organic-sediment': toCentiUnits(state.signatures.organicSediment)
  };
  for (const population of [...state.populations.values()].sort((left, right) => left.lineageId.localeCompare(right.lineageId))) {
    accounts[`population/${population.lineageId}`] = toCentiUnits(population.biomass);
  }
  return accounts;
}

function validateIdentity(identity: AccountingIdentity): void {
  if (!identity.boundaryId.trim() || !identity.unit.trim() || !Number.isFinite(identity.minorUnit) || identity.minorUnit <= 0) {
    throw new Error('Accounting identity requires a boundary, unit and positive finite minor unit.');
  }
}

function validateAccounts(accounts: Readonly<Record<string, number>>): void {
  if (
    !Object.keys(accounts).length ||
    Object.entries(accounts).some(([accountId, value]) => !accountId.trim() || !Number.isInteger(value) || value < 0)
  ) {
    throw new Error('Accounting captures require named accounts with non-negative integer minor-unit balances.');
  }
}

const accountTotal = (accounts: Readonly<Record<string, number>>): number =>
  Object.values(accounts).reduce((sum, value) => sum + value, 0);

export class AccountingTracker<TState> {
  readonly #tick: number;
  readonly #identity: AccountingIdentity;
  readonly #capture: AccountCapture<TState>;
  readonly #opening: Readonly<Record<string, number>>;
  readonly #transactions: MatterTransaction[] = [];
  #imported = 0;
  #exported = 0;
  #adjustmentDebt = 0;

  constructor(
    tick: number,
    state: TState,
    identity: AccountingIdentity,
    capture: AccountCapture<TState>
  ) {
    if (!Number.isInteger(tick) || tick < 0) throw new Error('Accounting tick must be a non-negative integer.');
    validateIdentity(identity);
    this.#tick = tick;
    this.#identity = { ...identity };
    this.#capture = capture;
    this.#opening = this.#captureValidated(state);
  }

  #captureValidated(state: TState): Readonly<Record<string, number>> {
    const accounts = { ...this.#capture(state) };
    validateAccounts(accounts);
    return accounts;
  }

  record(
    state: TState,
    definition: MatterTransactionDefinition,
    mutate: () => void
  ): void {
    const boundaryDelta = definition.boundaryDeltaMinorUnits ?? 0;
    const adjustmentDebt = definition.adjustmentDebtMinorUnits ?? 0;
    if (
      !definition.id.trim() ||
      !definition.label.trim() ||
      !definition.causes.length ||
      !Number.isInteger(boundaryDelta) ||
      !Number.isInteger(adjustmentDebt) ||
      adjustmentDebt < 0
    ) {
      throw new Error('Accounting transaction identity, causes and minor-unit values must be valid.');
    }
    if (
      (boundaryDelta > 0 && definition.kind !== 'boundary-import') ||
      (boundaryDelta < 0 && definition.kind !== 'boundary-export') ||
      (boundaryDelta === 0 && (definition.kind === 'boundary-import' || definition.kind === 'boundary-export')) ||
      (adjustmentDebt > 0 && definition.kind !== 'adjustment')
    ) {
      throw new Error(`Accounting transaction ${definition.id} has an inconsistent transaction kind.`);
    }
    const before = this.#captureValidated(state);
    mutate();
    const after = this.#captureValidated(state);
    const accountIds = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    const postings = accountIds
      .map((accountId) => ({
        accountId,
        deltaMinorUnits: (after[accountId] ?? 0) - (before[accountId] ?? 0)
      }))
      .filter(({ deltaMinorUnits }) => deltaMinorUnits !== 0);
    const postingTotal = postings.reduce((sum, posting) => sum + posting.deltaMinorUnits, 0);
    if (boundaryDelta >= 0) this.#imported += boundaryDelta;
    else this.#exported += -boundaryDelta;
    this.#adjustmentDebt += adjustmentDebt;
    this.#transactions.push({
      id: definition.id,
      tick: this.#tick,
      kind: definition.kind,
      label: definition.label,
      postings,
      boundaryDeltaMinorUnits: boundaryDelta,
      residualMinorUnits: postingTotal - boundaryDelta,
      adjustmentDebtMinorUnits: adjustmentDebt,
      causes: [...definition.causes]
    });
  }

  finish(state: TState): MatterAccountingFrame {
    const closing = this.#captureValidated(state);
    const openingTotal = accountTotal(this.#opening);
    const closingTotal = accountTotal(closing);
    return {
      schemaVersion: ACCOUNTING_SCHEMA_VERSION,
      tick: this.#tick,
      boundaryId: this.#identity.boundaryId,
      unit: this.#identity.unit,
      minorUnit: this.#identity.minorUnit,
      openingMinorUnits: openingTotal,
      importedMinorUnits: this.#imported,
      exportedMinorUnits: this.#exported,
      closingMinorUnits: closingTotal,
      residualMinorUnits: closingTotal - openingTotal - this.#imported + this.#exported,
      transactionResidualMinorUnits: this.#transactions.reduce(
        (sum, transaction) => sum + Math.abs(transaction.residualMinorUnits),
        0
      ),
      adjustmentDebtMinorUnits: this.#adjustmentDebt,
      transactions: this.#transactions.map((transaction) => ({
        ...transaction,
        postings: transaction.postings.map((posting) => ({ ...posting })),
        causes: [...transaction.causes]
      }))
    };
  }
}

export function createMicrobialMatterAccountingTracker(
  tick: number,
  state: MaterialAccountingState
): AccountingTracker<MaterialAccountingState> {
  return new AccountingTracker(
    tick,
    state,
    {
      boundaryId: ACCOUNTING_BOUNDARY_ID,
      unit: ACCOUNTING_UNIT,
      minorUnit: ACCOUNTING_MINOR_UNIT
    },
    captureMatterAccounts
  );
}

export function validateAccountingFrames(frames: readonly MatterAccountingFrame[]): AccountingValidation {
  let continuity = true;
  let structuralIntegrity = true;
  let maximumResidualMinorUnits = 0;
  let totalAdjustmentDebtMinorUnits = 0;
  const firstFrame = frames[0];
  const transactionIds = new Set<string>();

  for (const [index, frame] of frames.entries()) {
    if (
      frame.schemaVersion !== ACCOUNTING_SCHEMA_VERSION ||
      !Number.isInteger(frame.tick) ||
      frame.tick < 0 ||
      !frame.boundaryId.trim() ||
      !frame.unit.trim() ||
      !Number.isFinite(frame.minorUnit) ||
      frame.minorUnit <= 0 ||
      (firstFrame && (
        frame.schemaVersion !== firstFrame.schemaVersion ||
        frame.boundaryId !== firstFrame.boundaryId ||
        frame.unit !== firstFrame.unit ||
        frame.minorUnit !== firstFrame.minorUnit
      ))
    ) {
      structuralIntegrity = false;
    }
    const frameIntegers = [
      frame.openingMinorUnits,
      frame.importedMinorUnits,
      frame.exportedMinorUnits,
      frame.closingMinorUnits,
      frame.residualMinorUnits,
      frame.transactionResidualMinorUnits,
      frame.adjustmentDebtMinorUnits
    ];
    if (
      !frameIntegers.every(Number.isInteger) ||
      frame.openingMinorUnits < 0 ||
      frame.importedMinorUnits < 0 ||
      frame.exportedMinorUnits < 0 ||
      frame.closingMinorUnits < 0 ||
      frame.transactionResidualMinorUnits < 0 ||
      frame.adjustmentDebtMinorUnits < 0
    ) {
      structuralIntegrity = false;
    }
    if (index > 0) {
      if (frame.tick <= frames[index - 1].tick) structuralIntegrity = false;
      if (frame.openingMinorUnits !== frames[index - 1].closingMinorUnits) continuity = false;
    }

    const calculatedFrameResidual =
      frame.closingMinorUnits -
      frame.openingMinorUnits -
      frame.importedMinorUnits +
      frame.exportedMinorUnits;
    const calculatedImported = frame.transactions.reduce(
      (sum, transaction) => sum + Math.max(0, transaction.boundaryDeltaMinorUnits),
      0
    );
    const calculatedExported = frame.transactions.reduce(
      (sum, transaction) => sum + Math.max(0, -transaction.boundaryDeltaMinorUnits),
      0
    );
    const calculatedTransactionResidual = frame.transactions.reduce((sum, transaction) => {
      const postingIds = new Set<string>();
      if (
        !transaction.id.trim() ||
        transactionIds.has(transaction.id) ||
        transaction.tick !== frame.tick ||
        !transaction.label.trim() ||
        !transaction.causes.length ||
        !Number.isInteger(transaction.boundaryDeltaMinorUnits) ||
        !Number.isInteger(transaction.residualMinorUnits) ||
        !Number.isInteger(transaction.adjustmentDebtMinorUnits) ||
        transaction.adjustmentDebtMinorUnits < 0
      ) {
        structuralIntegrity = false;
      }
      transactionIds.add(transaction.id);
      if (
        (transaction.boundaryDeltaMinorUnits > 0 && transaction.kind !== 'boundary-import') ||
        (transaction.boundaryDeltaMinorUnits < 0 && transaction.kind !== 'boundary-export') ||
        (transaction.boundaryDeltaMinorUnits === 0 && (transaction.kind === 'boundary-import' || transaction.kind === 'boundary-export')) ||
        (transaction.adjustmentDebtMinorUnits > 0 && transaction.kind !== 'adjustment')
      ) {
        structuralIntegrity = false;
      }
      const postingTotal = transaction.postings.reduce((postingSum, posting) => {
        if (
          !posting.accountId.trim() ||
          postingIds.has(posting.accountId) ||
          !Number.isInteger(posting.deltaMinorUnits)
        ) {
          structuralIntegrity = false;
        }
        postingIds.add(posting.accountId);
        return postingSum + posting.deltaMinorUnits;
      }, 0);
      const residual = postingTotal - transaction.boundaryDeltaMinorUnits;
      maximumResidualMinorUnits = Math.max(
        maximumResidualMinorUnits,
        Math.abs(residual),
        Math.abs(transaction.residualMinorUnits),
        Math.abs(residual - transaction.residualMinorUnits)
      );
      return sum + Math.abs(residual);
    }, 0);
    const calculatedAdjustmentDebt = frame.transactions.reduce(
      (sum, transaction) => sum + Math.abs(transaction.adjustmentDebtMinorUnits),
      0
    );

    maximumResidualMinorUnits = Math.max(
      maximumResidualMinorUnits,
      Math.abs(calculatedFrameResidual),
      Math.abs(frame.residualMinorUnits),
      Math.abs(calculatedFrameResidual - frame.residualMinorUnits),
      Math.abs(calculatedImported - frame.importedMinorUnits),
      Math.abs(calculatedExported - frame.exportedMinorUnits),
      Math.abs(calculatedTransactionResidual - frame.transactionResidualMinorUnits)
    );
    totalAdjustmentDebtMinorUnits += Math.max(
      frame.adjustmentDebtMinorUnits,
      calculatedAdjustmentDebt
    );
    if (frame.adjustmentDebtMinorUnits !== calculatedAdjustmentDebt) structuralIntegrity = false;
  }

  return {
    balanced: structuralIntegrity && maximumResidualMinorUnits === 0 && continuity,
    debtFree: structuralIntegrity && totalAdjustmentDebtMinorUnits === 0,
    continuity,
    structuralIntegrity,
    maximumResidualMinorUnits,
    totalAdjustmentDebtMinorUnits
  };
}