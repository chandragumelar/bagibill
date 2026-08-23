import { useEffect, useState } from "react";
import { calculateExpense, calculateGroupBalances } from "@bagibill/split-engine";
import type { ExpenseLedger, Transfer } from "@bagibill/split-engine";
import { resolveMemberOrder, toCalculationInput } from "@/lib/storage/expense-mapping";
import { expenseRepository, groupRepository, memberRepository, settlementRepository } from "@/lib/storage/repositories";
import type { ExpenseRecord, GroupRecord, MemberRecord, SettlementRecord } from "@/lib/storage/records";
import type { LedgerOrigin } from "./settlement-trace";

export interface BalanceMemberRow {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
  readonly netMinor: number;
  readonly isCurrentMember: boolean;
  readonly isInactive: boolean;
  readonly paymentNote?: string;
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
      readonly settlementCount: number;
      readonly groupSlug: string;
      readonly groupName: string;
      /** Same array (order and length) fed into computeGroupBalances as `expenses` — TraceSheet zips this against `origins` index-for-index to trace a member's balance back to real transactions (settlement-trace.ts). */
      readonly ledgers: readonly ExpenseLedger[];
      /** Parallel to `ledgers`: origins[i] describes what produced ledgers[i]. Kept in lockstep by buildReadyState below — never reordered independently. */
      readonly origins: readonly LedgerOrigin[];
      /** Re-fetches group + members + expenses + settlements from storage — call after creating or undoing a settlement so the tab reflects it without a full page reload. */
      readonly reload: () => void;
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

// A settlement is folded into the same balance calculation as every
// expense, as one more synthetic ExpenseLedger, instead of subtracting it
// from netMinor by hand after computeCalculation runs. A second arithmetic
// path outside the engine is a second place K-43's "shares sum to the
// total" invariant would have to be re-proven, and the two would eventually
// drift. Here the payer's paymentsMinor and the payee's sharesMinor are
// both set to the same amount (everyone else's stay 0), so the ledger's own
// sum-to-total check passes for free and the net effect fed to the engine
// is exactly "payer's balance goes up, payee's goes down" — precedent noted
// in progress.md's Keputusan for this PR.
function buildSettlementLedger(settlement: SettlementRecord, canonicalIds: readonly string[]): ExpenseLedger | undefined {
  const fromIndex = canonicalIds.indexOf(settlement.fromMemberId);
  const toIndex = canonicalIds.indexOf(settlement.toMemberId);
  // Unreachable in practice: member-repository.deleteMember refuses to
  // delete a member who appears in any SettlementRecord, so both ids always
  // resolve. Kept as a guard rather than a thrown error so a future change
  // to that guarantee degrades to "this settlement is excluded", not a
  // crashed balance tab.
  if (fromIndex === -1 || toIndex === -1) return undefined;
  const paymentsMinor = canonicalIds.map((_, index) => (index === fromIndex ? settlement.amountMinor : 0));
  const sharesMinor = canonicalIds.map((_, index) => (index === toIndex ? settlement.amountMinor : 0));
  return { sharesMinor, paymentsMinor };
}

interface SettlementLedgerBuild {
  readonly ledgers: readonly ExpenseLedger[];
  readonly origins: readonly LedgerOrigin[];
}

function buildSettlementLedgers(
  settlements: readonly SettlementRecord[],
  canonicalIds: readonly string[],
): SettlementLedgerBuild {
  const ledgers: ExpenseLedger[] = [];
  const origins: LedgerOrigin[] = [];
  for (const settlement of settlements) {
    const ledger = buildSettlementLedger(settlement, canonicalIds);
    if (ledger === undefined) continue;
    ledgers.push(ledger);
    origins.push({
      kind: "settlement",
      settlementId: settlement.settlementId,
      date: settlement.date,
      fromMemberId: settlement.fromMemberId,
      toMemberId: settlement.toMemberId,
      note: settlement.note,
    });
  }
  return { ledgers, origins };
}

interface LedgerBuild {
  readonly ledgers: readonly ExpenseLedger[];
  readonly origins: readonly LedgerOrigin[];
  readonly uncountedExpenseCount: number;
}

function buildLedgers(expenses: readonly ExpenseRecord[], canonicalIds: readonly string[]): LedgerBuild {
  const ledgers: ExpenseLedger[] = [];
  const origins: LedgerOrigin[] = [];
  let uncountedExpenseCount = 0;
  for (const expense of expenses) {
    const ledger = buildLedger(expense, canonicalIds);
    if (ledger === undefined) {
      uncountedExpenseCount++;
    } else {
      ledgers.push(ledger);
      origins.push({ kind: "expense", expenseId: expense.expenseId, title: expense.title, date: expense.date });
    }
  }
  return { ledgers, origins, uncountedExpenseCount };
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
    paymentNote: member.paymentNote,
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
  settlements: readonly SettlementRecord[],
  reload: () => void,
): GroupBalanceState {
  const canonicalOrder = buildCanonicalOrder(members);
  if (canonicalOrder.length === 0 || (expenses.length === 0 && settlements.length === 0)) {
    return { status: "empty" };
  }

  const canonicalIds = canonicalOrder.map((member) => member.memberId);
  const currentMemberId = resolveCurrentMemberId(members);
  const { ledgers: expenseLedgers, origins: expenseOrigins, uncountedExpenseCount } = buildLedgers(expenses, canonicalIds);
  const { ledgers: settlementLedgers, origins: settlementOrigins } = buildSettlementLedgers(settlements, canonicalIds);
  // Concatenation order here is the contract settlement-trace.ts's
  // traceMemberBalance relies on: ledgers[i] and origins[i] must describe
  // the same transaction, so these two lines are never allowed to drift
  // apart (K-decision, progress.md).
  const ledgers = [...expenseLedgers, ...settlementLedgers];
  const origins = [...expenseOrigins, ...settlementOrigins];
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
    settlementCount: settlements.length,
    groupSlug: group.slug,
    groupName: group.name,
    ledgers,
    origins,
    reload,
  };
}

interface LoadedState {
  readonly slug: string;
  readonly state: GroupBalanceState;
}

// Loads group + members (including inactive) + expenses + settlements
// straight from storage, same as use-group-detail.ts's independent load —
// features/settle and features/group each own their own read rather than
// sharing state across a feature boundary. Local reads don't get a spinner
// (F0-07); the "loading" status is just "nothing to render yet".
export function useGroupBalance(slug: string): GroupBalanceState {
  const [loaded, setLoaded] = useState<LoadedState>({ slug, state: { status: "loading" } });
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((token) => token + 1);

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
        const [members, expenses, settlements] = await Promise.all([
          memberRepository.listMembers(slug, { includeInactive: true }),
          expenseRepository.listExpensesByGroup(slug),
          settlementRepository.listSettlementsByGroup(slug),
        ]);
        if (cancelled) return;
        setLoaded({ slug, state: buildReadyState(group, members, expenses, settlements, reload) });
      } catch {
        if (cancelled) return;
        setLoaded({ slug, state: { status: "error", retry: reload } });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, reloadToken]);

  return loaded.slug === slug ? loaded.state : { status: "loading" };
}
