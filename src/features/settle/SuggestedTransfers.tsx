import { formatMoney, t } from "@/lib/i18n";
import type { Transfer } from "@bagibill/split-engine";
import { Avatar } from "@/shared/ui";
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
  /** Opens SettleSheet prefilled with this transfer. */
  readonly onSettle: (transfer: Transfer) => void;
  /** Opens PaymentNoteSheet for the person the current member owes. */
  readonly onSendInfo: (memberId: string) => void;
  /** Opens RemindSheet for the person who owes the current member. */
  readonly onRemind: (memberId: string) => void;
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

interface TransferActionsProps {
  readonly transfer: Transfer;
  readonly fromRow: BalanceMemberRow;
  readonly toRow: BalanceMemberRow;
  readonly onSettle: (transfer: Transfer) => void;
  readonly onSendInfo: (memberId: string) => void;
  readonly onRemind: (memberId: string) => void;
}

// Mirrors the mockup's handleAct(): who I am relative to this transfer
// decides which actions make sense. Owed money (I'm the recipient) -> mark
// it settled or ask for it; I owe money -> send the recipient my payment
// info; neither party is me -> the only sensible action is marking it done
// on their behalf (e.g. a group organizer catching up the record).
function TransferActions({ transfer, fromRow, toRow, onSettle, onSendInfo, onRemind }: TransferActionsProps) {
  if (toRow.isCurrentMember) {
    return (
      <span className={styles.actions}>
        <button type="button" className={styles.action} onClick={() => onSettle(transfer)}>
          {t("settle.action.markSettled")}
        </button>
        <button type="button" className={`${styles.action} ${styles.actionPrimary}`} onClick={() => onRemind(fromRow.memberId)}>
          {t("settle.action.remind")}
        </button>
      </span>
    );
  }
  if (fromRow.isCurrentMember) {
    return (
      <span className={styles.actions}>
        <button type="button" className={`${styles.action} ${styles.actionPrimary}`} onClick={() => onSendInfo(toRow.memberId)}>
          {t("settle.action.sendInfo")}
        </button>
      </span>
    );
  }
  return (
    <span className={styles.actions}>
      <button type="button" className={styles.action} onClick={() => onSettle(transfer)}>
        {t("settle.action.markSettled")}
      </button>
    </span>
  );
}

interface TransferRowProps {
  readonly transfer: Transfer;
  readonly rows: readonly BalanceMemberRow[];
  readonly currency: string;
  readonly routed: boolean;
  readonly onSettle: (transfer: Transfer) => void;
  readonly onSendInfo: (memberId: string) => void;
  readonly onRemind: (memberId: string) => void;
}

function TransferRow({ transfer, rows, currency, routed, onSettle, onSendInfo, onRemind }: TransferRowProps) {
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
        <TransferActions transfer={transfer} fromRow={fromRow} toRow={toRow} onSettle={onSettle} onSendInfo={onSendInfo} onRemind={onRemind} />
      </div>
    </li>
  );
}

// Ringkas can suggest a transfer between two people who never owed each
// other directly (K-46's routing) — this list shows it as-is; explaining
// why is the trace sheet, part 3.
export function SuggestedTransfers({ rows, transfers, directTransfers, mode, currency, onSettle, onSendInfo, onRemind }: SuggestedTransfersProps) {
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
          onSettle={onSettle}
          onSendInfo={onSendInfo}
          onRemind={onRemind}
        />
      ))}
    </ul>
  );
}
