import { useState } from "react";
import { t } from "@/lib/i18n";
import { Avatar } from "@/shared/ui";
import { InlineFailure } from "@/shared/system";
import type { MemberRow } from "./use-group-members";
import { initialsFromTwoWords } from "./group-member-helpers";
import styles from "./MemberEditPanel.module.css";

export interface MemberEditPanelProps {
  readonly row: MemberRow;
  readonly saveError: boolean;
  readonly onCancel: () => void;
  readonly onSave: (name: string, active: boolean) => Promise<void>;
  readonly onRequestDelete: (name: string, transactionCount: number) => void;
}

// Color is deliberately absent here — spec.md 18.5 / K-59 fix a member's
// color for life at addMember time, and this task explicitly keeps this
// screen from computing or reassigning one, unlike the mockup's WARNA
// swatch picker.
export function MemberEditPanel({ row, saveError, onCancel, onSave, onRequestDelete }: MemberEditPanelProps) {
  const [name, setName] = useState(row.name);
  const [active, setActive] = useState(row.active);
  const trimmedName = name.trim();

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Avatar initials={initialsFromTwoWords(trimmedName || row.name)} color={`var(${row.color})`} active={active} name={trimmedName || row.name} />
        <input
          type="text"
          className={styles.nameInput}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label={t("member.nameFieldLabel")}
        />
      </div>

      <p className={styles.groupLabel}>{t("member.statusFieldLabel")}</p>
      <div className={styles.statusToggle} role="radiogroup" aria-label={t("member.statusFieldLabel")}>
        <button
          type="button"
          role="radio"
          aria-checked={active}
          className={active ? `${styles.statusOption} ${styles.statusOptionSelected}` : styles.statusOption}
          onClick={() => setActive(true)}
        >
          {t("member.status.activeOption")}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!active}
          className={!active ? `${styles.statusOption} ${styles.statusOptionSelected}` : styles.statusOption}
          onClick={() => setActive(false)}
        >
          {t("member.status.inactiveOption")}
        </button>
      </div>
      <p className={styles.statusHint}>{active ? t("member.status.activeHint") : t("member.status.inactiveHint")}</p>

      {saveError ? (
        <InlineFailure message={t("common.saveFailed")} retryLabel={t("system.retry")} onRetry={() => void onSave(trimmedName, active)} variant="attached" />
      ) : null}

      <div className={styles.actions}>
        <button type="button" className={styles.deleteButton} onClick={() => onRequestDelete(row.name, row.transactionCount)}>
          {t("member.deleteButton")}
        </button>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          {t("member.cancelButton")}
        </button>
        <button type="button" className={styles.saveButton} onClick={() => void onSave(trimmedName, active)} disabled={trimmedName === ""}>
          {t("member.saveButton")}
        </button>
      </div>
    </div>
  );
}
