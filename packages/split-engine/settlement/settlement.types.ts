export interface Transfer {
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly amountMinor: number;
}

export interface SettlementResult {
  readonly transfers: readonly Transfer[];
  readonly pairwiseTransfers: readonly Transfer[];
}
