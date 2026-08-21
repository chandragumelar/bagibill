import { useMemo, useState } from "react";
import { calculateExpense } from "@bagibill/split-engine";
import type { ExpenseCalculation } from "@bagibill/split-engine";
import { t } from "@/lib/i18n";
import { getChargePresets } from "./charge-presets";
import { createInitialDraft, toCalculationInput } from "./expense-draft";
import type {
  ChargeDraft,
  DraftInit,
  DraftNotReadyReason,
  ExpenseDraft,
  ExpenseSplitMode,
  TreatDraft,
} from "./expense-draft";

// spec.md 7.1's default allocation for a fresh custom charge — proportional
// is also what the preset uses for tax/service (spec.md 7.3: "default untuk
// pajak dan service").
const DEFAULT_CHARGE_ALLOCATION_MODE = "proportional";
const DEFAULT_PERCENT_BASIS = "subtotal";

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
  readonly setMemberAmountMinor: (memberId: string, amountMinor: number) => void;
  readonly setPercent: (memberId: string, percent: number) => void;
  readonly setPercents: (updates: readonly { readonly memberId: string; readonly percent: number }[]) => void;
  readonly setAdjustmentMinor: (memberId: string, adjustmentMinor: number) => void;
  readonly toggleMember: (memberId: string) => void;
  readonly checkAllMembers: () => void;
  readonly addEmptyCharge: () => void;
  readonly loadChargePresets: () => void;
  readonly updateCharge: (id: string, patch: Partial<ChargeDraft>) => void;
  readonly removeCharge: (id: string) => void;
  readonly addTreat: () => void;
  readonly updateTreat: (id: string, patch: Partial<TreatDraft>) => void;
  readonly removeTreat: (id: string) => void;
}

function firstCheckedMemberId(members: ExpenseDraft["members"]): string {
  return members.find((member) => member.checked)?.memberId ?? "";
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

  function setMemberAmountMinor(memberId: string, amountMinor: number): void {
    setDraft((current) => ({
      ...current,
      members: current.members.map((member) => (member.memberId === memberId ? { ...member, amountMinor } : member)),
    }));
  }

  function setPercent(memberId: string, percent: number): void {
    setDraft((current) => ({
      ...current,
      members: current.members.map((member) => (member.memberId === memberId ? { ...member, percent } : member)),
    }));
  }

  // Applies every "ratakan sisa" update in one setDraft call — the updates
  // are computed together (PercentageTrack.computeSpreadRemainingPercent),
  // so applying them one member at a time would mean intermediate renders
  // with only some of the spread reflected in draft.members.
  function setPercents(updates: readonly { readonly memberId: string; readonly percent: number }[]): void {
    setDraft((current) => {
      const percentByMemberId = new Map(updates.map((update) => [update.memberId, update.percent]));
      return {
        ...current,
        members: current.members.map((member) => {
          const percent = percentByMemberId.get(member.memberId);
          return percent === undefined ? member : { ...member, percent };
        }),
      };
    });
  }

  function setAdjustmentMinor(memberId: string, adjustmentMinor: number): void {
    setDraft((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.memberId === memberId ? { ...member, adjustmentMinor } : member,
      ),
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

  function addEmptyCharge(): void {
    setDraft((current) => ({
      ...current,
      charges: [
        ...current.charges,
        {
          id: crypto.randomUUID(),
          name: "",
          amountKind: "percent",
          rawValue: "",
          percentBasis: DEFAULT_PERCENT_BASIS,
          allocationMode: DEFAULT_CHARGE_ALLOCATION_MODE,
          allocationMemberId: firstCheckedMemberId(current.members),
        },
      ],
    }));
  }

  // Presets seed editable rows, not locked values — the name is resolved to
  // display text once, here, rather than carrying the translation key
  // forward into the draft (ChargeEditor's rename field is plain text either
  // way, custom or preset).
  function loadChargePresets(): void {
    setDraft((current) => {
      const allocationMemberId = firstCheckedMemberId(current.members);
      const newCharges: ChargeDraft[] = getChargePresets(current.currency).map((preset) => ({
        id: crypto.randomUUID(),
        name: t(preset.nameKey),
        amountKind: preset.amountKind,
        rawValue: preset.rawValue,
        percentBasis: preset.percentBasis,
        allocationMode: preset.allocationMode,
        allocationMemberId,
      }));
      return { ...current, charges: [...current.charges, ...newCharges] };
    });
  }

  function updateCharge(id: string, patch: Partial<ChargeDraft>): void {
    setDraft((current) => ({
      ...current,
      charges: current.charges.map((charge) => (charge.id === id ? { ...charge, ...patch } : charge)),
    }));
  }

  function removeCharge(id: string): void {
    setDraft((current) => ({ ...current, charges: current.charges.filter((charge) => charge.id !== id) }));
  }

  // Seeds sponsor/beneficiary from the first two checked members when
  // there are enough of them — TreatEditor disables its own add control
  // below two checked members, so the same-person fallback here is never
  // actually reachable through the UI.
  function addTreat(): void {
    setDraft((current) => {
      const checkedMembers = current.members.filter((member) => member.checked);
      const sponsorMemberId = checkedMembers[0]?.memberId ?? "";
      const beneficiaryMemberId = checkedMembers[1]?.memberId ?? "";
      return {
        ...current,
        treats: [
          ...current.treats,
          { id: crypto.randomUUID(), kind: "person", sponsorMemberId, beneficiaryMemberId, partialAmountMinor: 0 },
        ],
      };
    });
  }

  function updateTreat(id: string, patch: Partial<TreatDraft>): void {
    setDraft((current) => ({
      ...current,
      treats: current.treats.map((treat) => (treat.id === id ? { ...treat, ...patch } : treat)),
    }));
  }

  function removeTreat(id: string): void {
    setDraft((current) => ({ ...current, treats: current.treats.filter((treat) => treat.id !== id) }));
  }

  return {
    draft,
    result,
    setTitle,
    setAmountMinor,
    setMode,
    setWeight,
    setMemberAmountMinor,
    setPercent,
    setPercents,
    setAdjustmentMinor,
    toggleMember,
    checkAllMembers,
    addEmptyCharge,
    loadChargePresets,
    updateCharge,
    removeCharge,
    addTreat,
    updateTreat,
    removeTreat,
  };
}
