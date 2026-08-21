import {
  allocateExtraCharges,
  calculateExpense,
  splitByAdjustment,
  splitByAmounts,
  splitByPercentage,
  splitByWeights,
  splitEvenly,
} from "@bagibill/split-engine";
import type {
  ChargeAllocation,
  ChargeAmount,
  ExtraCharge,
  SplitInput,
  SplitWarning,
  Treat,
} from "@bagibill/split-engine";
import type { CategoryKey } from "@/lib/storage/templates";
import type { CreateExpenseInput } from "@/lib/storage/expense-repository";
import type { ChargeAllocationRecord, ChargeRecord, SplitDataRecord, TreatRecord } from "@/lib/storage/records";

type CalculateExpenseInput = Parameters<typeof calculateExpense>[0];

// spec.md 6.4: every member starts at weight 1, so an untouched Porsi draft
// already splits evenly — switching mode never needs to seed anything.
const DEFAULT_MEMBER_WEIGHT = 1;

export type ExpenseSplitMode = "evenly" | "byAmounts" | "byPercentage" | "byWeights" | "byAdjustment";

export type ChargeAmountKind = "percent" | "fixed";
export type ChargeDraftAllocationMode = "proportional" | "even" | "single_payer";

// The value is kept as raw typed text, not a parsed number — parsing "5" as
// 5 percent vs 5 rupiah depends on amountKind, and re-parsing on every
// keystroke while the field is still incomplete (a bare "-") would either
// throw or silently coerce to 0 mid-type. Translation to a real ChargeAmount
// happens once, at toCalculationInput/toCreateExpenseInput time.
export interface ChargeDraft {
  readonly id: string;
  readonly name: string;
  readonly amountKind: ChargeAmountKind;
  readonly rawValue: string;
  /** Only meaningful when amountKind is "percent" (K-34: no default basis). */
  readonly percentBasis: "subtotal" | "running_total";
  readonly allocationMode: ChargeDraftAllocationMode;
  /** Only meaningful when allocationMode is "single_payer". */
  readonly allocationMemberId: string;
}

export type TreatDraftKind = "person" | "partial";

export interface TreatDraft {
  readonly id: string;
  readonly kind: TreatDraftKind;
  readonly sponsorMemberId: string;
  readonly beneficiaryMemberId: string;
  /** Only meaningful when kind is "partial". */
  readonly partialAmountMinor: number;
}

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
  // amountMinor, percent, and adjustmentMinor are three separate fields, not
  // one "value" field reinterpreted per mode — 50 means Rp50, 50 percent, or
  // a Rp50 top-up depending on which one it is, and a single shared field
  // would make switching modes silently reinterpret whatever the person had
  // typed. Separate fields also survive a mode switch and back, the same way
  // charges/treats already survive across F3-03 — nothing typed is ever
  // discarded just because the screen is showing a different mode right now.
  readonly amountMinor: number;
  readonly percent: number;
  readonly adjustmentMinor: number;
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
  readonly charges: readonly ChargeDraft[];
  readonly treats: readonly TreatDraft[];
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
    members: init.members.map((member) => ({
      ...member,
      checked: true,
      weight: DEFAULT_MEMBER_WEIGHT,
      amountMinor: 0,
      percent: 0,
      adjustmentMinor: 0,
    })),
    payerMemberId: init.members[0]?.memberId ?? "",
    charges: [],
    treats: [],
  };
}

export type DraftNotReadyReason =
  | "emptyAmount"
  | "noParticipants"
  | "payerExcluded"
  | "allWeightsZero"
  | "percentageOutOfTolerance"
  | "amountsNotBalanced"
  | "amountsNeededForCharges"
  | "treatSponsorEqualsBeneficiary"
  | "treatMemberUnchecked"
  | "treatPartialAmountMissing";

// Shared with ExpenseFormRata/ExpenseFormPorsi so the reason -> message
// mapping lives once instead of duplicated per form (both already
// duplicate SPLIT_MODE_KEYS et al., but this one grows every time a new
// not-ready reason is added, and a Record<DraftNotReadyReason, string>
// missing a key is a type error the moment the union grows).
export const NOT_READY_MESSAGE_KEY: Record<DraftNotReadyReason, string> = {
  emptyAmount: "expense.result.needAmount",
  noParticipants: "expense.result.needParticipants",
  payerExcluded: "expense.result.payerExcluded",
  allWeightsZero: "expense.result.needWeights",
  percentageOutOfTolerance: "expense.result.percentageOutOfTolerance",
  amountsNotBalanced: "expense.result.amountsNotBalanced",
  amountsNeededForCharges: "expense.result.amountsNeededForCharges",
  treatSponsorEqualsBeneficiary: "expense.result.treatSponsorEqualsBeneficiary",
  treatMemberUnchecked: "expense.result.treatMemberUnchecked",
  treatPartialAmountMissing: "expense.result.treatPartialAmountMissing",
};

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
  if (mode === "byAmounts") {
    return { mode: "byAmounts", amountsMinor: checked.map((member) => member.amountMinor) };
  }
  if (mode === "byPercentage") {
    return { mode: "byPercentage", percentages: checked.map((member) => member.percent) };
  }
  if (mode === "byWeights") {
    return { mode: "byWeights", weights: checked.map((member) => member.weight) };
  }
  if (mode === "byAdjustment") {
    return { mode: "byAdjustment", adjustmentsMinor: checked.map((member) => member.adjustmentMinor) };
  }
  return { mode: "evenly", participantCount: checked.length };
}

// K-26: splitByPercentage's own tolerance is 1 basis point (0.01 percentage
// points) around 100 — checked here, before the engine ever sees the
// percentages, because splitByPercentage throws outside that tolerance
// (unlike splitByAmounts, which only warns). A Persen draft mid-typing is
// routinely far from 100 (spec.md 6.3 allows under/over while editing), so
// the line where the panel goes from "still typing" to "computable" has to
// sit exactly where the engine itself draws it, not an approximation of it.
export const PERCENTAGE_TOTAL = 100;
export const PERCENTAGE_TOLERANCE = 0.01;

// Percent is a ratio, not money (no minor units, no currency rounding) — the
// same category as weight, which the existing allWeightsZero check above
// already reduces over without touching money arithmetic.
export function sumPercent(checked: readonly ExpenseDraftMember[]): number {
  return checked.reduce((sum, member) => sum + member.percent, 0);
}

export function isPercentageBalanced(percentSum: number): boolean {
  return Math.abs(percentSum - PERCENTAGE_TOTAL) <= PERCENTAGE_TOLERANCE;
}

// Nominal's under/over-allocated state is never blocked while editing
// (spec.md 6.2) — the engine only warns, it never throws for a mismatch.
// Whether that mismatch blocks *saving* is decided from this same warning,
// read from an already-computed calculation, never recomputed here.
export function hasAllocationMismatchWarning(warnings: readonly SplitWarning[]): boolean {
  return warnings.some((warning) => warning.code === "under_allocated" || warning.code === "over_allocated");
}

// A charge row mid-typing ("", "-", "12.") parses to nothing yet — treated
// as 0 rather than blocking the whole panel, the same way a fresh row
// contributes nothing until filled in. Once ChargeEditor sanitizes keystrokes
// to digits/one-dot/leading-minus only, this never sees genuine garbage.
function parseChargeRawValue(rawValue: string): number {
  const trimmed = rawValue.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === ".") return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildChargeAmount(charge: ChargeDraft): ChargeAmount {
  const value = parseChargeRawValue(charge.rawValue);
  return charge.amountKind === "percent"
    ? { kind: "percent", percent: value, basis: charge.percentBasis }
    : { kind: "fixed", amountMinor: value };
}

// A single_payer target that no longer maps to a checked participant (the
// member got unchecked after being picked) degrades to "even" rather than
// crashing or blocking the whole draft — ChargeEditor only ever offers
// checked members as options, so this is a stale-selection fallback, not
// the everyday path.
function resolveSinglePayerIndex(
  charge: ChargeDraft,
  checked: readonly ExpenseDraftMember[],
): number | undefined {
  const index = checked.findIndex((member) => member.memberId === charge.allocationMemberId);
  return index === -1 ? undefined : index;
}

function buildChargeAllocation(charge: ChargeDraft, checked: readonly ExpenseDraftMember[]): ChargeAllocation {
  if (charge.allocationMode !== "single_payer") return { mode: charge.allocationMode };
  const participantIndex = resolveSinglePayerIndex(charge, checked);
  return participantIndex === undefined ? { mode: "even" } : { mode: "single_payer", participantIndex };
}

function buildCharges(charges: readonly ChargeDraft[], checked: readonly ExpenseDraftMember[]): readonly ExtraCharge[] {
  return charges.map((charge) => ({
    amount: buildChargeAmount(charge),
    allocation: buildChargeAllocation(charge, checked),
  }));
}

function computeBaseSharesMinor(
  mode: ExpenseSplitMode,
  totalMinor: number,
  checked: readonly ExpenseDraftMember[],
): readonly number[] {
  if (mode === "byAmounts") {
    return splitByAmounts({ totalMinor, amountsMinor: checked.map((member) => member.amountMinor) }).sharesMinor;
  }
  if (mode === "byPercentage") {
    return splitByPercentage({ totalMinor, percentages: checked.map((member) => member.percent) }).sharesMinor;
  }
  if (mode === "byWeights") {
    return splitByWeights({ totalMinor, weights: checked.map((member) => member.weight) }).sharesMinor;
  }
  if (mode === "byAdjustment") {
    return splitByAdjustment({ totalMinor, adjustmentsMinor: checked.map((member) => member.adjustmentMinor) })
      .sharesMinor;
  }
  return splitEvenly({ totalMinor, participantCount: checked.length }).sharesMinor;
}

// The single payer's payment must equal what they actually paid at
// checkout — the grand total after extra charges (tax, service, discounts),
// not the subtotal typed into the amount field. Treats never change this:
// a treat only moves an existing share between two people, it never adds
// or removes money from the bill (K-39). Only entered here through public
// split-engine exports (splitEvenly/splitByWeights/allocateExtraCharges),
// the same functions calculateExpense itself calls — never reaching into
// the engine's internal modules.
//
// Nominal (byAmounts) is handled separately: its own shares don't
// necessarily sum to draft.amountMinor while still being edited (spec.md
// 6.2 allows under/over-allocation), so pegging the payer's payment to the
// entered total would make calculateExpense's own payments-vs-shares check
// fail (K-43) for every not-yet-balanced state — not just a genuine save
// error, but the live preview itself, mid-typing. The payer's payment
// tracks whatever is actually allocated instead, so a preview can always be
// computed; isAmountsBalanced (the *save* gate) only ever passes once that
// number already equals draft.amountMinor exactly, so nothing here changes
// what actually gets saved.
function computeGrandTotalMinor(draft: ExpenseDraft, checked: readonly ExpenseDraftMember[]): number {
  const baseSharesMinor =
    draft.mode === "byAmounts"
      ? checked.map((member) => member.amountMinor)
      : computeBaseSharesMinor(draft.mode, draft.amountMinor, checked);
  if (draft.charges.length === 0) {
    return baseSharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
  }
  const chargeResult = allocateExtraCharges({ baseSharesMinor, charges: buildCharges(draft.charges, checked) });
  return chargeResult.totalSharesMinor.reduce((sum, shareMinor) => sum + shareMinor, 0);
}

// allocateExtraCharges rejects a proportional charge when every base share
// is zero (nothing to be proportional to) — reachable here because Nominal
// deliberately allows an all-zero draft (the "kosong" mockup state) while
// every other mode either can't be all-zero at this point or is already
// blocked earlier (allWeightsZero, percentageOutOfTolerance).
function hasProportionalChargeOnZeroAmounts(
  charges: readonly ChargeDraft[],
  checked: readonly ExpenseDraftMember[],
): boolean {
  const hasProportionalCharge = charges.some((charge) => charge.allocationMode === "proportional");
  return hasProportionalCharge && checked.every((member) => member.amountMinor === 0);
}

// The three new not-ready reasons plan.md F3-03 asks for, checked in the
// order spec.md 7.4 lists them: same person on both sides, a side pointing
// at someone not in the split, then an empty/zero partial amount. Only the
// first offending treat is reported — one clear reason beats a list of them
// while the draft is still being filled in.
function findInvalidTreatReason(
  treats: readonly TreatDraft[],
  checked: readonly ExpenseDraftMember[],
): DraftNotReadyReason | undefined {
  for (const treat of treats) {
    if (treat.sponsorMemberId === treat.beneficiaryMemberId) return "treatSponsorEqualsBeneficiary";
    const sponsorChecked = checked.some((member) => member.memberId === treat.sponsorMemberId);
    const beneficiaryChecked = checked.some((member) => member.memberId === treat.beneficiaryMemberId);
    if (!sponsorChecked || !beneficiaryChecked) return "treatMemberUnchecked";
    if (treat.kind === "partial" && treat.partialAmountMinor <= 0) return "treatPartialAmountMissing";
  }
  return undefined;
}

function buildTreats(treats: readonly TreatDraft[], checked: readonly ExpenseDraftMember[]): readonly Treat[] {
  return treats.map((treat) => {
    const sponsorIndex = checked.findIndex((member) => member.memberId === treat.sponsorMemberId);
    const beneficiaryIndex = checked.findIndex((member) => member.memberId === treat.beneficiaryMemberId);
    return treat.kind === "partial"
      ? { kind: "partial", sponsorIndex, beneficiaryIndex, amountMinor: treat.partialAmountMinor }
      : { kind: "person", sponsorIndex, beneficiaryIndex };
  });
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
  if (draft.mode === "byPercentage" && !isPercentageBalanced(sumPercent(checked))) {
    return { ready: false, reason: "percentageOutOfTolerance" };
  }
  if (draft.mode === "byAmounts" && hasProportionalChargeOnZeroAmounts(draft.charges, checked)) {
    return { ready: false, reason: "amountsNeededForCharges" };
  }

  const treatReason = findInvalidTreatReason(draft.treats, checked);
  if (treatReason !== undefined) return { ready: false, reason: treatReason };

  const payerAmountMinor = computeGrandTotalMinor(draft, checked);
  const paymentsMinor = checked.map((_, index) => (index === payerIndex ? payerAmountMinor : 0));

  // charges/treats are omitted entirely (not sent as []) when the draft has
  // none — calculateExpense already defaults both to [] internally, and
  // this keeps the input shape identical to before charges/treats existed
  // for every draft that isn't using them, which is what the pre-existing
  // Rata/Porsi tests assert with toEqual.
  return {
    ready: true,
    memberOrder: checked.map((member) => member.memberId),
    input: {
      totalMinor: draft.amountMinor,
      split: buildSplitInput(draft.mode, checked),
      paymentsMinor,
      ...(draft.charges.length > 0 ? { charges: buildCharges(draft.charges, checked) } : {}),
      ...(draft.treats.length > 0 ? { treats: buildTreats(draft.treats, checked) } : {}),
    },
  };
}

function buildSplitData(mode: ExpenseSplitMode, checked: readonly ExpenseDraftMember[]): SplitDataRecord {
  if (mode === "byAmounts") {
    return {
      mode: "byAmounts",
      entries: checked.map((member) => ({ memberId: member.memberId, amountMinor: member.amountMinor })),
    };
  }
  if (mode === "byPercentage") {
    return {
      mode: "byPercentage",
      entries: checked.map((member) => ({ memberId: member.memberId, percent: member.percent })),
    };
  }
  if (mode === "byWeights") {
    return {
      mode: "byWeights",
      entries: checked.map((member) => ({ memberId: member.memberId, weight: member.weight })),
    };
  }
  if (mode === "byAdjustment") {
    return {
      mode: "byAdjustment",
      entries: checked.map((member) => ({ memberId: member.memberId, adjustmentMinor: member.adjustmentMinor })),
    };
  }
  return { mode: "evenly", memberIds: checked.map((member) => member.memberId) };
}

// ChargeRecord (src/lib/storage/records.ts) has no name field — the engine
// never learns a charge's name (K-36) and the record layer hasn't grown one
// either, so a component's display name only lives in this draft/session
// and is not persisted. Flagged in progress.md rather than fixed here,
// since records.ts is out of this task's scope.
function buildChargeAllocationRecord(
  charge: ChargeDraft,
  checked: readonly ExpenseDraftMember[],
): ChargeAllocationRecord {
  if (charge.allocationMode !== "single_payer") return { mode: charge.allocationMode };
  const isValidTarget = checked.some((member) => member.memberId === charge.allocationMemberId);
  return isValidTarget ? { mode: "single_payer", memberId: charge.allocationMemberId } : { mode: "even" };
}

function buildChargeRecords(charges: readonly ChargeDraft[], checked: readonly ExpenseDraftMember[]): readonly ChargeRecord[] {
  return charges.map((charge) => ({
    amount: buildChargeAmount(charge),
    allocation: buildChargeAllocationRecord(charge, checked),
  }));
}

function buildTreatRecords(treats: readonly TreatDraft[]): readonly TreatRecord[] {
  return treats.map((treat) =>
    treat.kind === "partial"
      ? {
          kind: "partial",
          sponsorMemberId: treat.sponsorMemberId,
          beneficiaryMemberId: treat.beneficiaryMemberId,
          amountMinor: treat.partialAmountMinor,
        }
      : { kind: "person", sponsorMemberId: treat.sponsorMemberId, beneficiaryMemberId: treat.beneficiaryMemberId },
  );
}

// K-43/K-64: a stored expense's payments must sum to exactly its shares, or
// the repository's own calculation gate throws when it recomputes the
// expense to validate it. With no charges, the single payer pays
// draft.amountMinor as entered — so an amountsMinor sum that doesn't match
// it would fail that gate. Checked here, proactively, via the same warning
// the engine already computes (hasAllocationMismatchWarning), rather than
// letting the save call surface it as a thrown error.
function isAmountsBalanced(totalMinor: number, checked: readonly ExpenseDraftMember[]): boolean {
  const { warnings } = splitByAmounts({ totalMinor, amountsMinor: checked.map((member) => member.amountMinor) });
  return !hasAllocationMismatchWarning(warnings);
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
  if (draft.mode === "byPercentage" && !isPercentageBalanced(sumPercent(resolved.checked))) return null;
  if (draft.mode === "byAmounts" && hasProportionalChargeOnZeroAmounts(draft.charges, resolved.checked)) return null;
  if (draft.mode === "byAmounts" && !isAmountsBalanced(draft.amountMinor, resolved.checked)) return null;
  if (findInvalidTreatReason(draft.treats, resolved.checked) !== undefined) return null;

  return {
    groupSlug: save.groupSlug,
    title: draft.title,
    category: draft.category,
    date: save.date,
    notes: "",
    currency: draft.currency,
    fxRate: 1,
    amountTotalMinor: draft.amountMinor,
    payers: [{ memberId: draft.payerMemberId, amountMinor: computeGrandTotalMinor(draft, resolved.checked) }],
    splitData: buildSplitData(draft.mode, resolved.checked),
    charges: buildChargeRecords(draft.charges, resolved.checked),
    items: [],
    treats: buildTreatRecords(draft.treats),
    attachments: [],
    createdBy: save.createdBy,
  };
}
