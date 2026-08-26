import { t } from "@/lib/i18n";
import { Avatar } from "@/shared/ui";
import type { MemberRow } from "./use-group-members";
import { initialsFromTwoWords } from "./group-member-helpers";
import styles from "./MemberManageRow.module.css";

export interface MemberManageRowProps {
  readonly row: MemberRow;
  readonly onStartEdit: () => void;
}

// spec.md 12.2's "Bergabung" (joined via an invite link) pill has no
// backing data yet — MemberRecord carries no join-method field, and the
// /j/ join flow itself is in progress.md's "Ditunda" list. Every member
// gelombang 1 can actually produce was typed by the creator, so every row
// renders "Cuma nama" — showing "Bergabung" here would be a status no
// member could actually be in yet (Keputusan, progress.md).
export function MemberManageRow({ row, onStartEdit }: MemberManageRowProps) {
  return (
    <button type="button" className={styles.row} onClick={onStartEdit}>
      <Avatar initials={initialsFromTwoWords(row.name)} color={`var(${row.color})`} active={row.active} name={row.name} />
      <span className={styles.info}>
        <span className={row.active ? styles.name : styles.nameInactive}>{row.name}</span>
        <span className={styles.badges}>
          {row.active ? null : (
            <span className={styles.badgeInactive}>
              <span aria-hidden="true">⏸</span> {t("member.status.inactiveOption")}
            </span>
          )}
          <span className={styles.badgeNameOnly}>
            <span aria-hidden="true">✎</span> {t("member.status.nameOnly")}
          </span>
          {row.transactionCount > 0 ? (
            <span className={styles.txCount}>{t("member.transactionCount", { count: row.transactionCount })}</span>
          ) : null}
        </span>
      </span>
      <span className={styles.editLabel}>{t("member.editButton")}</span>
    </button>
  );
}
