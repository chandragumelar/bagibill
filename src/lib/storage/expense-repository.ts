import { calculateExpense } from "@bagibill/split-engine";
import type { StorageAdapter } from "./adapter";
import type { Clock } from "./clock";
import type { IdGenerator } from "./id";
import { toCalculationInput } from "./expense-mapping";
import type {
  ChargeRecord,
  ExpenseItemRecord,
  ExpensePayerRecord,
  ExpenseRecord,
  SplitDataRecord,
  TreatRecord,
} from "./records";

const MIN_DATE = Number.NEGATIVE_INFINITY;
const MAX_DATE = Number.POSITIVE_INFINITY;

export interface CreateExpenseInput {
  readonly groupSlug: string;
  readonly title: string;
  readonly category: string;
  readonly date: number;
  readonly notes: string;
  readonly currency: string;
  readonly fxRate: number;
  readonly amountTotalMinor: number;
  readonly payers: readonly ExpensePayerRecord[];
  readonly splitData: SplitDataRecord;
  readonly charges: readonly ChargeRecord[];
  readonly items: readonly ExpenseItemRecord[];
  readonly treats: readonly TreatRecord[];
  readonly attachments: readonly string[];
  readonly createdBy: string;
}

export type UpdateExpenseInput = Partial<
  Omit<ExpenseRecord, "expenseId" | "createdAt" | "updatedAt" | "seq" | "deletedAt">
>;

export interface ListExpensesOptions {
  readonly order?: "asc" | "desc";
  readonly includeDeleted?: boolean;
}

export interface ExpenseRepository {
  createExpense(input: CreateExpenseInput): Promise<ExpenseRecord>;
  updateExpense(expenseId: string, patch: UpdateExpenseInput): Promise<ExpenseRecord>;
  softDeleteExpense(expenseId: string): Promise<void>;
  restoreExpense(expenseId: string): Promise<void>;
  getExpense(expenseId: string): Promise<ExpenseRecord | undefined>;
  listExpensesByGroup(groupSlug: string, options?: ListExpensesOptions): Promise<readonly ExpenseRecord[]>;
}

// Storing an expense that can't be calculated is corrupt data that only
// surfaces weeks later on the balance screen. calculateExpense already
// knows every layer's rules (split, charges, treats, balance), so it's
// reused here purely as a save-time gate — its result is never stored,
// because storing a derived number alongside the inputs it came from is a
// second source of truth (K-64). A thrown error rejects the save; a
// warning is a valid state to display, not a reason to refuse it.
//
// K-64 (revised, K-122): this gate only ever checked "can calculateExpense
// run at all" — memberId/index/weight sanity. It never actually enforced
// "payments equal shares" on its own; that used to be bundled in because
// calculateExpense itself threw for a mismatch. Since K-122 split that into
// its own warning (compute-balances.ts's K-43 assertion still throws, just
// no longer reached on a mismatch), this gate no longer blocks an unbalanced
// save for ANY split mode — an item nobody's claimed yet (byItems) or,
// technically, any other mode's payer total not matching its shares. For
// non-byItems modes the add-expense screen's disabled save button (F3-04) is
// now the only thing preventing that from being saved; making an unbalanced
// non-byItems save visible after the fact is use-group-balance.ts's job
// (excluded from the balance, counted, and shown as a warning there).
function assertCalculable(expense: ExpenseRecord, baseCurrency: string): void {
  try {
    calculateExpense(toCalculationInput(expense, baseCurrency));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`expense fails the calculation gate: ${reason}`);
  }
}

export function createExpenseRepository(
  adapter: StorageAdapter,
  clock: Clock,
  idGenerator: IdGenerator,
): ExpenseRepository {
  async function createExpense(input: CreateExpenseInput): Promise<ExpenseRecord> {
    const now = clock.now();
    const expense: ExpenseRecord = {
      ...input,
      expenseId: idGenerator.nextId(),
      seq: 0,
      createdAt: now,
      updatedAt: now,
    };
    const group = await adapter.groups.get(expense.groupSlug);
    if (group === undefined) throw new Error("createExpense: no group found for the given group");
    assertCalculable(expense, group.baseCurrency);
    await adapter.expenses.put(expense);
    return expense;
  }

  async function updateExpense(expenseId: string, patch: UpdateExpenseInput): Promise<ExpenseRecord> {
    const existing = await adapter.expenses.get(expenseId);
    if (existing === undefined) {
      throw new Error(`updateExpense: no expense found for id "${expenseId}"`);
    }
    const updatedAt = Math.max(clock.now(), existing.updatedAt + 1);
    const updated: ExpenseRecord = { ...existing, ...patch, updatedAt };
    const group = await adapter.groups.get(updated.groupSlug);
    if (group === undefined) throw new Error("updateExpense: no group found for the given group");
    assertCalculable(updated, group.baseCurrency);
    await adapter.expenses.put(updated);
    return updated;
  }

  async function softDeleteExpense(expenseId: string): Promise<void> {
    const existing = await adapter.expenses.get(expenseId);
    if (existing === undefined) {
      throw new Error(`softDeleteExpense: no expense found for id "${expenseId}"`);
    }
    await adapter.expenses.put({ ...existing, deletedAt: clock.now() });
  }

  async function restoreExpense(expenseId: string): Promise<void> {
    const existing = await adapter.expenses.get(expenseId);
    if (existing === undefined) {
      throw new Error(`restoreExpense: no expense found for id "${expenseId}"`);
    }
    await adapter.expenses.put({ ...existing, deletedAt: undefined });
  }

  async function getExpense(expenseId: string): Promise<ExpenseRecord | undefined> {
    const expense = await adapter.expenses.get(expenseId);
    if (expense === undefined || expense.deletedAt !== undefined) {
      return undefined;
    }
    return expense;
  }

  async function listExpensesByGroup(
    groupSlug: string,
    options: ListExpensesOptions = {},
  ): Promise<readonly ExpenseRecord[]> {
    const order = options.order ?? "desc";
    const includeDeleted = options.includeDeleted ?? false;
    const ascending = await adapter.expenses.findByRange(
      "[groupSlug+date]",
      [groupSlug, MIN_DATE],
      [groupSlug, MAX_DATE],
    );
    const visible = includeDeleted ? ascending : ascending.filter((expense) => expense.deletedAt === undefined);
    return order === "asc" ? visible : [...visible].reverse();
  }

  return { createExpense, updateExpense, softDeleteExpense, restoreExpense, getExpense, listExpensesByGroup };
}
