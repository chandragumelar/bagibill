import type { SplitWarning, TreatTransfer } from "@bagibill/split-engine";
import { t, formatMoney } from "@/lib/i18n";
import { NOT_READY_MESSAGE_KEY } from "./expense-draft";
import type { ChargeDraft, ChargeDraftAllocationMode, ExpenseDraftMember } from "./expense-draft";
import type { ExpenseDraftResult } from "./use-expense-draft";
import styles from "./ResultPanel.module.css";

const ALLOCATION_LABEL_KEY: Record<ChargeDraftAllocationMode, string> = {
  proportional: "expense.charge.allocationProportional",
  even: "expense.charge.allocationEven",
  single_payer: "expense.charge.allocationSinglePayer",
};

function chargeName(charge: ChargeDraft, index: number): string {
  const trimmed = charge.name.trim();
  return trimmed === "" ? t("expense.charge.unnamed", { index: index + 1 }) : trimmed;
}

function chargeValueLabel(charge: ChargeDraft, currency: string): string {
  if (charge.amountKind === "percent") return `${charge.rawValue || "0"}%`;
  const fixedMinor = Number(charge.rawValue || "0");
  return formatMoney(Number.isFinite(fixedMinor) ? fixedMinor : 0, currency);
}

function memberNameAt(members: readonly ExpenseDraftMember[], index: number): string {
  return members.at(index)?.name ?? "";
}

interface MemberShareListProps {
  readonly members: readonly ExpenseDraftMember[];
  readonly sharesMinor: readonly number[];
  readonly currency: string;
}

// The reason this exists: a treated-to-zero member must never disappear
// from this list (CLAUDE.md hard rule). Iterating `members` unconditionally
// and reading sharesMinor by position is what guarantees that — there's no
// filter step anywhere that could drop a zero.
function MemberShareList({ members, sharesMinor, currency }: MemberShareListProps) {
  return (
    <ul className={styles.memberList}>
      {members.map((member, index) => {
        const shareMinor = sharesMinor[index] ?? 0;
        const isNegative = shareMinor < 0;
        return (
          <li key={member.memberId} className={styles.memberRow}>
            <span className={styles.memberName}>{member.name}</span>
            <span className={styles.memberAmountGroup}>
              <span className={`${styles.memberAmount} bb-numeral ${isNegative ? styles.memberAmountNegative : ""}`}>
                {formatMoney(shareMinor, currency)}
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
  readonly charges: readonly ChargeDraft[];
  readonly perCharge: readonly { readonly chargeTotalMinor: number }[];
  readonly members: readonly ExpenseDraftMember[];
  readonly currency: string;
}

function ChargeBreakdownList({ charges, perCharge, members, currency }: ChargeBreakdownListProps) {
  return (
    <ul className={styles.chargeList}>
      {charges.map((charge, index) => {
        const totalMinor = perCharge.at(index)?.chargeTotalMinor ?? 0;
        const sponsorName =
          charge.allocationMode === "single_payer"
            ? members.find((member) => member.memberId === charge.allocationMemberId)?.name
            : undefined;
        return (
          <li key={charge.id} className={styles.chargeRow}>
            <div className={styles.chargeRowMain}>
              <div>
                <div className={styles.chargeName}>{chargeName(charge, index)}</div>
                <div className={styles.chargeRule}>
                  {chargeValueLabel(charge, currency)} · {t(ALLOCATION_LABEL_KEY[charge.allocationMode])}
                </div>
              </div>
              <span className={`${styles.chargeAmount} bb-numeral`}>{formatMoney(totalMinor, currency)}</span>
            </div>
            {sponsorName !== undefined ? (
              <div className={styles.sponsorNote}>
                {t("expense.charge.sponsorNote", { name: sponsorName, amount: formatMoney(totalMinor, currency) })}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

interface TreatSentenceListProps {
  readonly transfers: readonly TreatTransfer[];
  readonly members: readonly ExpenseDraftMember[];
  readonly currency: string;
}

// Sentences are built from the engine's treatTransfers, never from the
// draft's treats array — treatTransfers already reflects K-39's sequential
// processing (a treat chain's real net effect), which the draft alone
// can't tell you.
function TreatSentenceList({ transfers, members, currency }: TreatSentenceListProps) {
  return (
    <ul className={styles.treatList}>
      {transfers.map((transfer, index) => (
        <li key={index} className={styles.treatRow}>
          {t("expense.treat.transferSentence", {
            sponsor: memberNameAt(members, transfer.sponsorIndex),
            beneficiary: memberNameAt(members, transfer.beneficiaryIndex),
            amount: formatMoney(transfer.amountMinor, currency),
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
        <>
          <MemberShareList members={members} sharesMinor={result.calculation.sharesMinor} currency={currency} />
          {charges.length > 0 ? (
            <ChargeBreakdownList charges={charges} perCharge={result.calculation.perCharge} members={members} currency={currency} />
          ) : null}
          {result.calculation.treatTransfers.length > 0 ? (
            <TreatSentenceList transfers={result.calculation.treatTransfers} members={members} currency={currency} />
          ) : null}
          {result.calculation.warnings.length > 0 ? (
            <WarningList warnings={result.calculation.warnings} currency={currency} />
          ) : null}
        </>
      )}
    </div>
  );
}
