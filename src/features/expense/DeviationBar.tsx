import { t, formatMoney } from "@/lib/i18n";
import styles from "./DeviationBar.module.css";

const PERCENT_MULTIPLIER = 100;
// Deviation fill never reaches the track edges — a visual margin so the
// biggest adjustment in the row still reads as a bar, not a solid block
// touching the frame (mockup's own 46% cap on a 50%-per-side track).
const MAX_DEVIATION_WIDTH_PERCENT = 46;

export interface DeviationBarProps {
  /** Final per-person amount, read directly from the engine's own sharesMinor — never recomputed here. */
  readonly shareMinor: number;
  /** Raw draft input, already known — not derived. */
  readonly adjustmentMinor: number;
  /** Largest |adjustmentMinor| among the checked members, for a shared scale across every row's bar. */
  readonly maxAbsAdjustmentMinor: number;
  readonly currency: string;
}

function badgeText(adjustmentMinor: number, currency: string): string | undefined {
  if (adjustmentMinor > 0) {
    return t("expense.deviation.added", { amount: `+${formatMoney(adjustmentMinor, currency)}` });
  }
  if (adjustmentMinor < 0) {
    return t("expense.deviation.deducted", { amount: formatMoney(adjustmentMinor, currency) });
  }
  return undefined;
}

// One per-person deviation indicator for mode Selisih: the track's center
// is the even share, the fill grows right for a top-up and left for a
// deduction. An extreme deduction can push shareMinor negative — shown as a
// negative number, never clamped to zero (F1-04, K-29).
export function DeviationBar({ shareMinor, adjustmentMinor, maxAbsAdjustmentMinor, currency }: DeviationBarProps) {
  const badge = badgeText(adjustmentMinor, currency);
  const isNegativeShare = shareMinor < 0;
  const widthPercent =
    maxAbsAdjustmentMinor > 0 ? (Math.abs(adjustmentMinor) / maxAbsAdjustmentMinor) * MAX_DEVIATION_WIDTH_PERCENT : 0;
  const halfTrackPercent = PERCENT_MULTIPLIER / 2;

  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        {adjustmentMinor > 0 ? (
          <div
            className={`${styles.fill} ${styles.fillPositive}`}
            style={{ left: `${halfTrackPercent}%`, width: `${widthPercent.toFixed(3)}%` }}
          />
        ) : null}
        {adjustmentMinor < 0 ? (
          <div
            className={`${styles.fill} ${styles.fillNegative}`}
            style={{ left: `${(halfTrackPercent - widthPercent).toFixed(3)}%`, width: `${widthPercent.toFixed(3)}%` }}
          />
        ) : null}
        <div className={styles.center} />
      </div>
      <div className={styles.meta}>
        {badge !== undefined ? <span className={styles.badge}>{badge}</span> : null}
        <span className={`${styles.amount} bb-numeral ${isNegativeShare ? styles.amountNegative : ""}`}>
          {formatMoney(shareMinor, currency)}
        </span>
        {isNegativeShare ? <span className={styles.negativeBadge}>{t("expense.result.negativeBadge")}</span> : null}
      </div>
    </div>
  );
}
