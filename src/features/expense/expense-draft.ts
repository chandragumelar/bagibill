import { calculateExpense } from "@bagibill/split-engine";
import type { SplitInput } from "@bagibill/split-engine";
import type { CategoryKey } from "@/lib/storage/templates";
import type { CreateExpenseInput } from "@/lib/storage/expense-repository";
import type { SplitDataRecord } from "@/lib/storage/records";

type CalculateExpenseInput = Parameters<typeof calculateExpense>[0];

// spec.md 6.4: every member starts at weight 1, so an untouched Porsi draft
// already splits evenly — switching mode never needs to seed anything.
const DEFAULT_MEMBER_WEIGHT = 1;

export type ExpenseSplitMode = "evenly" | "byWeights";

export interface ExpenseDraftMember {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
  readonly checked: boolean;
  // Weight and checked are deliberately separate fields, not one enum —
  // an unchecked member leaves memberIds entirely (never appears in the
  // result), while a checked member at weight 0 stays in memberIds with a
  // zero share and still renders (spec.md 6.4: "ikut tercatat tapi tidak
  // bayar"). Collapsing them into one state would make that distinction
  // impossible to represent.
  readonly weight: number;
}

// Everything the add-expense screen's form holds, across both modes it
// currently supports. No engine input shape here on purpose — that's what
// toCalculationInput/toCreateExpenseInput derive, so there's exactly one
// place that knows how a draft becomes money math.
export interface ExpenseDraft {
  readonly title: string;
  readonly amountMinor: number;
  readonly date: number;
  readonly category: CategoryKey;
  readonly currency: string;
  readonly mode: ExpenseSplitMode;
  readonly members: readonly ExpenseDraftMember[];
  readonly payerMemberId: string;
}

export interface DraftInitMember {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
}

export interface DraftInit {
  /** Display order — becomes both the checked-list order and, on save, SplitDataRecord.memberIds/entries order. */
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
    mode: "evenly",
    members: init.members.map((member) => ({ ...member, checked: true, weight: DEFAULT_MEMBER_WEIGHT })),
    payerMemberId: init.members[0]?.memberId ?? "",
  };
}

export type DraftNotReadyReason = "emptyAmount" | "noParticipants" | "payerExcluded" | "allWeightsZero";

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

function buildSplitInput(mode: ExpenseSplitMode, checked: readonly ExpenseDraftMember[]): SplitInput {
  if (mode === "byWeights") {
    return { mode: "byWeights", weights: checked.map((member) => member.weight) };
  }
  return { mode: "evenly", participantCount: checked.length };
}

// The result panel must show something the moment the screen opens, before
// any typing happens — so an incomplete draft (no amount yet, nobody
// checked, or every checked person weighs zero) returns a reason to
// display, not a thrown error. Errors from the engine's own validation
// only matter at save time (F2-03's calculation gate), not while the draft
// is still being filled in.
export function toCalculationInput(draft: ExpenseDraft): DraftCalculationInput {
  if (draft.amountMinor <= 0) return { ready: false, reason: "emptyAmount" };

  const resolved = resolveParticipants(draft);
  if (resolved === undefined) {
    const anyChecked = draft.members.some((member) => member.checked);
    return { ready: false, reason: anyChecked ? "payerExcluded" : "noParticipants" };
  }

  const { checked, payerIndex } = resolved;
  if (draft.mode === "byWeights" && checked.every((member) => member.weight === 0)) {
    return { ready: false, reason: "allWeightsZero" };
  }

  const paymentsMinor = checked.map((_, index) => (index === payerIndex ? draft.amountMinor : 0));

  return {
    ready: true,
    memberOrder: checked.map((member) => member.memberId),
    input: {
      totalMinor: draft.amountMinor,
      split: buildSplitInput(draft.mode, checked),
      paymentsMinor,
    },
  };
}

function buildSplitData(mode: ExpenseSplitMode, checked: readonly ExpenseDraftMember[]): SplitDataRecord {
  if (mode === "byWeights") {
    return {
      mode: "byWeights",
      entries: checked.map((member) => ({ memberId: member.memberId, weight: member.weight })),
    };
  }
  return { mode: "evenly", memberIds: checked.map((member) => member.memberId) };
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
  if (draft.mode === "byWeights" && resolved.checked.every((member) => member.weight === 0)) return null;

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
    splitData: buildSplitData(draft.mode, resolved.checked),
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: save.createdBy,
  };
}
