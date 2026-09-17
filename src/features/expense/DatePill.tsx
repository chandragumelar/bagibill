import { useRef, type ChangeEvent } from "react";
import { formatDate, startOfDay, t } from "@/lib/i18n";
import formStyles from "./AddExpenseScreen.module.css";
import styles from "./DatePill.module.css";

function toDateInputValue(ms: number): string {
  const date = new Date(ms);
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string, fallbackMs: number): number {
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return fallbackMs;
  const parsedMs = new Date(year, month - 1, day).getTime();
  return Number.isNaN(parsedMs) ? fallbackMs : parsedMs;
}

// showPicker() isn't in every browser yet (Safari added it in 16.4) —
// .click() on a date input opens the same native picker everywhere it
// doesn't, so this is a fallback, not a second implementation.
function openNativePicker(input: HTMLInputElement | null): void {
  if (input === null) return;
  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.click();
}

export interface DatePillProps {
  readonly dateMs: number;
  readonly nowMs: number;
  readonly onChange: (dateMs: number) => void;
}

// No custom calendar — the browser's own <input type="date"> picker is what
// spec.md's decision for this pill asks for. Future dates are refused twice:
// the picker's own `max` never offers one, and a typed value that slips past
// `max` anyway (some browsers allow it) is clamped here too.
export function DatePill({ dateMs, nowMs, onChange }: DatePillProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dateLabel = startOfDay(dateMs) === startOfDay(nowMs)
    ? t("group.transaction.dayToday")
    : formatDate(new Date(startOfDay(dateMs)), { day: "numeric", month: "short" });

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const parsedMs = fromDateInputValue(event.target.value, dateMs);
    onChange(startOfDay(parsedMs) > startOfDay(nowMs) ? nowMs : parsedMs);
  }

  return (
    <>
      <button
        type="button"
        className={`${formStyles.chip} ${formStyles.chipButton}`}
        onClick={() => openNativePicker(inputRef.current)}
      >
        {dateLabel}
      </button>
      <input
        ref={inputRef}
        type="date"
        className={styles.hiddenInput}
        value={toDateInputValue(dateMs)}
        max={toDateInputValue(nowMs)}
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}
