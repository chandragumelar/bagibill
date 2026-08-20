// spec.md 7.2 presets are "kontekstual berdasarkan locale grup" — but a
// group only ever records a currency, never a separate locale field, so
// currency is the one signal this repo actually has to pick a preset with.
// IDR is the only currency gelombang 1 exposes anywhere (MoneyInput itself
// is zero-decimal-only, K-75), so IDR selects the Indonesia preset and
// everything else falls back to the generic one. Documented as a decision
// in progress.md rather than assumed silently.
const IDR_CURRENCY = "IDR";

// spec.md 7.2 / K-10 / K-34: service charge first, computed from subtotal,
// then PB1 computed from subtotal-plus-service (running_total). The order
// of this array IS the preset — running_total is only meaningful relative
// to whatever charge sits before it once these become real ExtraCharges.
const SERVICE_CHARGE_PERCENT = "5";
const PB1_PERCENT = "10";
const GENERIC_TIP_PERCENT = "10";

export type ChargePresetAmountKind = "percent" | "fixed";
export type ChargePresetAllocationMode = "proportional" | "even" | "single_payer";

// A preset seeds an editable ChargeDraft row — every field here is a
// starting value the user can change afterward, never a locked constant.
// nameKey is a translation key (K-59 pattern: category names are keys too),
// resolved to display text only once a preset is actually applied to a draft.
export interface ChargePresetDraft {
  readonly nameKey: string;
  readonly amountKind: ChargePresetAmountKind;
  readonly rawValue: string;
  readonly percentBasis: "subtotal" | "running_total";
  readonly allocationMode: ChargePresetAllocationMode;
}

const INDONESIA_PRESET: readonly ChargePresetDraft[] = [
  {
    nameKey: "expense.charge.preset.serviceCharge",
    amountKind: "percent",
    rawValue: SERVICE_CHARGE_PERCENT,
    percentBasis: "subtotal",
    allocationMode: "proportional",
  },
  {
    nameKey: "expense.charge.preset.pb1",
    amountKind: "percent",
    rawValue: PB1_PERCENT,
    percentBasis: "running_total",
    allocationMode: "proportional",
  },
];

// Non-Indonesia locales collapse spec.md 7.2's US/EU split (tip 15/18/20/25,
// VAT + tip 5/10) into one generic tip preset — a simplification of scope
// the task called for explicitly, not a spec reading. Recorded in
// progress.md so it can be corrected once a real US/EU distinction exists
// (K-13, still open).
const GENERIC_PRESET: readonly ChargePresetDraft[] = [
  {
    nameKey: "expense.charge.preset.tip",
    amountKind: "percent",
    rawValue: GENERIC_TIP_PERCENT,
    percentBasis: "subtotal",
    allocationMode: "proportional",
  },
];

export function getChargePresets(currency: string): readonly ChargePresetDraft[] {
  return currency === IDR_CURRENCY ? INDONESIA_PRESET : GENERIC_PRESET;
}
