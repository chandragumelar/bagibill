import { t } from "@/lib/i18n";
import { BanIcon, LockIcon } from "@/shared/system/icons";
import styles from "@/shared/system/lockedAction/LockedActionExplain.module.css";

export interface LockedActionExplainProps {
  name: string;
  transactionCount: number;
  onDeactivate: () => void;
}

// Anak "terkunci" dari tangga bahaya — bukan konfirmasi, penjelasan.
// Warnanya netral (--risk-locked), bukan merah: ini bukan bahaya, cuma
// tombolnya tidak melakukan yang dikira.
export function LockedActionExplain({ name, transactionCount, onDeactivate }: LockedActionExplainProps) {
  return (
    <div className={styles.explain} role="status">
      <span className={styles.icon}>
        <LockIcon />
      </span>
      <div>
        <p className={styles.reason}>{t("system.locked.reason", { name, count: transactionCount })}</p>
        <p className={styles.instruction}>{t("system.locked.instruction")}</p>
        <button type="button" className={styles.deactivateLink} onClick={onDeactivate}>
          <BanIcon />
          {t("system.locked.deactivate", { name })}
        </button>
      </div>
    </div>
  );
}
