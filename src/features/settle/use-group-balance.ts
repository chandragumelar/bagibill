import { useEffect, useState } from "react";
import { calculateExpense, calculateGroupBalances } from "@bagibill/split-engine";
import type { ExpenseLedger, Transfer } from "@bagibill/split-engine";
import { resolveMemberOrder, toCalculationInput } from "@/lib/storage/expense-mapping";
import { expenseRepository, groupRepository, memberRepository } from "@/lib/storage/repositories";
import type { ExpenseRecord, GroupRecord, MemberRecord } from "@/lib/storage/records";

export interface BalanceMemberRow {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
  readonly netMinor: number;
  readonly isCurrentMember: boolean;
  readonly isInactive: boolean;
}

export interface CurrentMemberPosition {
  readonly memberId: string;
  readonly netMinor: number;
  /** Direct (pairwise) transfers this member would receive — mode-invariant, so the header can describe "posisi kamu" without knowing which mode the tab is showing. */
  readonly directInboundCount: number;
  /** Direct (pairwise) transfers this member would pay — same reasoning as directInboundCount. */
  readonly directOutboundCount: number;
}

export type SettlementMode = "simplified" | "direct";

export type GroupBalanceState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly retry: () => void }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly currency: string;
      readonly rows: readonly BalanceMemberRow[];
      readonly simplifiedTransfers: readonly Transfer[];
      readonly directTransfers: readonly Transfer[];
      /** Which mode the tab should show first — group.settings.simplifyDebts translated to the engine's own vocabulary. The tab is free to toggle away from it afterward without ever recomputing (K-46). */
      readonly initialMode: SettlementMode;
      readonly position: CurrentMemberPosition;
      readonly expenseCount: number;
      readonly uncountedExpenseCount: number;
    };

// Every member ever in the group, oldest join first, tie-broken by id so the
// order is reproducible. computeGroupBalances demands every expense's ledger
// be exactly this length (K-42) — a deactivated member is kept in, never
// dropped, because they can still carry an unsettled balance and excluding
// them would make the group's balances sum to something other than zero.
function buildCanonicalOrder(members: readonly MemberRecord[]): readonly MemberRecord[] {
  return [...members].sort((a, b) => a.joinedAt - b.joinedAt || a.memberId.localeCompare(b.memberId));
}

// Stand-in for "who am I" until device identity exists (K-11/K-12,
// TERBUKA) — same precedent as use-group-detail.ts's resolveCurrentMemberId.
function resolveCurrentMemberId(members: readonly MemberRecord[]): string {
  const active = members.filter((member) => member.deactivatedAt === undefined);
  const sorted = [...active].sort((a, b) => a.joinedAt - b.joinedAt);
  return sorted[0]?.memberId ?? "";
}

function requireIndexed(values: readonly number[], index: number, label: string): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`useGroupBalance: missing ${label} at index ${index}`);
  }
  return value;
}

// Remaps one expense's own local participant order onto the group's
// canonical order, zero-filling members who weren't part of this expense —
// computeGroupBalances requires every ledger to be exactly participantCount
// long (K-42), not scoped down to who was actually in that expense.
function buildLedger(expense: ExpenseRecord, canonicalIds: readonly string[]): ExpenseLedger | undefined {
  try {
    const input = toCalculationInput(expense);
    const calculation = calculateExpense(input);
    const localOrder = resolveMemberOrder(expense.splitData);
    const localIndexByMemberId = new Map(localOrder.map((memberId, index) => [memberId, index]));
    const sharesMinor = canonicalIds.map((memberId) => {
      const localIndex = localIndexByMemberId.get(memberId);
      return localIndex === undefined ? 0 : requireIndexed(calculation.sharesMinor, localIndex, "sharesMinor");
    });
    const paymentsMinor = canonicalIds.map((memberId) => {
      const localIndex = localIndexByMemberId.get(memberId);
      return localIndex === undefined ? 0 : requireIndexed(input.paymentsMinor, localIndex, "paymentsMinor");
    });
    return { sharesMinor, paymentsMinor };
  } catch {
    // A corrupt record must not take the whole tab down — it's excluded and
    // counted (buildLedgers below), never silently dropped, so the balance
    // stays honest about what it isn't showing.
    return undefined;
  }
}

interface LedgerBuild {
  readonly ledgers: readonly ExpenseLedger[];
  readonly uncountedExpenseCount: number;
}

function buildLedgers(expenses: readonly ExpenseRecord[], canonicalIds: readonly string[]): LedgerBuild {
  const ledgers: ExpenseLedger[] = [];
  let uncountedExpenseCount = 0;
  for (const expense of expenses) {
    const ledger = buildLedger(expense, canonicalIds);
    if (ledger === undefined) {
      uncountedExpenseCount++;
    } else {
      ledgers.push(ledger);
    }
  }
  return { ledgers, uncountedExpenseCount };
}

interface Calculation {
  readonly netMinor: readonly number[];
  readonly transfers: readonly Transfer[];
  readonly pairwiseTransfers: readonly Transfer[];
}

// Always calls the engine in "simplified" mode regardless of the group's own
// settlementMode preference — that's the one mode where SettlementResult's
// `transfers` and `pairwiseTransfers` are two genuinely different arrays
// (K-46). Calling with "direct" would make them the same array, and the tab
// would have nothing to show for Ringkas. group.settings.simplifyDebts still
// decides which array the tab *displays first* (buildReadyState's
// initialMode) — it just never reaches this function.
function computeCalculation(participantCount: number, ledgers: readonly ExpenseLedger[]): Calculation {
  if (ledgers.length === 0) {
    return { netMinor: Array.from({ length: participantCount }, () => 0), transfers: [], pairwiseTransfers: [] };
  }
  const result = calculateGroupBalances({ participantCount, expenses: ledgers, settlementMode: "simplified" });
  return { netMinor: result.netMinor, transfers: result.transfers, pairwiseTransfers: result.pairwiseTransfers };
}

function buildRows(
  canonicalOrder: readonly MemberRecord[],
  netMinor: readonly number[],
  currentMemberId: string,
): readonly BalanceMemberRow[] {
  return canonicalOrder.map((member, index) => ({
    memberId: member.memberId,
    name: member.name,
    color: member.color,
    netMinor: requireIndexed(netMinor, index, "netMinor"),
    isCurrentMember: member.memberId === currentMemberId,
    isInactive: member.deactivatedAt !== undefined,
  }));
}

function requireIndexedRow(rows: readonly BalanceMemberRow[], index: number): BalanceMemberRow {
  const row = rows[index];
  if (row === undefined) {
    throw new Error(`useGroupBalance: missing row at index ${index}`);
  }
  return row;
}

function buildPosition(
  canonicalOrder: readonly MemberRecord[],
  rows: readonly BalanceMemberRow[],
  directTransfers: readonly Transfer[],
  currentMemberId: string,
): CurrentMemberPosition {
  const currentIndex = canonicalOrder.findIndex((member) => member.memberId === currentMemberId);
  const currentRow = currentIndex === -1 ? undefined : requireIndexedRow(rows, currentIndex);
  return {
    memberId: currentMemberId,
    netMinor: currentRow?.netMinor ?? 0,
    directInboundCount: directTransfers.filter((transfer) => transfer.toIndex === currentIndex).length,
    directOutboundCount: directTransfers.filter((transfer) => transfer.fromIndex === currentIndex).length,
  };
}

function buildReadyState(
  group: GroupRecord,
  members: readonly MemberRecord[],
  expenses: readonly ExpenseRecord[],
): GroupBalanceState {
  const canonicalOrder = buildCanonicalOrder(members);
  if (canonicalOrder.length === 0 || expenses.length === 0) {
    return { status: "empty" };
  }

  const canonicalIds = canonicalOrder.map((member) => member.memberId);
  const currentMemberId = resolveCurrentMemberId(members);
  const { ledgers, uncountedExpenseCount } = buildLedgers(expenses, canonicalIds);
  const calc = computeCalculation(canonicalIds.length, ledgers);
  const rows = buildRows(canonicalOrder, calc.netMinor, currentMemberId);
  const position = buildPosition(canonicalOrder, rows, calc.pairwiseTransfers, currentMemberId);

  return {
    status: "ready",
    currency: group.baseCurrency,
    rows,
    simplifiedTransfers: calc.transfers,
    directTransfers: calc.pairwiseTransfers,
    initialMode: group.settings.simplifyDebts ? "simplified" : "direct",
    position,
    expenseCount: expenses.length,
    uncountedExpenseCount,
  };
}

interface LoadedState {
  readonly slug: string;
  readonly state: GroupBalanceState;
}

// Loads group + members (including inactive) + expenses straight from
// storage, same as use-group-detail.ts's independent load — features/settle
// and features/group each own their own read rather than sharing state
// across a feature boundary. Local reads don't get a spinner (F0-07); the
// "loading" status is just "nothing to render yet".
export function useGroupBalance(slug: string): GroupBalanceState {
  const [loaded, setLoaded] = useState<LoadedState>({ slug, state: { status: "loading" } });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const group = await groupRepository.getGroupBySlug(slug);
        if (cancelled) return;
        if (group === undefined) {
          setLoaded({ slug, state: { status: "empty" } });
          return;
        }
        const [members, expenses] = await Promise.all([
          memberRepository.listMembers(slug, { includeInactive: true }),
          expenseRepository.listExpensesByGroup(slug),
        ]);
        if (cancelled) return;
        setLoaded({ slug, state: buildReadyState(group, members, expenses) });
      } catch {
        if (cancelled) return;
        setLoaded({ slug, state: { status: "error", retry: () => setReloadToken((token) => token + 1) } });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, reloadToken]);

  return loaded.slug === slug ? loaded.state : { status: "loading" };
}
