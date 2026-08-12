import { RetryIcon, WarnIcon } from "@/shared/system/icons";
import styles from "@/shared/system/failure/InlineFailure.module.css";

export interface InlineFailureProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  /** "boxed" berdiri sendiri di atas tombol simpan (savefail). "attached" nempel di bawah satu baris tanpa border/radius sendiri (rowfail). */
  variant?: "boxed" | "attached";
}

// Dua dari tiga bentuk kegagalan (savefail, rowfail) berbagi bentuk ini —
// CSS aslinya nyaris identik di Lapisan_Sistem.html (.savefail vs .txfail).
export function InlineFailure({ message, retryLabel, onRetry, variant = "boxed" }: InlineFailureProps) {
  const className = variant === "boxed" ? `${styles.failure} ${styles.boxed}` : `${styles.failure} ${styles.attached}`;
  return (
    <div className={className} role="alert">
      <WarnIcon />
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.retry} onClick={onRetry}>
        <RetryIcon />
        {retryLabel}
      </button>
    </div>
  );
}
