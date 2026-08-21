import type { ChargeAllocation, ExpenseCalculation, SplitWarning } from "@bagibill/split-engine";
import { t, formatMoney } from "@/lib/i18n";
import { buildExpenseSummary } from "@/lib/expense-summary";
import type { ExpenseChargeMeta, ExpenseMemberInfo, ExpenseSummary } from "@/lib/expense-summary";
import { NOT_READY_MESSAGE_KEY } from "./expense-draft";
import type { ChargeDraft, ExpenseDraftMember } from "./expense-draft";
import type { ExpenseDraftResult } from "./use-expense-draft";
import styles from "./ResultPanel.module.css";

const ALLOCATION_LABEL_KEY: Record<ChargeAllocation["mode"], string> = {
  proportional: "expense.charge.allocationProportional",
  even: "expense.charge.allocationEven",
  single_payer: "expense.charge.allocationSinglePayer",
  items: "expense.charge.allocationItems",
};

// A charge row mid-typing ("", "-", "12.") parses to nothing yet — same
// tolerant parse expense-draft.ts's buildChargeAmount uses, duplicated here
// on purpose: expense-draft.ts isn't in this task's file scope, and the
// shared expense-summary module must not import ChargeDraft (a feature type).
function parseChargeRawValue(rawValue: string): number {
  const trimmed = rawValue.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === ".") return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

function draftChargeToMeta(charge: ChargeDraft): ExpenseChargeMeta {
  const value = parseChargeRawValue(charge.rawValue);
  const amount =
    charge.amountKind === "percent"
      ? ({ kind: "percent", percent: value, basis: charge.percentBasis } as const)
      : ({ kind: "fixed", amountMinor: value } as const);
  return {
    name: charge.name.trim(),
    amount,
    allocationMode: charge.allocationMode,
    sponsorMemberId: charge.allocationMode === "single_payer" ? charge.allocationMemberId : undefined,
  };
}

function displayChargeName(charge: { readonly name?: string }, index: number): string {
  const trimmed = charge.name?.trim() ?? "";
  return trimmed === "" ? t("expense.charge.unnamed", { index: index + 1 }) : trimmed;
}

function chargeValueLabel(amount: ExpenseChargeMeta["amount"], currency: string): string {
  return amount.kind === "percent" ? `${amount.percent}%` : formatMoney(amount.amountMinor, currency);
}

interface MemberShareListProps {
  readonly members: readonly ExpenseSummary["members"][number][];
  readonly currency: string;
}

// The reason this exists: a treated-to-zero member must never disappear
// from this list (CLAUDE.md hard rule). summary.members already covers
// every participant unconditionally — there's no filter step anywhere
// upstream that could drop a zero.
function MemberShareList({ members, currency }: MemberShareListProps) {
  return (
    <ul className={styles.memberList}>
      {members.map((member) => {
        const isNegative = member.shareMinor < 0;
        return (
          <li key={member.memberId} className={styles.memberRow}>
            <span className={styles.memberName}>{member.name}</span>
            <span className={styles.memberAmountGroup}>
              <span className={`${styles.memberAmount} bb-numeral ${isNegative ? styles.memberAmountNegative : ""}`}>
                {formatMoney(member.shareMinor, currency)}
              </span>
              {isNegative ? <span className={styles.negativeBadge}>{t("expense.result.negativeBadge")}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface ChargeBreakdownListProps {
  readonly charges: ExpenseSummary["charges"];
  readonly currency: string;
}

function ChargeBreakdownList({ charges, currency }: ChargeBreakdownListProps) {
  return (
    <ul className={styles.chargeList}>
      {charges.map((charge, index) => (
        <li key={index} className={styles.chargeRow}>
          <div className={styles.chargeRowMain}>
            <div>
              <div className={styles.chargeName}>{displayChargeName(charge, index)}</div>
              <div className={styles.chargeRule}>
                {chargeValueLabel(charge.amount, currency)} · {t(ALLOCATION_LABEL_KEY[charge.allocationMode])}
              </div>
            </div>
            <span className={`${styles.chargeAmount} bb-numeral`}>{formatMoney(charge.totalMinor, currency)}</span>
          </div>
          {charge.sponsorName !== undefined ? (
            <div className={styles.sponsorNote}>
              {t("expense.charge.sponsorNote", { name: charge.sponsorName, amount: formatMoney(charge.totalMinor, currency) })}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

interface TreatSentenceListProps {
  readonly treats: ExpenseSummary["treats"];
  readonly currency: string;
}

// Sentences are built from the engine's treatTransfers (via
// buildExpenseSummary), never from the draft's treats array — treatTransfers
// already reflects K-39's sequential processing (a treat chain's real net
// effect), which the draft alone can't tell you.
function TreatSentenceList({ treats, currency }: TreatSentenceListProps) {
  return (
    <ul className={styles.treatList}>
      {treats.map((treat, index) => (
        <li key={index} className={styles.treatRow}>
          {t("expense.treat.transferSentence", {
            sponsor: treat.sponsorName,
            beneficiary: treat.beneficiaryName,
            amount: formatMoney(treat.amountMinor, currency),
          })}
        </li>
      ))}
    </ul>
  );
}

function warningMessage(warning: SplitWarning, currency: string): string {
  switch (warning.code) {
    case "under_allocated":
      return t("expense.warning.underAllocated", { amount: formatMoney(warning.remainingMinor, currency) });
    case "over_allocated":
      return t("expense.warning.overAllocated", { amount: formatMoney(warning.excessMinor, currency) });
    case "negative_share":
      return t("expense.warning.negativeShare");
    case "unclaimed_items":
      return t("expense.warning.unclaimedItems");
    case "claim_weight_mismatch":
      return t("expense.warning.claimWeightMismatch");
    case "large_group_simplify":
      return t("expense.warning.largeGroupSimplify");
  }
}

interface WarningListProps {
  readonly warnings: readonly SplitWarning[];
  readonly currency: string;
}

function WarningList({ warnings, currency }: WarningListProps) {
  return (
    <ul className={styles.warningList} role="alert">
      {warnings.map((warning, index) => (
        <li key={index} className={styles.warningRow}>
          {warningMessage(warning, currency)}
        </li>
      ))}
    </ul>
  );
}

export interface ResultPanelProps {
  /** Checked members, in the same order as result.memberOrder. */
  readonly members: readonly ExpenseDraftMember[];
  readonly charges: readonly ChargeDraft[];
  readonly treatCount: number;
  readonly currency: string;
  readonly result: ExpenseDraftResult;
}

function buildMemberInfoMap(members: readonly ExpenseDraftMember[]): ReadonlyMap<string, ExpenseMemberInfo> {
  return new Map(members.map((member) => [member.memberId, { memberId: member.memberId, name: member.name, color: member.color }]));
}

// Only renders once there's something beyond the plain split to show —
// mirrors the mockup's "Biaya tambahan (Penuh only)" gating, and keeps
// every screen that never touches charges/treats byte-for-byte unchanged.
export function ResultPanel({ members, charges, treatCount, currency, result }: ResultPanelProps) {
  if (charges.length === 0 && treatCount === 0) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>{t("expense.resultPanel.heading")}</div>
      {!result.ready ? (
        <p className={styles.notReady}>{t(NOT_READY_MESSAGE_KEY[result.reason])}</p>
      ) : (
        <ReadyResultBody members={members} charges={charges} currency={currency} calculation={result.calculation} />
      )}
    </div>
  );
}

interface ReadyResultBodyProps {
  readonly members: readonly ExpenseDraftMember[];
  readonly charges: readonly ChargeDraft[];
  readonly currency: string;
  readonly calculation: ExpenseCalculation;
}

function ReadyResultBody({ members, charges, currency, calculation }: ReadyResultBodyProps) {
  const summary: ExpenseSummary = buildExpenseSummary({
    memberOrder: members.map((member) => member.memberId),
    memberInfo: buildMemberInfoMap(members),
    chargeMeta: charges.map(draftChargeToMeta),
    calculation,
  });

  return (
    <>
      <MemberShareList members={summary.members} currency={currency} />
      {summary.charges.length > 0 ? <ChargeBreakdownList charges={summary.charges} currency={currency} /> : null}
      {summary.treats.length > 0 ? <TreatSentenceList treats={summary.treats} currency={currency} /> : null}
      {summary.warnings.length > 0 ? <WarningList warnings={summary.warnings} currency={currency} /> : null}
    </>
  );
}
