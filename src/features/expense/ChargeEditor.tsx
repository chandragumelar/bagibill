import { useId, type ChangeEvent } from "react";
import { t } from "@/lib/i18n";
import type { ChargeDraft, ChargeDraftAllocationMode, ChargeAmountKind, ExpenseDraftMember } from "./expense-draft";
import styles from "./ChargeEditor.module.css";

const ALLOCATION_MODES: readonly ChargeDraftAllocationMode[] = ["proportional", "even", "single_payer"];

const ALLOCATION_LABEL_KEY: Record<ChargeDraftAllocationMode, string> = {
  proportional: "expense.charge.allocationProportional",
  even: "expense.charge.allocationEven",
  single_payer: "expense.charge.allocationSinglePayer",
};

// Only digits, at most one leading minus (discounts, spec.md 7.3), and — for
// percent — at most one decimal point. Sanitizing keystrokes here means
// parseChargeRawValue (expense-draft.ts) never has to reject genuine
// garbage, only "not filled in yet" text like "" or "-".
function sanitizeChargeValue(raw: string, allowDecimal: boolean): string {
  const isNegative = raw.trimStart().startsWith("-");
  let digits = raw.replace(/[^0-9.]/g, "");
  if (!allowDecimal) {
    digits = digits.replace(/\./g, "");
  } else {
    const firstDot = digits.indexOf(".");
    if (firstDot !== -1) {
      digits = digits.slice(0, firstDot + 1) + digits.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  return isNegative ? `-${digits}` : digits;
}

function chargeIdentityLabel(charge: ChargeDraft, index: number): string {
  const trimmedName = charge.name.trim();
  return trimmedName === "" ? t("expense.charge.unnamed", { index: index + 1 }) : trimmedName;
}

interface ChargeRowProps {
  readonly charge: ChargeDraft;
  readonly index: number;
  readonly showBasisPicker: boolean;
  readonly checkedMembers: readonly ExpenseDraftMember[];
  readonly onUpdate: (id: string, patch: Partial<ChargeDraft>) => void;
  readonly onRemove: (id: string) => void;
}

function ChargeRow({ charge, index, showBasisPicker, checkedMembers, onUpdate, onRemove }: ChargeRowProps) {
  const nameInputId = useId();
  const valueInputId = useId();
  const payerSelectId = useId();
  const identity = chargeIdentityLabel(charge, index);

  function handleKindChange(kind: ChargeAmountKind): void {
    // Switching percent<->nominal never translates the number — 5% and
    // Rp5 mean different things, and guessing which one the person meant
    // is always wrong for someone (CLAUDE.md).
    onUpdate(charge.id, { amountKind: kind, rawValue: "" });
  }

  function handleValueChange(event: ChangeEvent<HTMLInputElement>): void {
    onUpdate(charge.id, { rawValue: sanitizeChargeValue(event.target.value, charge.amountKind === "percent") });
  }

  return (
    <div className={styles.row}>
      <div className={styles.rowHeader}>
        <label htmlFor={nameInputId} className={styles.visuallyHiddenLabel}>
          {t("expense.charge.nameLabel")}
        </label>
        <input
          id={nameInputId}
          type="text"
          className={styles.nameInput}
          value={charge.name}
          placeholder={t("expense.charge.unnamed", { index: index + 1 })}
          onChange={(event) => onUpdate(charge.id, { name: event.target.value })}
        />
        <button
          type="button"
          className={styles.removeButton}
          onClick={() => onRemove(charge.id)}
          aria-label={t("expense.charge.remove", { name: identity })}
        >
          ✕
        </button>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.kindGroup} role="group" aria-label={t("expense.charge.kindGroupLabel", { name: identity })}>
          <button
            type="button"
            aria-pressed={charge.amountKind === "percent"}
            className={charge.amountKind === "percent" ? `${styles.kindButton} ${styles.kindButtonActive}` : styles.kindButton}
            onClick={() => handleKindChange("percent")}
          >
            {t("expense.charge.kindPercent")}
          </button>
          <button
            type="button"
            aria-pressed={charge.amountKind === "fixed"}
            className={charge.amountKind === "fixed" ? `${styles.kindButton} ${styles.kindButtonActive}` : styles.kindButton}
            onClick={() => handleKindChange("fixed")}
          >
            {t("expense.charge.kindFixed")}
          </button>
        </div>

        <label htmlFor={valueInputId} className={styles.visuallyHiddenLabel}>
          {t(charge.amountKind === "percent" ? "expense.charge.valueLabelPercent" : "expense.charge.valueLabelFixed", {
            name: identity,
          })}
        </label>
        <input
          id={valueInputId}
          type="text"
          inputMode="decimal"
          className={`${styles.valueInput} bb-numeral`}
          value={charge.rawValue}
          placeholder="0"
          onChange={handleValueChange}
        />
      </div>

      {showBasisPicker ? (
        <div
          className={styles.basisGroup}
          role="group"
          aria-label={t("expense.charge.basisGroupLabel", { name: identity })}
        >
          <button
            type="button"
            aria-pressed={charge.percentBasis === "subtotal"}
            className={
              charge.percentBasis === "subtotal" ? `${styles.basisButton} ${styles.basisButtonActive}` : styles.basisButton
            }
            onClick={() => onUpdate(charge.id, { percentBasis: "subtotal" })}
          >
            {t("expense.charge.basisSubtotal")}
          </button>
          <button
            type="button"
            aria-pressed={charge.percentBasis === "running_total"}
            className={
              charge.percentBasis === "running_total"
                ? `${styles.basisButton} ${styles.basisButtonActive}`
                : styles.basisButton
            }
            onClick={() => onUpdate(charge.id, { percentBasis: "running_total" })}
          >
            {t("expense.charge.basisRunningTotal")}
          </button>
        </div>
      ) : null}

      <div
        className={styles.allocationGroup}
        role="group"
        aria-label={t("expense.charge.allocationGroupLabel", { name: identity })}
      >
        {ALLOCATION_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={charge.allocationMode === mode}
            className={
              charge.allocationMode === mode ? `${styles.allocationButton} ${styles.allocationButtonActive}` : styles.allocationButton
            }
            onClick={() => onUpdate(charge.id, { allocationMode: mode })}
          >
            {t(ALLOCATION_LABEL_KEY[mode])}
          </button>
        ))}
      </div>

      {charge.allocationMode === "single_payer" ? (
        <div className={styles.payerField}>
          <label htmlFor={payerSelectId} className={styles.visuallyHiddenLabel}>
            {t("expense.charge.payerSelectLabel", { name: identity })}
          </label>
          <select
            id={payerSelectId}
            className={styles.payerSelect}
            value={charge.allocationMemberId}
            onChange={(event) => onUpdate(charge.id, { allocationMemberId: event.target.value })}
          >
            {checkedMembers.map((member) => (
              <option key={member.memberId} value={member.memberId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

export interface ChargeEditorProps {
  readonly charges: readonly ChargeDraft[];
  readonly checkedMembers: readonly ExpenseDraftMember[];
  readonly onAdd: () => void;
  readonly onLoadPreset: () => void;
  readonly onUpdate: (id: string, patch: Partial<ChargeDraft>) => void;
  readonly onRemove: (id: string) => void;
}

export function ChargeEditor({ charges, checkedMembers, onAdd, onLoadPreset, onUpdate, onRemove }: ChargeEditorProps) {
  const percentChargeCount = charges.filter((charge) => charge.amountKind === "percent").length;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionHeading}>{t("expense.charge.heading")}</span>
        <div className={styles.headerActions}>
          <button type="button" className={styles.headerAction} onClick={onLoadPreset}>
            {t("expense.charge.loadPreset")}
          </button>
          <button type="button" className={styles.headerAction} onClick={onAdd}>
            {t("expense.charge.add")}
          </button>
        </div>
      </div>
      {charges.length === 0 ? null : (
        <div className={styles.list}>
          {charges.map((charge, index) => (
            <ChargeRow
              key={charge.id}
              charge={charge}
              index={index}
              showBasisPicker={charge.amountKind === "percent" && percentChargeCount > 1}
              checkedMembers={checkedMembers}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
