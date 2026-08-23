import { useState } from "react";
import type { Transfer } from "@bagibill/split-engine";
import { formatMoney, t } from "@/lib/i18n";
import { useUndoQueue } from "@/shared/system";
import { useSettlements } from "./use-settlements";
import type { SaveSettlementInput, SettleSheetTarget } from "./SettleSheet";
import type { PaymentNoteSheetTarget } from "./PaymentNoteSheet";
import type { RemindSheetTarget } from "./RemindSheet";
import type { SettlementHistoryEntry } from "./SettlementHistory";
import type { TraceSheetTarget } from "./TraceSheet";
import type { BalanceMemberRow, GroupBalanceState } from "./use-group-balance";

type ReadyBalance = Extract<GroupBalanceState, { status: "ready" }>;

function findRow(rows: readonly BalanceMemberRow[], memberId: string): BalanceMemberRow | undefined {
  return rows.find((row) => row.memberId === memberId);
}

function toHistoryEntries(
  settlements: ReturnType<typeof useSettlements>["settlements"],
  rows: readonly BalanceMemberRow[],
): readonly SettlementHistoryEntry[] {
  const entries: SettlementHistoryEntry[] = [];
  for (const settlement of settlements) {
    const fromRow = findRow(rows, settlement.fromMemberId);
    const toRow = findRow(rows, settlement.toMemberId);
    if (fromRow === undefined || toRow === undefined) continue;
    entries.push({
      settlementId: settlement.settlementId,
      fromName: fromRow.name,
      fromColor: fromRow.color,
      toName: toRow.name,
      toColor: toRow.color,
      amountMinor: settlement.amountMinor,
      date: settlement.date,
      note: settlement.note,
    });
  }
  return entries;
}

export interface UseSettleActionsResult {
  readonly historyEntries: readonly SettlementHistoryEntry[];
  readonly settleTarget: SettleSheetTarget | undefined;
  readonly noteTarget: PaymentNoteSheetTarget | undefined;
  readonly remindTarget: RemindSheetTarget | undefined;
  readonly traceTarget: TraceSheetTarget | undefined;
  readonly closeSettle: () => void;
  readonly closeNote: () => void;
  readonly closeRemind: () => void;
  readonly closeTrace: () => void;
  readonly onSettleTransfer: (transfer: Transfer) => void;
  readonly onSendInfo: (memberId: string) => void;
  readonly onRemindMember: (memberId: string, amountMinor: number) => void;
  readonly onSelectMember: (memberId: string) => void;
  readonly onTraceMember: (memberId: string) => void;
  readonly onTraceTransfer: (transfer: Transfer) => void;
  readonly saveSettlement: (input: SaveSettlementInput) => Promise<void>;
  readonly undoHistoryEntry: (settlementId: string) => void;
  readonly toast: ReturnType<typeof useUndoQueue<string>>;
}

// Orchestrates the three sheets from F3-07 bagian 2 (settle, payment note,
// remind) plus the settlement history list and its undo wiring — split out
// of BalanceTab.tsx so that file stays about tab layout, not about five
// different pieces of settlement state.
export function useSettleActions(balance: ReadyBalance): UseSettleActionsResult {
  const settlementsHook = useSettlements(balance.groupSlug);
  const toast = useUndoQueue<string>();
  const [settleTarget, setSettleTarget] = useState<SettleSheetTarget | undefined>(undefined);
  const [noteTarget, setNoteTarget] = useState<PaymentNoteSheetTarget | undefined>(undefined);
  const [remindTarget, setRemindTarget] = useState<RemindSheetTarget | undefined>(undefined);
  const [traceTarget, setTraceTarget] = useState<TraceSheetTarget | undefined>(undefined);

  function onSettleTransfer(transfer: Transfer): void {
    const fromRow = balance.rows[transfer.fromIndex];
    const toRow = balance.rows[transfer.toIndex];
    if (fromRow === undefined || toRow === undefined) return;
    setSettleTarget({
      fromMemberId: fromRow.memberId,
      fromName: fromRow.name,
      fromColor: fromRow.color,
      toMemberId: toRow.memberId,
      toName: toRow.name,
      toColor: toRow.color,
      suggestedAmountMinor: transfer.amountMinor,
    });
  }

  function onSendInfo(memberId: string): void {
    const row = findRow(balance.rows, memberId);
    if (row === undefined) return;
    setNoteTarget({ memberId: row.memberId, name: row.name, netMinor: row.netMinor, paymentNote: row.paymentNote, canRemind: false });
  }

  function onRemindMember(memberId: string, amountMinor: number): void {
    const row = findRow(balance.rows, memberId);
    const me = balance.rows.find((candidate) => candidate.isCurrentMember);
    if (row === undefined) return;
    setRemindTarget({
      debtorName: row.name,
      groupName: balance.groupName,
      formattedAmount: formatMoney(amountMinor, balance.currency),
      recipientNote: me?.paymentNote,
    });
  }

  function onSelectMember(memberId: string): void {
    const row = findRow(balance.rows, memberId);
    if (row === undefined) return;
    const canRemind = !row.isCurrentMember && row.netMinor < 0;
    setNoteTarget({ memberId: row.memberId, name: row.name, netMinor: row.netMinor, paymentNote: row.paymentNote, canRemind });
  }

  function onTraceMember(memberId: string): void {
    setTraceTarget({ kind: "member", memberId });
  }

  function onTraceTransfer(transfer: Transfer): void {
    setTraceTarget({ kind: "transfer", transfer });
  }

  async function saveSettlement(input: SaveSettlementInput): Promise<void> {
    const created = await settlementsHook.createSettlement(input);
    balance.reload();
    toast.remove(
      { id: created.settlementId, message: t("settle.toast.recorded", { amount: formatMoney(created.amountMinor, created.currency) }), data: created.settlementId },
      (settlementId) => {
        void settlementsHook.undoSettlement(settlementId).then(() => balance.reload());
      },
      () => {},
    );
  }

  function undoHistoryEntry(settlementId: string): void {
    void settlementsHook.undoSettlement(settlementId).then(() => balance.reload());
  }

  return {
    historyEntries: toHistoryEntries(settlementsHook.settlements, balance.rows),
    settleTarget,
    noteTarget,
    remindTarget,
    traceTarget,
    closeSettle: () => setSettleTarget(undefined),
    closeNote: () => setNoteTarget(undefined),
    closeRemind: () => setRemindTarget(undefined),
    closeTrace: () => setTraceTarget(undefined),
    onSettleTransfer,
    onSendInfo,
    onRemindMember,
    onSelectMember,
    onTraceMember,
    onTraceTransfer,
    saveSettlement,
    undoHistoryEntry,
    toast,
  };
}
