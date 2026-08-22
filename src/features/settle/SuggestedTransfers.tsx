import { formatMoney, t } from "@/lib/i18n";
import type { Transfer } from "@bagibill/split-engine";
import { Avatar } from "@/shared/ui/Avatar/Avatar";
import { initialsFromName } from "./BalanceList";
import { isRoutedTransfer } from "./TransferNetwork";
import type { BalanceMemberRow, SettlementMode } from "./use-group-balance";
import styles from "./SuggestedTransfers.module.css";

export interface SuggestedTransfersProps {
  readonly rows: readonly BalanceMemberRow[];
  readonly transfers: readonly Transfer[];
  /** Always the pairwise list — used only to tell a routed simplified transfer apart from a direct one. */
  readonly directTransfers: readonly Transfer[];
  readonly mode: SettlementMode;
  readonly currency: string;
}

interface PersonProps {
  readonly row: BalanceMemberRow;
}

function Person({ row }: PersonProps) {
  return (
    <span className={styles.person}>
      <Avatar
        initials={initialsFromName(row.name)}
        color={`var(${row.color})`}
        size="small"
        active={!row.isInactive}
        name={row.name}
      />
      <span className={styles.personName}>{row.isCurrentMember ? t("group.balance.youShort") : row.name}</span>
    </span>
  );
}

interface TransferRowProps {
  readonly transfer: Transfer;
  readonly rows: readonly BalanceMemberRow[];
  readonly currency: string;
  readonly routed: boolean;
}

// The pelunasan/tagih actions this row will grow in part 2 live in the
// trailing area next to the amount — the layout already reserves that slot,
// it just has nothing rendered there yet (F3-07 bagian 1 scope).
function TransferRow({ transfer, rows, currency, routed }: TransferRowProps) {
  const fromRow = rows[transfer.fromIndex];
  const toRow = rows[transfer.toIndex];
  if (fromRow === undefined || toRow === undefined) return null;

  return (
    <li className={styles.row}>
      {routed ? <span className={styles.routedBadge}>{t("group.balance.routedBadge")}</span> : null}
      <div className={styles.flow}>
        <Person row={fromRow} />
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
        <Person row={toRow} />
      </div>
      <div className={styles.body}>
        <span className={`${styles.amount} bb-numeral`}>{formatMoney(transfer.amountMinor, currency)}</span>
      </div>
    </li>
  );
}

// Ringkas can suggest a transfer between two people who never owed each
// other directly (K-46's routing) — this list shows it as-is; explaining
// why is the trace sheet, part 2.
export function SuggestedTransfers({ rows, transfers, directTransfers, mode, currency }: SuggestedTransfersProps) {
  if (transfers.length === 0) return null;

  return (
    <ul className={styles.list}>
      {transfers.map((transfer, index) => (
        <TransferRow
          key={`${transfer.fromIndex}-${transfer.toIndex}-${index}`}
          transfer={transfer}
          rows={rows}
          currency={currency}
          routed={mode === "simplified" && isRoutedTransfer(transfer, directTransfers)}
        />
      ))}
    </ul>
  );
}
