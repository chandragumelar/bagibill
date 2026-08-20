import { useState, type ReactNode } from "react";
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
import { WeightStepper } from "./WeightStepper";
import { ChargeEditor } from "./ChargeEditor";
import { TreatEditor } from "./TreatEditor";
import { ResultPanel } from "./ResultPanel";
import styles from "./AddExpenseScreen.module.css";

// Kept identical to ExpenseFormRata's mode row so both forms render the
// same pill list mid-switch — duplicated rather than shared because these
// two files are still each other's only consumer; F3-03 revisits this row
// anyway when the third interactive mode lands (see progress.md Catatan lepas).
const SPLIT_MODE_KEYS = ["evenly", "byAmounts", "byPercentage", "byWeights", "byAdjustment", "byItems"] as const;
type SplitModeKey = (typeof SPLIT_MODE_KEYS)[number];

function isInteractiveMode(mode: SplitModeKey): mode is ExpenseSplitMode {
  return mode === "evenly" || mode === "byWeights";
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

export interface ExpenseFormPorsiProps {
  readonly slug: string;
  readonly header: ReactNode;
  readonly draft: ExpenseDraft;
  readonly result: ExpenseDraftResult;
  readonly setTitle: (title: string) => void;
  readonly setAmountMinor: (amountMinor: number) => void;
  readonly setMode: (mode: ExpenseSplitMode) => void;
  readonly setWeight: (memberId: string, weight: number) => void;
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

const PERCENT_MULTIPLIER = 100;

export function ExpenseFormPorsi({
  slug,
  header,
  draft,
  result,
  setTitle,
  setAmountMinor,
  setMode,
  setWeight,
  toggleMember,
  checkAllMembers,
  addEmptyCharge,
  loadChargePresets,
  updateCharge,
  removeCharge,
  addTreat,
  updateTreat,
  removeTreat,
}: ExpenseFormPorsiProps) {
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  const checkedCount = draft.members.filter((member) => member.checked).length;
  const checkedMembers = draft.members.filter((member) => member.checked);
  const totalWeight = checkedMembers.reduce((sum, member) => sum + member.weight, 0);
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

  // Porsi shares aren't uniform like Rata's, so the panel's second number
  // is the largest share rather than a "per person" figure that wouldn't
  // mean the same thing for everyone (mockup: panelRightLabel "terbesar").
  const rightLabel = result.ready ? t("expense.result.largest") : t("expense.result.status");
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

        <div className={styles.explainerBox}>
          <span className={styles.explainerTitle}>{t("expense.porsi.explainerTitle")}</span>{" "}
          <span className={styles.explainerBody}>{t("expense.porsi.explainerBody")}</span>
        </div>

        {totalWeight > 0 ? (
          <>
            <div className={styles.proportionBar}>
              {checkedMembers.map((member) => (
                <div
                  key={member.memberId}
                  className={styles.proportionSegment}
                  style={{ width: `${((member.weight / totalWeight) * PERCENT_MULTIPLIER).toFixed(3)}%`, background: `var(${member.color})` }}
                />
              ))}
            </div>
            <div className={styles.proportionMeta}>
              <span>{t("expense.porsi.totalWeight", { count: totalWeight })}</span>
              <span>{t("expense.porsi.boxHint")}</span>
            </div>
          </>
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
                  <div className={styles.weightTrailing}>
                    <WeightStepper
                      memberName={member.name}
                      weight={member.weight}
                      onChange={(weight) => setWeight(member.memberId, weight)}
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
