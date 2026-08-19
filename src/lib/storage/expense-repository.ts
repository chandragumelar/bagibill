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
function assertCalculable(expense: ExpenseRecord): void {
  try {
    calculateExpense(toCalculationInput(expense));
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
    assertCalculable(expense);
    await adapter.expenses.put(expense);
    return expense;
  }

  async function updateExpense(expenseId: string, patch: UpdateExpenseInput): Promise<ExpenseRecord> {
    const existing = await adapter.expenses.get(expenseId);
    if (existing === undefined) {
      throw new Error(`updateExpense: no expense found for id "${expenseId}"`);
    }
    const updated: ExpenseRecord = { ...existing, ...patch, updatedAt: clock.now() };
    assertCalculable(updated);
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

  return { createExpense, updateExpense, softDeleteExpense, getExpense, listExpensesByGroup };
}
