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
  type ExpenseDraftMember,
  type ExpenseSplitMode,
  type TreatDraft,
} from "./expense-draft";
import type { ExpenseDraftResult } from "./use-expense-draft";
import { DeviationBar } from "./DeviationBar";
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

// Mockup's own step size for the adjustment stepper (Rp5.000 per tap) — the
// only currency in gelombang 1 is zero-decimal IDR, same scope MoneyInput
// itself is limited to (F0-05).
const ADJUSTMENT_STEP_MINOR = 5_000;

function sanitizeAdjustmentText(raw: string): string {
  const isNegative = raw.trimStart().startsWith("-");
  const digits = raw.replace(/[^0-9]/g, "");
  return isNegative ? `-${digits}` : digits;
}

function parseAdjustmentText(text: string): number | undefined {
  if (text === "" || text === "-") return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface AdjustmentStepperProps {
  readonly memberName: string;
  readonly adjustmentMinor: number;
  readonly currency: string;
  readonly onChange: (adjustmentMinor: number) => void;
}

// Signed minor-unit input, mirroring WeightStepper's pill shell (same CSS
// module) — MoneyInput can't be reused here because it strips the minus
// sign entirely (F0-05: built for positive amounts only).
function AdjustmentStepper({ memberName, adjustmentMinor, currency, onChange }: AdjustmentStepperProps) {
  const [text, setText] = useState(() => String(adjustmentMinor));
  const [syncedAdjustmentMinor, setSyncedAdjustmentMinor] = useState(adjustmentMinor);
  if (adjustmentMinor !== syncedAdjustmentMinor) {
    setSyncedAdjustmentMinor(adjustmentMinor);
    setText(String(adjustmentMinor));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextText = sanitizeAdjustmentText(event.target.value);
    setText(nextText);
    const parsed = parseAdjustmentText(nextText);
    if (parsed !== undefined) onChange(parsed);
  }

  function handleBlur(): void {
    const parsed = parseAdjustmentText(text);
    const finalAdjustmentMinor = parsed ?? adjustmentMinor;
    if (finalAdjustmentMinor !== adjustmentMinor) onChange(finalAdjustmentMinor);
    setText(String(finalAdjustmentMinor));
  }

  return (
    <div className={stepperStyles.pill}>
      <button
        type="button"
        className={stepperStyles.stepButton}
        onClick={() => onChange(adjustmentMinor - ADJUSTMENT_STEP_MINOR)}
        aria-label={t("expense.deviation.decrease", { name: memberName })}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        className={`${stepperStyles.value} bb-numeral`}
        value={text === "0" ? "" : text}
        placeholder={formatMoney(0, currency)}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label={t("expense.deviation.inputLabel", { name: memberName })}
      />
      <button
        type="button"
        className={stepperStyles.stepButton}
        onClick={() => onChange(adjustmentMinor + ADJUSTMENT_STEP_MINOR)}
        aria-label={t("expense.deviation.increase", { name: memberName })}
      >
        +
      </button>
    </div>
  );
}

export interface ExpenseFormSelisihProps {
  readonly slug: string;
  readonly header: ReactNode;
  readonly draft: ExpenseDraft;
  readonly result: ExpenseDraftResult;
  readonly setTitle: (title: string) => void;
  readonly setAmountMinor: (amountMinor: number) => void;
  readonly setMode: (mode: ExpenseSplitMode) => void;
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

export function ExpenseFormSelisih({
  slug,
  header,
  draft,
  result,
  setTitle,
  setAmountMinor,
  setMode,
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
}: ExpenseFormSelisihProps) {
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  const checkedMembers = draft.members.filter((member) => member.checked);
  const checkedCount = checkedMembers.length;
  const payer = draft.members.find((member) => member.memberId === draft.payerMemberId);
  // Visual scale for every row's bar, shared across the group — comparing
  // magnitudes for a proportion, not deciding any money allocation.
  const maxAbsAdjustmentMinor = Math.max(1, ...checkedMembers.map((member) => Math.abs(member.adjustmentMinor)));

  function shareFor(memberId: string): number | undefined {
    if (!result.ready) return undefined;
    const index = result.memberOrder.indexOf(memberId);
    return index === -1 ? undefined : result.calculation.sharesMinor[index];
  }

  // The even-share reference ("bagian rata") shown once above the list —
  // read off the engine's own result (shareMinor minus the known
  // adjustment), never recomputed by re-deriving the split here.
  function evenShareMinorFor(members: readonly ExpenseDraftMember[]): number | undefined {
    const first = members[0];
    if (first === undefined) return undefined;
    const firstShareMinor = shareFor(first.memberId);
    if (firstShareMinor === undefined) return undefined;
    return firstShareMinor - first.adjustmentMinor;
  }

  const evenShareMinor = evenShareMinorFor(checkedMembers);

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
    ? formatMoney(result.calculation.sharesMinor[0] ?? 0, draft.currency)
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

        {evenShareMinor !== undefined ? (
          <p className={styles.explainerBody}>{t("expense.deviation.evenShare", { amount: formatMoney(evenShareMinor, draft.currency) })}</p>
        ) : null}

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
                  <AdjustmentStepper
                    memberName={member.name}
                    adjustmentMinor={member.adjustmentMinor}
                    currency={draft.currency}
                    onChange={(adjustmentMinor) => setAdjustmentMinor(member.memberId, adjustmentMinor)}
                  />
                }
              >
                <span className={styles.memberName}>{member.name}</span>
                {shareMinor !== undefined ? (
                  <DeviationBar
                    shareMinor={shareMinor}
                    adjustmentMinor={member.adjustmentMinor}
                    maxAbsAdjustmentMinor={maxAbsAdjustmentMinor}
                    currency={draft.currency}
                  />
                ) : null}
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
