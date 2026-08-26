import { t } from "@/lib/i18n";
import { WarnIcon } from "@/shared/system";
import styles from "./SimilarNameWarning.module.css";

export interface SimilarNameWarningProps {
  readonly matchedName: string;
  readonly suggestedName: string;
  readonly onKeepAdding: () => void;
  readonly onAddSuggested: () => void;
}

// spec.md 12.2's two ways out of a caught similar name: keep the typed
// name as-is (two people really can share a name), or take the
// generic-letter-suffix suggestion as a starting point. Shared by the
// create-group draft list and the manage screen's add field.
export function SimilarNameWarning({ matchedName, suggestedName, onKeepAdding, onAddSuggested }: SimilarNameWarningProps) {
  return (
    <div className={styles.warning} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <WarnIcon />
      </span>
      <div className={styles.body}>
        <p className={styles.message}>{t("member.similar.warning", { name: matchedName })}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.actionButton} onClick={onKeepAdding}>
            {t("member.similar.keepAdding")}
          </button>
          <button type="button" className={`${styles.actionButton} ${styles.actionPrimary}`} onClick={onAddSuggested}>
            {t("member.similar.addSuggested", { name: suggestedName })}
          </button>
        </div>
      </div>
    </div>
  );
}
