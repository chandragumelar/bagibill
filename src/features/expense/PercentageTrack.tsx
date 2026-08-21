import { t } from "@/lib/i18n";
import { PERCENTAGE_TOLERANCE, PERCENTAGE_TOTAL } from "./expense-draft";
import styles from "./PercentageTrack.module.css";

const PERCENT_MULTIPLIER = 100;
// Two decimal places — the same precision splitByPercentage accepts
// (assertValidPercentages rejects a third decimal place).
const HUNDREDTHS_PER_PERCENT = 100;

export interface PercentageTrackMember {
  readonly memberId: string;
  readonly color: string;
  readonly percent: number;
}

export interface PercentSpreadUpdate {
  readonly memberId: string;
  readonly percent: number;
}

// Splits the shortfall to 100% evenly across the given members, at two
// decimal places, any rounding leftover landing on the first one — spec.md
// 6.3's "ratakan sisa". Pure and exported so the distribution rule itself is
// testable without a button click.
export function computeSpreadRemainingPercent(
  targets: readonly { readonly memberId: string; readonly percent: number }[],
  remainingPercent: number,
): readonly PercentSpreadUpdate[] {
  if (targets.length === 0 || remainingPercent <= 0) return [];
  const remainingHundredths = Math.round(remainingPercent * HUNDREDTHS_PER_PERCENT);
  const baseHundredths = Math.floor(remainingHundredths / targets.length);
  const leftoverHundredths = remainingHundredths - baseHundredths * targets.length;
  return targets.map((target, index) => ({
    memberId: target.memberId,
    percent: (baseHundredths + (index === 0 ? leftoverHundredths : 0)) / HUNDREDTHS_PER_PERCENT,
  }));
}

// Zero-value checked members get the shortfall; if every checked member is
// already non-zero, there's nothing left to single out, so it goes to all
// of them instead (spec.md 6.3, K-83-style mockup mechanics).
function spreadTargets(
  members: readonly PercentageTrackMember[],
): readonly { readonly memberId: string; readonly percent: number }[] {
  const zeroMembers = members.filter((member) => member.percent === 0);
  return zeroMembers.length > 0 ? zeroMembers : members;
}

type PercentState = { readonly kind: "exact" } | { readonly kind: "under" | "over"; readonly diffPercent: number };

function resolvePercentState(percentSum: number): PercentState {
  const diffPercent = PERCENTAGE_TOTAL - percentSum;
  if (Math.abs(diffPercent) <= PERCENTAGE_TOLERANCE) return { kind: "exact" };
  return diffPercent > 0 ? { kind: "under", diffPercent } : { kind: "over", diffPercent: -diffPercent };
}

const READBOX_ICON: Record<PercentState["kind"], string> = { exact: "✓", under: "◐", over: "⚠" };

function readboxText(state: PercentState, percentSum: number): string {
  if (state.kind === "exact") return t("expense.percentage.exact");
  const params = { diff: state.diffPercent, sum: percentSum };
  return t(state.kind === "under" ? "expense.percentage.under" : "expense.percentage.over", params);
}

function readboxClass(kind: PercentState["kind"]): string {
  if (kind === "exact") return `${styles.readbox} ${styles.readboxExact}`;
  if (kind === "under") return `${styles.readbox} ${styles.readboxUnder}`;
  return `${styles.readbox} ${styles.readboxOver}`;
}

export interface PercentageTrackProps {
  readonly members: readonly PercentageTrackMember[];
  readonly onSpreadRemaining: (updates: readonly PercentSpreadUpdate[]) => void;
}

// One 0-100 track for mode Persen: a target line at 100, colored segments
// per member (from the raw percent values themselves, not from money), and
// the "ratakan sisa" action. Percent is a ratio, not money — summing it here
// is the same category of arithmetic ExpenseFormPorsi already does for
// weight totals.
export function PercentageTrack({ members, onSpreadRemaining }: PercentageTrackProps) {
  const percentSum = members.reduce((sum, member) => sum + member.percent, 0);
  const state = resolvePercentState(percentSum);
  const denomPercent = Math.max(PERCENTAGE_TOTAL, percentSum);
  const targetPercentPosition = (PERCENTAGE_TOTAL / denomPercent) * PERCENT_MULTIPLIER;
  const remainingPercent = PERCENTAGE_TOTAL - percentSum;
  const canSpreadRemaining = remainingPercent > PERCENTAGE_TOLERANCE;

  function handleSpreadRemaining(): void {
    onSpreadRemaining(computeSpreadRemainingPercent(spreadTargets(members), remainingPercent));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        {members
          .filter((member) => member.percent > 0)
          .map((member) => (
            <div
              key={member.memberId}
              className={styles.segment}
              style={{
                width: `${((member.percent / denomPercent) * PERCENT_MULTIPLIER).toFixed(3)}%`,
                background: `var(${member.color})`,
              }}
            />
          ))}
        {remainingPercent > 0 ? (
          <div
            className={styles.hatch}
            style={{ width: `${((remainingPercent / denomPercent) * PERCENT_MULTIPLIER).toFixed(3)}%` }}
          />
        ) : null}
        <div className={styles.target} style={{ left: `${targetPercentPosition.toFixed(3)}%` }} />
      </div>
      <div className={readboxClass(state.kind)} role="status">
        <span aria-hidden="true">{READBOX_ICON[state.kind]}</span>
        <span>{readboxText(state, percentSum)}</span>
      </div>
      <button type="button" className={styles.spreadButton} onClick={handleSpreadRemaining} disabled={!canSpreadRemaining}>
        {t("expense.percentage.spreadRemaining")}
      </button>
    </div>
  );
}
