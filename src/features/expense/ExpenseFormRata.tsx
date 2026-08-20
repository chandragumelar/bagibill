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
import { toCreateExpenseInput, type DraftInit, type DraftNotReadyReason } from "./expense-draft";
import { useExpenseDraft } from "./use-expense-draft";
import styles from "./AddExpenseEvenly.module.css";

// Six modes share one screen (mockup-inventory 1.1). Rata is the only one
// wired up — F3-02..F3-04 enable the rest — but rendering all six disabled
// is what keeps this screen's shape matching the mockup now instead of
// getting rebuilt three tasks from now (plan.md F3-01).
const SPLIT_MODE_KEYS = ["evenly", "byAmounts", "byPercentage", "byWeights", "byAdjustment", "byItems"] as const;
type SplitModeKey = (typeof SPLIT_MODE_KEYS)[number];

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

const NOT_READY_MESSAGE_KEY: Record<DraftNotReadyReason, string> = {
  emptyAmount: "expense.result.needAmount",
  noParticipants: "expense.result.needParticipants",
  payerExcluded: "expense.result.payerExcluded",
};

// spec.md 12.3 wants initials from words, not letters ("Dimas Prasetyo" -> "DP").
function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase();
}

export interface ExpenseFormRataProps {
  readonly slug: string;
  readonly init: DraftInit;
  readonly header: ReactNode;
}

export function ExpenseFormRata({ slug, init, header }: ExpenseFormRataProps) {
  const { draft, result, setTitle, setAmountMinor, toggleMember, checkAllMembers } = useExpenseDraft(init);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  const checkedCount = draft.members.filter((member) => member.checked).length;
  const minShareMinor = result.ready ? Math.min(...result.calculation.sharesMinor) : 0;
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
            const active = mode === "evenly";
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                disabled={!active}
                className={active ? `${styles.modePill} ${styles.modePillActive}` : styles.modePill}
              >
                {t(MODE_LABEL_KEY[mode])}
              </button>
            );
          })}
        </div>

        <div className={styles.participantList}>
          {draft.members.map((member) => {
            const shareMinor = shareFor(member.memberId);
            const isRounded = member.checked && shareMinor !== undefined && shareMinor > minShareMinor;
            return (
              <ListRow
                key={member.memberId}
                onClick={() => toggleMember(member.memberId)}
                leading={<Avatar initials={initialsFromName(member.name)} color={`var(${member.color})`} name={member.name} />}
                trailing={
                  member.checked ? (
                    <span className={`${styles.amount} bb-numeral`}>
                      {shareMinor === undefined ? "—" : formatMoney(shareMinor, draft.currency)}
                    </span>
                  ) : (
                    <span className={`${styles.amount} ${styles.amountExcluded}`}>{t("expense.participants.excluded")}</span>
                  )
                }
              >
                <span className={styles.memberName}>{member.name}</span>
                {isRounded ? (
                  <span className={styles.roundingBadge}>
                    {t("expense.rounding.badge", { amount: formatMoney(1, draft.currency) })}
                  </span>
                ) : null}
              </ListRow>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
