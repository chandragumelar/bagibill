import { useMemo, useState } from "react";
import { calculateExpense } from "@bagibill/split-engine";
import type { ExpenseCalculation } from "@bagibill/split-engine";
import { createInitialDraft, toCalculationInput } from "./expense-draft";
import type { DraftInit, DraftNotReadyReason, ExpenseDraft, ExpenseSplitMode } from "./expense-draft";

export type ExpenseDraftResult =
  | { readonly ready: true; readonly calculation: ExpenseCalculation; readonly memberOrder: readonly string[] }
  | { readonly ready: false; readonly reason: DraftNotReadyReason };

export interface UseExpenseDraftResult {
  readonly draft: ExpenseDraft;
  readonly result: ExpenseDraftResult;
  readonly setTitle: (title: string) => void;
  readonly setAmountMinor: (amountMinor: number) => void;
  readonly setMode: (mode: ExpenseSplitMode) => void;
  readonly setWeight: (memberId: string, weight: number) => void;
  readonly toggleMember: (memberId: string) => void;
  readonly checkAllMembers: () => void;
}

// The result is a plain useMemo over draft — never a second piece of state
// written by an effect. A "calculate" button or an effect that copies the
// result into state both create a second source of truth for the same
// number, and that's exactly how a saved expense and its own preview panel
// end up disagreeing (CLAUDE.md: two screens showing the same number must
// render from the same structure).
export function useExpenseDraft(init: DraftInit): UseExpenseDraftResult {
  const [draft, setDraft] = useState<ExpenseDraft>(() => createInitialDraft(init));

  const result = useMemo<ExpenseDraftResult>(() => {
    const translated = toCalculationInput(draft);
    if (!translated.ready) return translated;
    return {
      ready: true,
      calculation: calculateExpense(translated.input),
      memberOrder: translated.memberOrder,
    };
  }, [draft]);

  function setTitle(title: string): void {
    setDraft((current) => ({ ...current, title }));
  }

  function setAmountMinor(amountMinor: number): void {
    setDraft((current) => ({ ...current, amountMinor }));
  }

  // Switching modes never touches title, amount, or membership — the same
  // draft.members array (checked flags and all) carries over, which is
  // what keeps a Rata-to-Porsi switch from resetting anything (plan.md F3-02).
  function setMode(mode: ExpenseSplitMode): void {
    setDraft((current) => ({ ...current, mode }));
  }

  function setWeight(memberId: string, weight: number): void {
    setDraft((current) => ({
      ...current,
      members: current.members.map((member) => (member.memberId === memberId ? { ...member, weight } : member)),
    }));
  }

  function toggleMember(memberId: string): void {
    setDraft((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.memberId === memberId ? { ...member, checked: !member.checked } : member,
      ),
    }));
  }

  function checkAllMembers(): void {
    setDraft((current) => ({
      ...current,
      members: current.members.map((member) => ({ ...member, checked: true })),
    }));
  }

  return { draft, result, setTitle, setAmountMinor, setMode, setWeight, toggleMember, checkAllMembers };
}
