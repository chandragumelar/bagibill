import { useState, type ChangeEvent, type ReactNode } from "react";
import { t, formatMoney } from "@/lib/i18n";
import { BottomBar } from "@/app/layout/BottomBar/BottomBar";
import { Screen } from "@/app/layout/Screen/Screen";
import { Avatar, Button, ListRow, MoneyInput, TextInput } from "@/shared/ui";
import { InlineFailure } from "@/shared/system";
import { navigate } from "@/routes/router";
import { systemClock } from "@/lib/storage/clock";
import { expenseRepository } from "@/lib/storage/repositories";
import type { CategoryKey } from "@/lib/storage/templates";
import {
  NOT_READY_MESSAGE_KEY,
  toCreateExpenseInput,
  type ChargeDraft,
  type ExpenseDraft,
  type ExpenseSplitMode,
  type TreatDraft,
} from "./expense-draft";
import type { ExpenseDraftResult } from "./use-expense-draft";
import { PercentageTrack, type PercentSpreadUpdate } from "./PercentageTrack";
import { ChargeEditor } from "./ChargeEditor";
import { TreatEditor } from "./TreatEditor";
import { ResultPanel } from "./ResultPanel";
import styles from "./AddExpenseScreen.module.css";
import stepperStyles from "./WeightStepper.module.css";

// Kept identical to the other forms' mode row — duplicated rather than
// shared, same reasoning as ExpenseFormPorsi (progress.md Catatan lepas).
const SPLIT_MODE_KEYS = ["evenly", "byAmounts", "byPercentage", "byWeights", "byAdjustment", "byItems"] as const;
type SplitModeKey = (typeof SPLIT_MODE_KEYS)[number];

function isInteractiveMode(mode: SplitModeKey): mode is ExpenseSplitMode {
  return mode !== "byItems";
}

const MODE_LABEL_KEY: Record<SplitModeKey, string> = {
  evenly: "expense.mode.evenly",
  byAmounts: "expense.mode.byAmounts",
  byPercentage: "expense.mode.byPercentage",
  byWeights: "expense.mode.byWeights",
  byAdjustment: "expense.mode.adjustment",
  byItems: "expense.mode.byItems",
};

const CATEGORY_LABEL_KEY: Record<CategoryKey, string> = {
  food: "category.food",
  transport: "category.transport",
  stay: "category.stay",
  shopping: "category.shopping",
  fun: "category.fun",
  bills: "category.bills",
  health: "category.health",
  other: "category.other",
};

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase();
}

const PERCENT_STEP = 5;
const PERCENT_MIN = 0;
const PERCENT_MAX = 100;
// The mockup's own manual-entry field is digit-only (no decimals) — the two
// decimal places mode Persen accepts only ever come from "ratakan sisa"
// (PercentageTrack.computeSpreadRemainingPercent), never from typing.
const PERCENT_TYPED_CAP = 999;

interface PercentStepperProps {
  readonly memberName: string;
  readonly percent: number;
  readonly onChange: (percent: number) => void;
}

// Mirrors WeightStepper's pill shell (same CSS module) for a whole-number
// percent instead of a fractional weight — no decimal typing, spec.md 6.3's
// manual field is digits only.
function PercentStepper({ memberName, percent, onChange }: PercentStepperProps) {
  function handleDecrease(): void {
    onChange(Math.max(PERCENT_MIN, percent - PERCENT_STEP));
  }

  function handleIncrease(): void {
    onChange(Math.min(PERCENT_MAX, percent + PERCENT_STEP));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const digits = event.target.value.replace(/\D/g, "");
    const parsed = digits === "" ? 0 : Math.min(PERCENT_TYPED_CAP, Number(digits));
    onChange(parsed);
  }

  return (
    <div className={stepperStyles.pill}>
      <button
        type="button"
        className={stepperStyles.stepButton}
        onClick={handleDecrease}
        disabled={percent <= PERCENT_MIN}
        aria-label={t("expense.weight.decrease", { name: memberName })}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        className={`${stepperStyles.value} bb-numeral`}
        value={percent === 0 ? "" : String(percent)}
        placeholder="0"
        onChange={handleChange}
        aria-label={t("expense.percentage.inputLabel", { name: memberName })}
      />
      <span aria-hidden="true">%</span>
      <button
        type="button"
        className={stepperStyles.stepButton}
        onClick={handleIncrease}
        disabled={percent >= PERCENT_MAX}
        aria-label={t("expense.weight.increase", { name: memberName })}
      >
        +
      </button>
    </div>
  );
}

export interface ExpenseFormPersenProps {
  readonly slug: string;
  readonly header: ReactNode;
  readonly draft: ExpenseDraft;
  readonly result: ExpenseDraftResult;
  readonly setTitle: (title: string) => void;
  readonly setAmountMinor: (amountMinor: number) => void;
  readonly setMode: (mode: ExpenseSplitMode) => void;
  readonly setPercent: (memberId: string, percent: number) => void;
  readonly setPercents: (updates: readonly PercentSpreadUpdate[]) => void;
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

export function ExpenseFormPersen({
  slug,
  header,
  draft,
  result,
  setTitle,
  setAmountMinor,
  setMode,
  setPercent,
  setPercents,
  toggleMember,
  checkAllMembers,
  addEmptyCharge,
  loadChargePresets,
  updateCharge,
  removeCharge,
  addTreat,
  updateTreat,
  removeTreat,
}: ExpenseFormPersenProps) {
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  const checkedMembers = draft.members.filter((member) => member.checked);
  const checkedCount = checkedMembers.length;
  const payer = draft.members.find((member) => member.memberId === draft.payerMemberId);

  function shareFor(memberId: string): number | undefined {
    if (!result.ready) return undefined;
    const index = result.memberOrder.indexOf(memberId);
    return index === -1 ? undefined : result.calculation.sharesMinor[index];
  }

  async function handleSave(): Promise<void> {
    const input = toCreateExpenseInput(draft, {
      groupSlug: slug,
      createdBy: draft.payerMemberId,
      date: systemClock.now(),
    });
    if (input === null) return;
    setSaving(true);
    setSaveError(false);
    try {
      await expenseRepository.createExpense(input);
      navigate(`/g/${slug}`);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  const rightLabel = result.ready ? t("expense.result.perPerson") : t("expense.result.status");
  const rightValue = result.ready
    ? formatMoney(Math.max(...result.calculation.sharesMinor), draft.currency)
    : t(NOT_READY_MESSAGE_KEY[result.reason]);

  return (
    <Screen
      header={header}
      bottomBar={
        <BottomBar>
          {saveError ? (
            <InlineFailure message={t("common.saveFailed")} retryLabel={t("system.retry")} onRetry={() => void handleSave()} />
          ) : null}
          <div className={styles.resultRow}>
            <div>
              <div className={styles.resultKicker}>{t("expense.result.kicker", { count: checkedCount })}</div>
              <div className={`${styles.resultTotal} bb-numeral`}>{formatMoney(draft.amountMinor, draft.currency)}</div>
            </div>
            <div className={styles.resultRight}>
              <div className={styles.resultKicker}>{rightLabel}</div>
              <div
                className={`${styles.resultRightValue} bb-numeral ${
                  result.ready ? styles.resultRightReady : styles.resultRightPending
                }`}
              >
                {rightValue}
              </div>
            </div>
          </div>
          <Button onClick={() => void handleSave()} disabled={!result.ready || saving}>
            {t("expense.save.button")}
          </Button>
        </BottomBar>
      }
    >
      <div className={styles.field}>
        <TextInput label={t("expense.title.label")} value={draft.title} onChange={setTitle} />
      </div>
      <div className={styles.field}>
        <MoneyInput
          label={t("expense.amount.label")}
          prefix={draft.currency}
          amountMinor={draft.amountMinor}
          onChange={setAmountMinor}
        />
      </div>
      <div className={styles.chipRow}>
        <span className={styles.chip}>{t("expense.date.today")}</span>
        <span className={styles.chip}>{t(CATEGORY_LABEL_KEY[draft.category])}</span>
        <span className={styles.chip}>{draft.currency}</span>
      </div>

      {payer ? (
        <div className={styles.section}>
          <div className={styles.sectionHeading}>{t("expense.payer.label")}</div>
          <div className={styles.participantList}>
            <ListRow leading={<Avatar initials={initialsFromName(payer.name)} color={`var(${payer.color})`} name={payer.name} />}>
              <span className={styles.memberName}>{payer.name}</span>
            </ListRow>
          </div>
        </div>
      ) : null}

      <div className={styles.section}>
        <div className={styles.sectionHeadingRow}>
          <span className={styles.sectionHeading}>{t("expense.participants.heading", { count: checkedCount })}</span>
          <button type="button" className={styles.selectAll} onClick={checkAllMembers}>
            {t("expense.participants.selectAll")}
          </button>
        </div>

        <div className={styles.modeGroup} role="group" aria-label={t("expense.mode.groupLabel")}>
          {SPLIT_MODE_KEYS.map((mode) => {
            const active = mode === draft.mode;
            const interactive = isInteractiveMode(mode);
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                disabled={!interactive}
                onClick={interactive ? () => setMode(mode) : undefined}
                className={active ? `${styles.modePill} ${styles.modePillActive}` : styles.modePill}
              >
                {t(MODE_LABEL_KEY[mode])}
              </button>
            );
          })}
        </div>

        <PercentageTrack
          members={checkedMembers.map((member) => ({ memberId: member.memberId, color: member.color, percent: member.percent }))}
          onSpreadRemaining={setPercents}
        />

        <div className={styles.participantList}>
          {draft.members.map((member) => {
            const shareMinor = shareFor(member.memberId);
            if (!member.checked) {
              return (
                <ListRow
                  key={member.memberId}
                  onClick={() => toggleMember(member.memberId)}
                  leading={<Avatar initials={initialsFromName(member.name)} color={`var(${member.color})`} name={member.name} />}
                  trailing={
                    <span className={`${styles.amount} ${styles.amountExcluded}`}>{t("expense.participants.excluded")}</span>
                  }
                >
                  <span className={styles.memberName}>{member.name}</span>
                </ListRow>
              );
            }
            return (
              <ListRow
                key={member.memberId}
                leading={<Avatar initials={initialsFromName(member.name)} color={`var(${member.color})`} name={member.name} />}
                trailing={
                  <div className={styles.weightTrailing}>
                    <PercentStepper
                      memberName={member.name}
                      percent={member.percent}
                      onChange={(percent) => setPercent(member.memberId, percent)}
                    />
                    <span className={`${styles.amount} bb-numeral`}>
                      {shareMinor === undefined ? "—" : formatMoney(shareMinor, draft.currency)}
                    </span>
                  </div>
                }
              >
                <span className={styles.memberName}>{member.name}</span>
              </ListRow>
            );
          })}
        </div>
      </div>

      <ChargeEditor
        charges={draft.charges}
        checkedMembers={checkedMembers}
        onAdd={addEmptyCharge}
        onLoadPreset={loadChargePresets}
        onUpdate={updateCharge}
        onRemove={removeCharge}
      />
      <TreatEditor
        treats={draft.treats}
        checkedMembers={checkedMembers}
        currency={draft.currency}
        onAdd={addTreat}
        onUpdate={updateTreat}
        onRemove={removeTreat}
      />
      <ResultPanel
        members={checkedMembers}
        charges={draft.charges}
        treatCount={draft.treats.length}
        currency={draft.currency}
        result={result}
      />
    </Screen>
  );
}
