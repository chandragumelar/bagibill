import type { BalanceResult, ExpenseLedger } from "./balance.types";

export function computeExpenseBalance(input: ExpenseLedger): BalanceResult {
  const { sharesMinor, paymentsMinor } = input;
  assertNonEmptyLedger(sharesMinor, paymentsMinor);
  assertSameLength(sharesMinor, paymentsMinor);
  assertValidShareElements(sharesMinor, "computeExpenseBalance");
  assertValidPaymentElements(paymentsMinor, "computeExpenseBalance");
  assertBalancedTotals(sharesMinor, paymentsMinor, "computeExpenseBalance");

  return buildBalanceResult(sharesMinor, paymentsMinor);
}

export function computeGroupBalances(input: {
  participantCount: number;
  expenses: readonly ExpenseLedger[];
}): BalanceResult {
  const { participantCount, expenses } = input;
  assertValidParticipantCount(participantCount);
  assertNonEmptyExpenses(expenses);
  expenses.forEach((expense, expenseIndex) => assertValidGroupExpense(expense, expenseIndex, participantCount));

  const netMinor = sumNetAcrossExpenses(expenses, participantCount);
  const totalPaidMinor = expenses.reduce((sum, expense) => sum + sumMinor(expense.paymentsMinor), 0);
  const totalOwedMinor = expenses.reduce((sum, expense) => sum + sumMinor(expense.sharesMinor), 0);

  return { netMinor, totalPaidMinor, totalOwedMinor };
}

function buildBalanceResult(sharesMinor: readonly number[], paymentsMinor: readonly number[]): BalanceResult {
  const netMinor = paymentsMinor.map((paymentMinor, index) => paymentMinor - requireIndexedValue(sharesMinor, index));
  return { netMinor, totalPaidMinor: sumMinor(paymentsMinor), totalOwedMinor: sumMinor(sharesMinor) };
}

function sumNetAcrossExpenses(expenses: readonly ExpenseLedger[], participantCount: number): number[] {
  return Array.from({ length: participantCount }, (_, participantIndex) =>
    expenses.reduce(
      (sum, expense) =>
        sum +
        requireIndexedValue(expense.paymentsMinor, participantIndex) -
        requireIndexedValue(expense.sharesMinor, participantIndex),
      0,
    ),
  );
}

function sumMinor(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

// sharesMinor and paymentsMinor are already validated to have matching
// lengths (equal to each other in computeExpenseBalance, or both equal to
// participantCount in computeGroupBalances), so this read is unreachable in
// practice — required only to satisfy noUncheckedIndexedAccess.
function requireIndexedValue(values: readonly number[], index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`computeBalance: internal error, missing value at index ${index}`);
  }
  return value;
}

function balanceError(functionName: string, reason: string, expenseIndex?: number): Error {
  const suffix = expenseIndex === undefined ? "" : ` (expenseIndex=${expenseIndex})`;
  return new Error(`${functionName}: ${reason}${suffix}`);
}

function assertNonEmptyLedger(sharesMinor: readonly number[], paymentsMinor: readonly number[]): void {
  if (sharesMinor.length === 0 || paymentsMinor.length === 0) {
    throw balanceError("computeExpenseBalance", "sharesMinor and paymentsMinor must not be empty");
  }
}

function assertSameLength(sharesMinor: readonly number[], paymentsMinor: readonly number[]): void {
  if (sharesMinor.length !== paymentsMinor.length) {
    throw balanceError(
      "computeExpenseBalance",
      `sharesMinor length ${sharesMinor.length} does not match paymentsMinor length ${paymentsMinor.length}`,
    );
  }
}

function assertValidParticipantCount(participantCount: number): void {
  if (!Number.isInteger(participantCount) || participantCount <= 0) {
    throw balanceError("computeGroupBalances", `participantCount must be a positive integer, got ${participantCount}`);
  }
}

function assertNonEmptyExpenses(expenses: readonly ExpenseLedger[]): void {
  if (expenses.length === 0) {
    throw balanceError("computeGroupBalances", "expenses must not be empty");
  }
}

// Every ExpenseLedger must be exactly participantCount long, zero-filled for
// participants not in that expense, rather than a short array scoped to who
// was actually there. Participant indices need to mean the same person
// across the whole group, and per-expense arrays of varying length would
// force every caller to remap indices on every expense — exactly where
// off-by-one participant bugs come from.
function assertValidGroupExpense(expense: ExpenseLedger, expenseIndex: number, participantCount: number): void {
  const { sharesMinor, paymentsMinor } = expense;
  if (sharesMinor.length !== participantCount || paymentsMinor.length !== participantCount) {
    throw balanceError(
      "computeGroupBalances",
      `expense arrays must be exactly participantCount (${participantCount}) long, got sharesMinor=${sharesMinor.length} paymentsMinor=${paymentsMinor.length}`,
      expenseIndex,
    );
  }
  assertValidShareElements(sharesMinor, "computeGroupBalances", expenseIndex);
  assertValidPaymentElements(paymentsMinor, "computeGroupBalances", expenseIndex);
  assertBalancedTotals(sharesMinor, paymentsMinor, "computeGroupBalances", expenseIndex);
}

function assertValidShareElements(sharesMinor: readonly number[], functionName: string, expenseIndex?: number): void {
  sharesMinor.forEach((shareMinor, participantIndex) => {
    if (!Number.isInteger(shareMinor)) {
      throw balanceError(functionName, `sharesMinor[${participantIndex}] ${shareMinor} must be an integer`, expenseIndex);
    }
  });
}

function assertValidPaymentElements(
  paymentsMinor: readonly number[],
  functionName: string,
  expenseIndex?: number,
): void {
  paymentsMinor.forEach((paymentMinor, participantIndex) => {
    if (!Number.isInteger(paymentMinor)) {
      throw balanceError(functionName, `paymentsMinor[${participantIndex}] ${paymentMinor} must be an integer`, expenseIndex);
    }
    if (paymentMinor < 0) {
      throw balanceError(functionName, `paymentsMinor[${participantIndex}] ${paymentMinor} must not be negative`, expenseIndex);
    }
  });
}

// Validated as an error, not a warning like F1-03's over_allocated: the
// Nominal mode there is still being typed by the user, so the numbers
// aren't final yet. Here the expense is already saved and ready to become a
// balance — a stored expense whose payments don't match its shares is
// corrupt data, not a transient state a screen is still working through.
function assertBalancedTotals(
  sharesMinor: readonly number[],
  paymentsMinor: readonly number[],
  functionName: string,
  expenseIndex?: number,
): void {
  const totalSharesMinor = sumMinor(sharesMinor);
  const totalPaymentsMinor = sumMinor(paymentsMinor);
  if (totalPaymentsMinor !== totalSharesMinor) {
    throw balanceError(
      functionName,
      `total payments ${totalPaymentsMinor} does not match total shares ${totalSharesMinor}`,
      expenseIndex,
    );
  }
}
