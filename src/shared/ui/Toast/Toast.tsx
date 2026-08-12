import { useId } from "react";
import { t } from "@/lib/i18n";
import styles from "@/shared/ui/Toast/Toast.module.css";

// Ambang "hampir habis" identik dengan Lapisan_Sistem.html: cincin dan
// angka pindah ke warna --warn 2.1 detik sebelum jendela undo (--dur-undo
// 6000ms) habis.
const ENDING_THRESHOLD_SECONDS = 2.1;
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export interface ToastProps {
  message: string;
  subMessage?: string;
  secondsRemaining: number;
  secondsTotal: number;
  /** >1 memicu badge hitung dan tombol "Urungkan semua". */
  count?: number;
  onUndo: () => void;
  onUndoAll?: () => void;
}

export function Toast({ message, subMessage, secondsRemaining, secondsTotal, count, onUndo, onUndoAll }: ToastProps) {
  const messageId = useId();
  const fraction = secondsTotal === 0 ? 0 : Math.max(0, secondsRemaining / secondsTotal);
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);
  const ending = secondsRemaining <= ENDING_THRESHOLD_SECONDS;
  const stacked = count !== undefined && count > 1;

  return (
    <div className={`${styles.toast} ${ending ? styles.ending : ""}`} role="status" aria-live="polite">
      <div className={styles.ring} aria-hidden="true">
        <svg viewBox="0 0 44 44">
          <circle className={styles.track} cx="22" cy="22" r={RING_RADIUS} />
          <circle
            className={styles.progress}
            cx="22"
            cy="22"
            r={RING_RADIUS}
            style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: dashOffset }}
          />
        </svg>
        <span className={styles.ringNumber}>{Math.max(0, Math.ceil(secondsRemaining))}</span>
      </div>
      <div className={styles.message} id={messageId}>
        {message}
        {subMessage ? <span className={styles.sub}>{subMessage}</span> : null}
      </div>
      {stacked ? <span className={styles.count}>{count}</span> : null}
      <button type="button" className={styles.undo} onClick={onUndo}>
        {t("toast.undo")}
      </button>
      {stacked && onUndoAll ? (
        <button type="button" className={styles.undoAll} onClick={onUndoAll}>
          {t("toast.undoAll")}
        </button>
      ) : null}
    </div>
  );
}
