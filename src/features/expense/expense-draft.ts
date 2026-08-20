import { calculateExpense } from "@bagibill/split-engine";
import type { CategoryKey } from "@/lib/storage/templates";
import type { CreateExpenseInput } from "@/lib/storage/expense-repository";

type CalculateExpenseInput = Parameters<typeof calculateExpense>[0];

export interface ExpenseDraftMember {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
  readonly checked: boolean;
}

// Everything the Rata screen's form holds. No engine input shape here on
// purpose — that's what toCalculationInput/toCreateExpenseInput derive, so
// there's exactly one place that knows how a draft becomes money math.
export interface ExpenseDraft {
  readonly title: string;
  readonly amountMinor: number;
  readonly date: number;
  readonly category: CategoryKey;
  readonly currency: string;
  readonly members: readonly ExpenseDraftMember[];
  readonly payerMemberId: string;
}

export interface DraftInitMember {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
}

export interface DraftInit {
  /** Display order — becomes both the checked-list order and, on save, SplitDataRecord.memberIds order. */
  readonly members: readonly DraftInitMember[];
  readonly currency: string;
  readonly category: CategoryKey;
  readonly date: number;
}

// spec.md default: every active member starts checked, first member by
// joinedAt starts as payer. There's no field yet for "who am I in this
// group" (device identity, tracked separately from progress.md), so the
// first member is a stand-in default, not a real identity lookup.
export function createInitialDraft(init: DraftInit): ExpenseDraft {
  return {
    title: "",
    amountMinor: 0,
    date: init.date,
    category: init.category,
    currency: init.currency,
    members: init.members.map((member) => ({ ...member, checked: true })),
    payerMemberId: init.members[0]?.memberId ?? "",
  };
}

export type DraftNotReadyReason = "emptyAmount" | "noParticipants" | "payerExcluded";

export type DraftCalculationInput =
  | { readonly ready: true; readonly input: CalculateExpenseInput; readonly memberOrder: readonly string[] }
  | { readonly ready: false; readonly reason: DraftNotReadyReason };

interface ResolvedParticipants {
  readonly checked: readonly ExpenseDraftMember[];
  readonly payerIndex: number;
}

// Shared by toCalculationInput and toCreateExpenseInput so "who's actually
// in this split, and where does the payer sit" is decided in one place.
function resolveParticipants(draft: ExpenseDraft): ResolvedParticipants | undefined {
  const checked = draft.members.filter((member) => member.checked);
  if (checked.length === 0) return undefined;
  const payerIndex = checked.findIndex((member) => member.memberId === draft.payerMemberId);
  if (payerIndex === -1) return undefined;
  return { checked, payerIndex };
}

// The result panel must show something the moment the screen opens, before
// any typing happens — so an incomplete draft (no amount yet, nobody
// checked) returns a reason to display, not a thrown error. Errors from the
// engine's own validation only matter at save time (F2-03's calculation
// gate), not while the draft is still being filled in.
export function toCalculationInput(draft: ExpenseDraft): DraftCalculationInput {
  if (draft.amountMinor <= 0) return { ready: false, reason: "emptyAmount" };

  const resolved = resolveParticipants(draft);
  if (resolved === undefined) {
    const anyChecked = draft.members.some((member) => member.checked);
    return { ready: false, reason: anyChecked ? "payerExcluded" : "noParticipants" };
  }

  const { checked, payerIndex } = resolved;
  const paymentsMinor = checked.map((_, index) => (index === payerIndex ? draft.amountMinor : 0));

  return {
    ready: true,
    memberOrder: checked.map((member) => member.memberId),
    input: {
      totalMinor: draft.amountMinor,
      split: { mode: "evenly", participantCount: checked.length },
      paymentsMinor,
    },
  };
}

// Mirrors toCalculationInput's readiness check, but returns the shape
// createExpense (F2-03 repository) accepts instead of calculateExpense's.
// null means the same "not ready yet" the panel already shows — the save
// button stays disabled in that state, so this is never called expecting a
// value while it's null.
export function toCreateExpenseInput(
  draft: ExpenseDraft,
  save: { readonly groupSlug: string; readonly createdBy: string; readonly date: number },
): CreateExpenseInput | null {
  if (draft.amountMinor <= 0) return null;
  const resolved = resolveParticipants(draft);
  if (resolved === undefined) return null;

  const memberIds = resolved.checked.map((member) => member.memberId);
  return {
    groupSlug: save.groupSlug,
    title: draft.title,
    category: draft.category,
    date: save.date,
    notes: "",
    currency: draft.currency,
    fxRate: 1,
    amountTotalMinor: draft.amountMinor,
    payers: [{ memberId: draft.payerMemberId, amountMinor: draft.amountMinor }],
    splitData: { mode: "evenly", memberIds },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: save.createdBy,
  };
}
