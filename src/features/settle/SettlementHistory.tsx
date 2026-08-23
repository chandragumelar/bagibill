import { formatDate, formatMoney, t } from "@/lib/i18n";
import { Avatar } from "@/shared/ui";
import { initialsFromName } from "./BalanceList";
import styles from "./SettlementHistory.module.css";

export interface SettlementHistoryEntry {
  readonly settlementId: string;
  readonly fromName: string;
  readonly fromColor: string;
  readonly toName: string;
  readonly toColor: string;
  readonly amountMinor: number;
  readonly date: number;
  readonly note?: string;
}

export interface SettlementHistoryProps {
  readonly entries: readonly SettlementHistoryEntry[];
  readonly currency: string;
  readonly onUndo: (settlementId: string) => void;
}

interface RowProps {
  readonly entry: SettlementHistoryEntry;
  readonly currency: string;
  readonly onUndo: (settlementId: string) => void;
}

function Row({ entry, currency, onUndo }: RowProps) {
  const dateLabel = formatDate(new Date(entry.date), { day: "numeric", month: "short" });
  const amountLabel = formatMoney(entry.amountMinor, currency);
  const ariaSentence = t("settle.history.rowAria", { from: entry.fromName, to: entry.toName, amount: amountLabel, date: dateLabel });

  return (
    <li className={styles.row} aria-label={ariaSentence}>
      <span className={styles.check} aria-hidden="true">
        ✓
      </span>
      <span className={styles.body}>
        <span className={styles.flow}>
          <Avatar initials={initialsFromName(entry.fromName)} color={`var(${entry.fromColor})`} size="small" name={entry.fromName} />
          <span className={styles.personName}>{entry.fromName}</span>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
          <Avatar initials={initialsFromName(entry.toName)} color={`var(${entry.toColor})`} size="small" name={entry.toName} />
          <span className={styles.personName}>{entry.toName}</span>
        </span>
        <span className={styles.meta}>
          {dateLabel}
          {entry.note !== undefined ? ` · ${entry.note}` : ""}
        </span>
      </span>
      <span className={styles.amountCol}>
        <span className={`${styles.amount} bb-numeral`}>{amountLabel}</span>
        <button type="button" className={styles.undoButton} onClick={() => onUndo(entry.settlementId)}>
          {t("settle.history.deleteButton")}
        </button>
      </span>
    </li>
  );
}

export function SettlementHistory({ entries, currency, onUndo }: SettlementHistoryProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        {t("settle.history.heading")}
        <span className={styles.count}>{t("settle.history.count", { count: entries.length })}</span>
      </div>
      {entries.length === 0 ? (
        <p className={styles.empty}>{t("settle.history.emptyBody")}</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <Row key={entry.settlementId} entry={entry} currency={currency} onUndo={onUndo} />
          ))}
        </ul>
      )}
    </div>
  );
}
