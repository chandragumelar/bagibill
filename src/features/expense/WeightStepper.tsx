import { useState, type ChangeEvent } from "react";
import { t } from "@/lib/i18n";
import styles from "./WeightStepper.module.css";

const WEIGHT_STEP = 1;
const WEIGHT_MIN = 0;
const WEIGHT_DECIMAL_PLACES = 2;

// spec.md 6.4's three quick presets. 1/3 can't be written exactly in
// decimal, and 0.33 is the intended value here, not a rounding accident:
// allocateByWeights (packages/split-engine) normalizes weights against
// their sum, so three people at 0.33 each still split a bill exactly three
// ways. In a mixed case the largest-remainder allocator resolves any
// leftover to at most one minor unit off — the same rounding every other
// split mode already lives with. Storing thirds as a numerator/denominator
// pair instead would mean threading fractions through every mode, storage
// record, and the calculation gate for a discrepancy this small.
const WEIGHT_PRESET_HALF = 0.5;
const WEIGHT_PRESET_THIRD = 0.33;
const WEIGHT_PRESET_QUARTER = 0.25;

export interface WeightStepperProps {
  readonly memberName: string;
  readonly weight: number;
  readonly onChange: (weight: number) => void;
}

function formatWeight(weight: number): string {
  return String(weight);
}

// String-sliced rather than scaled by 10^n and floored — multiplying a
// float and flooring drifts for values like 0.33 that aren't exact in
// binary. packages/split-engine/shared/decimal-scale.ts hits the same
// problem and solves it the same way.
function truncateToDecimalPlaces(value: number, decimalPlaces: number): number {
  const [wholePart = "0", fractionPart = ""] = value.toString().split(".");
  const truncatedFraction = fractionPart.slice(0, decimalPlaces);
  return Number(truncatedFraction ? `${wholePart}.${truncatedFraction}` : wholePart);
}

function parseWeightText(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < WEIGHT_MIN) return undefined;
  return parsed;
}

// One row's minus/value/plus/preset controls. Weight math here is plain
// number arithmetic on purpose (CLAUDE.md: weight isn't money), but the
// actual per-person allocation is never computed in this component — it
// only ever reports a weight upward through onChange.
export function WeightStepper({ memberName, weight, onChange }: WeightStepperProps) {
  const [text, setText] = useState(() => formatWeight(weight));
  // Tracks the weight this render's `text` was last synced to. Adjusting
  // state during render (React's documented pattern for this, no effect
  // needed) — and only when the committed weight actually changed, so a
  // keystroke that doesn't yet parse to a new number (a bare "-" or a
  // trailing ".") never fires onChange and never clobbers what's still
  // being typed.
  const [syncedWeight, setSyncedWeight] = useState(weight);
  if (weight !== syncedWeight) {
    setSyncedWeight(weight);
    setText(formatWeight(weight));
  }

  function handleDecrease(): void {
    onChange(Math.max(WEIGHT_MIN, weight - WEIGHT_STEP));
  }

  function handleIncrease(): void {
    onChange(weight + WEIGHT_STEP);
  }

  function handlePreset(presetWeight: number): void {
    onChange(presetWeight);
  }

  function handleTextChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextText = event.target.value;
    setText(nextText);
    const parsed = parseWeightText(nextText);
    if (parsed !== undefined) onChange(parsed);
  }

  // Excess decimals are allowed while typing (spec: cut at blur, not
  // rejected mid-keystroke) — this is the one place precision gets clamped.
  function handleBlur(): void {
    const parsed = parseWeightText(text);
    const finalWeight = parsed === undefined ? weight : truncateToDecimalPlaces(parsed, WEIGHT_DECIMAL_PLACES);
    if (finalWeight !== weight) onChange(finalWeight);
    setText(formatWeight(finalWeight));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.pill}>
        <button
          type="button"
          className={styles.stepButton}
          onClick={handleDecrease}
          disabled={weight <= WEIGHT_MIN}
          aria-label={t("expense.weight.decrease", { name: memberName })}
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          className={`${styles.value} bb-numeral`}
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          aria-label={t("expense.weight.inputLabel", { name: memberName })}
        />
        <button
          type="button"
          className={styles.stepButton}
          onClick={handleIncrease}
          aria-label={t("expense.weight.increase", { name: memberName })}
        >
          +
        </button>
      </div>
      <div className={styles.presets}>
        <button
          type="button"
          className={styles.presetButton}
          onClick={() => handlePreset(WEIGHT_PRESET_HALF)}
          aria-label={t("expense.weight.presetHalfAria", { name: memberName })}
        >
          {t("expense.weight.presetHalf")}
        </button>
        <button
          type="button"
          className={styles.presetButton}
          onClick={() => handlePreset(WEIGHT_PRESET_THIRD)}
          aria-label={t("expense.weight.presetThirdAria", { name: memberName })}
        >
          {t("expense.weight.presetThird")}
        </button>
        <button
          type="button"
          className={styles.presetButton}
          onClick={() => handlePreset(WEIGHT_PRESET_QUARTER)}
          aria-label={t("expense.weight.presetQuarterAria", { name: memberName })}
        >
          {t("expense.weight.presetQuarter")}
        </button>
      </div>
    </div>
  );
}
