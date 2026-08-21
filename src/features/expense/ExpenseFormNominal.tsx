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
  hasAllocationMismatchWarning,
  toCreateExpenseInput,
  type ChargeDraft,
  type ExpenseDraft,
  type ExpenseSplitMode,
  type TreatDraft,
} from "./expense-draft";
import type { ExpenseDraftResult } from "./use-expense-draft";
import { AllocationBar } from "./AllocationBar";
import { ChargeEditor } from "./ChargeEditor";
import { TreatEditor } from "./TreatEditor";
import { ResultPanel } from "./ResultPanel";
import styles from "./AddExpenseScreen.module.css";

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

export interface ExpenseFormNominalProps {
  readonly slug: string;
  readonly header: ReactNode;
  readonly draft: ExpenseDraft;
  readonly result: ExpenseDraftResult;
  readonly setTitle: (title: string) => void;
  readonly setAmountMinor: (amountMinor: number) => void;
  readonly setMode: (mode: ExpenseSplitMode) => void;
  readonly setMemberAmountMinor: (memberId: string, amountMinor: number) => void;
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

function resultRightValue(result: ExpenseDraftResult, canSave: boolean, currency: string): string {
  if (!result.ready) return t(NOT_READY_MESSAGE_KEY[result.reason]);
  if (canSave) return formatMoney(0, currency);
  return t(NOT_READY_MESSAGE_KEY.amountsNotBalanced);
}

export function ExpenseFormNominal({
  slug,
  header,
  draft,
  result,
  setTitle,
  setAmountMinor,
  setMode,
  setMemberAmountMinor,
  toggleMember,
  checkAllMembers,
  addEmptyCharge,
  loadChargePresets,
  updateCharge,
  removeCharge,
  addTreat,
  updateTreat,
  removeTreat,
}: ExpenseFormNominalProps) {
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  const checkedMembers = draft.members.filter((member) => member.checked);
  const checkedCount = checkedMembers.length;
  const payer = draft.members.find((member) => member.memberId === draft.payerMemberId);

  // Nominal always computes (splitByAmounts only warns on a mismatch, it
  // never throws), so result.ready is never false here just because the
  // amounts don't add up yet — the mismatch is read from the calculation's
  // own warnings instead, the same signal AllocationBar reads.
  const canSave = result.ready && !hasAllocationMismatchWarning(result.calculation.warnings);

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

  const rightLabel = result.ready ? t("expense.result.amountsExact") : t("expense.result.status");
  const rightValue = resultRightValue(result, canSave, draft.currency);

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
                className={`${styles.resultRightValue} bb-numeral ${canSave ? styles.resultRightReady : styles.resultRightPending}`}
              >
                {rightValue}
              </div>
            </div>
          </div>
          <Button onClick={() => void handleSave()} disabled={!canSave || saving}>
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

        {result.ready ? (
          <AllocationBar
            members={checkedMembers.map((member, index) => ({
              memberId: member.memberId,
              color: member.color,
              shareMinor: result.calculation.sharesMinor[index] ?? 0,
            }))}
            totalMinor={draft.amountMinor}
            currency={draft.currency}
            warnings={result.calculation.warnings}
          />
        ) : null}

        <div className={styles.participantList}>
          {draft.members.map((member) => {
            // A checked row's trailing holds a real MoneyInput — ListRow
            // renders as a <button> when given onClick (K-82), and a real
            // input inside a button is both invalid HTML and a bug (typing
            // in it would bubble a click that un-checks the member). So only
            // an unchecked row (plain text trailing) gets the re-include tap.
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
                  <MoneyInput
                    label={t("expense.amount.memberLabel", { name: member.name })}
                    prefix={draft.currency}
                    amountMinor={member.amountMinor}
                    onChange={(amountMinor) => setMemberAmountMinor(member.memberId, amountMinor)}
                  />
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
