export interface ExpenseLedger {
  readonly sharesMinor: readonly number[];
  readonly paymentsMinor: readonly number[];
}

export interface BalanceResult {
  readonly netMinor: readonly number[];
  readonly totalPaidMinor: number;
  readonly totalOwedMinor: number;
}
