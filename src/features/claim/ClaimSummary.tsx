import { formatMoney, t } from "@/lib/i18n";
import { Button } from "@/shared/ui";
import { LockIcon } from "@/shared/system/icons";
import type { MyItemShare } from "./claim-actions";
import styles from "./ClaimSummary.module.css";

export interface ClaimSummaryProps {
  readonly expenseTitle: string;
  readonly currency: string;
  readonly totalMinor: number;
  readonly items: readonly MyItemShare[];
  readonly onBack: () => void;
}

export function ClaimSummary({ expenseTitle, currency, totalMinor, items, onBack }: ClaimSummaryProps) {
  return (
    <main className={styles.screen}>
      <span className={styles.badge} aria-hidden="true">
        <LockIcon />
      </span>
      <p className={styles.subtitle}>{t("claim.summary.subtitle", { expenseTitle })}</p>
      <p className={`${styles.total} bb-numeral`}>{formatMoney(totalMinor, currency)}</p>
      <p className={styles.caption}>{t("claim.summary.caption", { count: items.length })}</p>

      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.itemId} className={styles.row}>
            <span className={styles.rowText}>
              <span className={styles.rowName}>{item.name}</span>
              {item.claimantCount > 1 ? (
                <span className={styles.rowSub}>{t("claim.summary.sharedWith", { count: item.claimantCount })}</span>
              ) : null}
            </span>
            <span className="bb-numeral">{formatMoney(item.shareMinor, currency)}</span>
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={onBack}>
        {t("claim.summary.backButton")}
      </Button>
    </main>
  );
}
