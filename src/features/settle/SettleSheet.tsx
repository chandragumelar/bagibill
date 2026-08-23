import { useState, type ChangeEvent } from "react";
import { t } from "@/lib/i18n";
import { Avatar, Button, MoneyInput, Sheet, TextInput } from "@/shared/ui";
import { initialsFromName } from "./BalanceList";
import styles from "./SettleSheet.module.css";

export interface SettleSheetTarget {
  readonly fromMemberId: string;
  readonly fromName: string;
  readonly fromColor: string;
  readonly toMemberId: string;
  readonly toName: string;
  readonly toColor: string;
  readonly suggestedAmountMinor: number;
}

export interface SaveSettlementInput {
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly date: number;
  readonly note?: string;
}

export interface SettleSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly target: SettleSheetTarget | undefined;
  readonly currency: string;
  /** "Today" as of opening — supplied by the caller so this component never reads the clock itself (CLAUDE.md: no Date.now() outside clock.ts). */
  readonly nowMs: number;
  readonly onSave: (input: SaveSettlementInput) => Promise<void>;
}

function targetKey(target: SettleSheetTarget | undefined): string {
  if (target === undefined) return "";
  return `${target.fromMemberId}>${target.toMemberId}:${target.suggestedAmountMinor}`;
}

// Epoch millis <-> "yyyy-MM-dd" using LOCAL date components on both sides —
// mixing a UTC-based parse with a local-based format is exactly the kind of
// off-by-one-day bug CLAUDE.md calls out as already proven.
function toDateInputValue(epochMs: number): string {
  const date = new Date(epochMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string, fallbackMs: number): number {
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return fallbackMs;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? fallbackMs : date.getTime();
}

interface PartyProps {
  readonly name: string;
  readonly color: string;
}

function Party({ name, color }: PartyProps) {
  return (
    <span className={styles.party}>
      <Avatar initials={initialsFromName(name)} color={`var(${color})`} size="small" name={name} />
      <span className={styles.partyName}>{name}</span>
    </span>
  );
}

export function SettleSheet({ open, onClose, target, currency, nowMs, onSave }: SettleSheetProps) {
  const [lastKey, setLastKey] = useState(targetKey(target));
  const [amountMinor, setAmountMinor] = useState(target?.suggestedAmountMinor ?? 0);
  const [dateMs, setDateMs] = useState(nowMs);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const key = targetKey(target);
  if (key !== lastKey) {
    setLastKey(key);
    setAmountMinor(target?.suggestedAmountMinor ?? 0);
    setDateMs(nowMs);
    setNote("");
    setSaveError(false);
  }

  if (!open || target === undefined) return null;

  async function handleSave(): Promise<void> {
    if (target === undefined) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave({
        fromMemberId: target.fromMemberId,
        toMemberId: target.toMemberId,
        amountMinor,
        currency,
        date: dateMs,
        note: note.trim() === "" ? undefined : note.trim(),
      });
      onClose();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDateChange(event: ChangeEvent<HTMLInputElement>): void {
    setDateMs(fromDateInputValue(event.target.value, dateMs));
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("settle.form.title")} subtitle={t("settle.form.subtitle")}>
      <div className={styles.flow}>
        <div className={styles.partyGroup}>
          <span className={styles.partyLabel}>{t("settle.form.fromLabel")}</span>
          <Party name={target.fromName} color={target.fromColor} />
        </div>
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
        <div className={styles.partyGroup}>
          <span className={styles.partyLabel}>{t("settle.form.toLabel")}</span>
          <Party name={target.toName} color={target.toColor} />
        </div>
      </div>

      <div className={styles.field}>
        <MoneyInput label={t("settle.form.amountLabel")} prefix={currency} amountMinor={amountMinor} onChange={setAmountMinor} />
      </div>

      <div className={styles.field}>
        <label className={styles.dateLabel} htmlFor="settle-date">
          {t("settle.form.dateLabel")}
        </label>
        <input id="settle-date" type="date" className={styles.dateInput} value={toDateInputValue(dateMs)} onChange={handleDateChange} />
      </div>

      <div className={styles.field}>
        <TextInput label={t("settle.form.noteLabel")} value={note} onChange={setNote} placeholder={t("settle.form.noteLabel")} />
      </div>

      {saveError ? <p className={styles.error}>{t("common.saveFailed")}</p> : null}

      <Button onClick={() => void handleSave()} disabled={amountMinor <= 0 || saving}>
        {t("settle.form.saveButton")}
      </Button>
    </Sheet>
  );
}
