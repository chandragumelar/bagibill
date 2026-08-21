import { useEffect, useState } from "react";
import type { ExpenseMemberInfo } from "@/lib/expense-summary";
import { summarizeExpenseRecord } from "@/lib/expense-summary";
import { expenseRepository, groupRepository, memberRepository } from "@/lib/storage/repositories";
import type { ExpenseRecord, GroupRecord, MemberRecord } from "@/lib/storage/records";
import type { RowEffect, TransactionRowData } from "./TransactionRow";

export interface TransactionListItem {
  readonly key: string;
  readonly date: number;
  /** The expense's own total, used for the day separator's subtotal. Zero for a broken row — its total can't be trusted. */
  readonly totalMinor: number;
  readonly row: TransactionRowData;
}

export type GroupDetailState =
  | { readonly status: "loading" }
  | { readonly status: "not-found" }
  | { readonly status: "error"; readonly retry: () => void }
  | {
      readonly status: "ready";
      readonly group: GroupRecord;
      readonly currency: string;
      readonly items: readonly TransactionListItem[];
    };

// Every member ever in the group, active or not — a deactivated member's
// name must still resolve on old rows (CLAUDE.md hard rule: deactivating
// never erases someone from history).
function buildMemberInfoMap(members: readonly MemberRecord[]): ReadonlyMap<string, ExpenseMemberInfo> {
  return new Map(
    members.map((member) => [member.memberId, { memberId: member.memberId, name: member.name, color: member.color }]),
  );
}

// Stand-in for "who am I in this group" until device identity exists
// (K-11/K-12 area, TERBUKA) — same precedent expense-draft.ts's
// createInitialDraft already uses for the default payer: the first active
// member by joinedAt.
function resolveCurrentMemberId(members: readonly MemberRecord[]): string {
  const active = members.filter((member) => member.deactivatedAt === undefined);
  const sorted = [...active].sort((a, b) => a.joinedAt - b.joinedAt);
  return sorted[0]?.memberId ?? "";
}

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

function buildEffect(memberOrder: readonly string[], currentMemberId: string, netMinorByMemberId: ReadonlyMap<string, number>): RowEffect {
  if (!memberOrder.includes(currentMemberId)) {
    return { kind: "out" };
  }
  const netMinor = netMinorByMemberId.get(currentMemberId) ?? 0;
  if (netMinor < 0) return { kind: "owed", netMinor };
  if (netMinor > 0) return { kind: "credit", netMinor };
  return { kind: "even" };
}

// The day separator's subtotal always uses the expense's own recorded
// total, not the derived summary — that field reads fine even when
// calculation fails (a broken row's money still counts toward the day's
// spend, only its per-member breakdown is untrustworthy).
function buildExpenseRow(
  expense: ExpenseRecord,
  group: GroupRecord,
  memberInfo: ReadonlyMap<string, ExpenseMemberInfo>,
  currentMemberId: string,
): TransactionRowData {
  try {
    const summary = summarizeExpenseRecord(expense, memberInfo);
    const memberOrder = summary.members.map((member) => member.memberId);
    const netByMemberId = new Map(summary.members.map((member) => [member.memberId, member.netMinor]));
    const payerNames = expense.payers.map((payer) => memberInfo.get(payer.memberId)?.name ?? "");
    const firstPayer = expense.payers[0];
    const firstPayerInfo = firstPayer === undefined ? undefined : memberInfo.get(firstPayer.memberId);
    const isForeignCurrency = expense.currency !== group.baseCurrency;

    return {
      kind: "expense",
      expenseId: expense.expenseId,
      title: expense.title,
      payerNames,
      isCurrentMemberPayer: expense.payers.some((payer) => payer.memberId === currentMemberId),
      payerAvatarInitials: firstPayerInfo === undefined ? "" : initialsFromName(firstPayerInfo.name),
      payerAvatarColor: firstPayerInfo?.color ?? "--n-5",
      hasAttachment: expense.attachments.length > 0,
      isPerItemMode: expense.splitData.mode === "byItems",
      foreignAmountMinor: isForeignCurrency ? expense.amountTotalMinor : undefined,
      foreignCurrency: isForeignCurrency ? expense.currency : undefined,
      effect: buildEffect(memberOrder, currentMemberId, netByMemberId),
    };
  } catch {
    return { kind: "broken", expenseId: expense.expenseId };
  }
}

function buildItems(
  expenses: readonly ExpenseRecord[],
  group: GroupRecord,
  memberInfo: ReadonlyMap<string, ExpenseMemberInfo>,
  currentMemberId: string,
): readonly TransactionListItem[] {
  return expenses.map((expense) => ({
    key: expense.expenseId,
    date: expense.date,
    totalMinor: expense.amountTotalMinor,
    row: buildExpenseRow(expense, group, memberInfo, currentMemberId),
  }));
}

// Loads group + members + expenses from local storage (IndexedDB via the
// shared repositories, K-72) and shapes them into rows ready for
// TransactionList/TransactionRow. Local reads don't get a spinner (F0-07:
// that's reserved for genuine network waits), but they can still fail or
// come back empty — three honest states, not one optimistic render.
//
// Settlements aren't included: there's no settlement repository yet
// (F3-07 builds that), and src/lib/storage/ is out of this task's scope —
// so `items` only ever carries expense (and, if calculation fails,
// broken) rows for now, never a settlement row, even though TransactionRow
// itself supports rendering one.
interface LoadedState {
  readonly slug: string;
  readonly state: GroupDetailState;
}

export function useGroupDetail(slug: string): GroupDetailState {
  const [loaded, setLoaded] = useState<LoadedState>({ slug, state: { status: "loading" } });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const group = await groupRepository.getGroupBySlug(slug);
        if (cancelled) return;
        if (group === undefined) {
          setLoaded({ slug, state: { status: "not-found" } });
          return;
        }
        const [members, expenses] = await Promise.all([
          memberRepository.listMembers(slug, { includeInactive: true }),
          expenseRepository.listExpensesByGroup(slug),
        ]);
        if (cancelled) return;
        const memberInfo = buildMemberInfoMap(members);
        const currentMemberId = resolveCurrentMemberId(members);
        setLoaded({
          slug,
          state: {
            status: "ready",
            group,
            currency: group.baseCurrency,
            items: buildItems(expenses, group, memberInfo, currentMemberId),
          },
        });
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

  // Falls back to "loading" whenever the slug being rendered hasn't been
  // loaded yet — covers first mount and a slug change alike, without ever
  // calling setState synchronously inside the effect body just to reset it.
  return loaded.slug === slug ? loaded.state : { status: "loading" };
}
