import { formatMoney, t } from "@/lib/i18n";
import { Avatar } from "@/shared/ui/Avatar/Avatar";
import type { BalanceMemberRow } from "./use-group-balance";
import styles from "./BalanceList.module.css";

export interface BalanceListProps {
  readonly rows: readonly BalanceMemberRow[];
  readonly currency: string;
  /** Set briefly when the header's "posisi kamu" card is tapped — flashes that row without reordering the list. */
  readonly highlightedMemberId?: string;
}

// Shared with TransferNetwork/SuggestedTransfers — one copy in the settle
// feature's chunk instead of three, since it's the same rule everywhere.
export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

// A deactivated member with nothing left to settle would just be noise —
// but one who still carries a balance has to stay visible, or the group's
// balances would stop summing to zero on screen (CLAUDE.md hard rule).
function visibleRows(rows: readonly BalanceMemberRow[]): readonly BalanceMemberRow[] {
  return rows.filter((row) => !row.isInactive || row.netMinor !== 0);
}

// Direction is carried by the sign glyph and the word together, never by
// color alone — plan.md's done-criteria for this tab names this explicitly,
// and a colorblind or bright-sunlight reader needs both.
function signedAmount(netMinor: number, currency: string): string {
  const magnitude = formatMoney(Math.abs(netMinor), currency);
  if (netMinor > 0) return `+${magnitude}`;
  if (netMinor < 0) return `−${magnitude}`;
  return magnitude;
}

interface DirectionTagProps {
  readonly netMinor: number;
}

function DirectionTag({ netMinor }: DirectionTagProps) {
  if (netMinor > 0) {
    return (
      <span className={`${styles.tag} ${styles.tagPos}`}>
        <span aria-hidden="true">↓</span>
        {t("group.balance.directionReceive")}
      </span>
    );
  }
  if (netMinor < 0) {
    return (
      <span className={`${styles.tag} ${styles.tagNeg}`}>
        <span aria-hidden="true">↑</span>
        {t("group.balance.directionPay")}
      </span>
    );
  }
  return <span className={`${styles.tag} ${styles.tagZero}`}>{t("group.balance.directionSettled")}</span>;
}

interface BalanceRowProps {
  readonly row: BalanceMemberRow;
  readonly currency: string;
  readonly highlighted: boolean;
}

function toneClassFor(netMinor: number): string {
  if (netMinor > 0) return styles.pos ?? "";
  if (netMinor < 0) return styles.neg ?? "";
  return styles.zero ?? "";
}

function BalanceRow({ row, currency, highlighted }: BalanceRowProps) {
  const className = [styles.row, toneClassFor(row.netMinor), row.isCurrentMember ? styles.me : "", highlighted ? styles.highlighted : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <Avatar initials={initialsFromName(row.name)} color={`var(${row.color})`} active={!row.isInactive} name={row.name} />
      <span className={styles.identity}>
        <span className={styles.name}>
          <span className={styles.nameText}>{row.name}</span>
          {row.isCurrentMember ? <span className={styles.youBadge}>{t("group.balance.youBadge")}</span> : null}
          {row.isInactive ? <span className={styles.inactiveBadge}>{t("group.balance.inactiveBadge")}</span> : null}
        </span>
      </span>
      <span className={styles.amountWrap}>
        <DirectionTag netMinor={row.netMinor} />
        <span className={`${styles.amount} bb-numeral`}>{signedAmount(row.netMinor, currency)}</span>
      </span>
    </div>
  );
}

export function BalanceList({ rows, currency, highlightedMemberId }: BalanceListProps) {
  const visible = visibleRows(rows);
  return (
    <div className={styles.wrap}>
      <div className={styles.list}>
        {visible.map((row) => (
          <BalanceRow key={row.memberId} row={row} currency={currency} highlighted={row.memberId === highlightedMemberId} />
        ))}
      </div>
      <div className={styles.invariant}>{t("group.balance.invariantNote", { total: formatMoney(0, currency) })}</div>
    </div>
  );
}
