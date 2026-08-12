import { Button } from "@/shared/ui/Button/Button";
import { CloudIcon, RetryIcon } from "@/shared/system/icons";
import styles from "@/shared/system/failure/LoadFailure.module.css";

export interface LoadFailureProps {
  heading: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

// Satu-satunya kegagalan layar-penuh — khusus yang beneran nunggu
// jaringan (buka grup dari undangan). Data lokal tidak pernah pakai ini.
export function LoadFailure({ heading, message, retryLabel, onRetry }: LoadFailureProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.art} aria-hidden="true">
        <CloudIcon />
      </div>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.message}>{message}</p>
      <div className={styles.retryWrap}>
        <Button onClick={onRetry}>
          <RetryIcon />
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}
