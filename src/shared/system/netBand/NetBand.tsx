import { t } from "@/lib/i18n";
import { CheckIcon, OffIcon } from "@/shared/system/icons";
import type { NetworkPhase } from "@/shared/system/netBand/useNetworkPhase";
import styles from "@/shared/system/netBand/NetBand.module.css";

export interface NetBandProps {
  phase: NetworkPhase;
  /** Wajib buat phase "offline"/"sync" — berapa perubahan lokal yang belum sinkron. */
  pendingCount?: number;
  /** Wajib buat phase "offline" — daftar nama sudah diformat pemanggil (mis. "Farhan, Sarah & 2 lainnya"). */
  recipientsText?: string;
}

// Cangkang "pita jaringan" — netral, bukan alarm. Pemanggil yang mutusin
// kapan ditampilkan sama sekali (spec: cuma di grup ber-anggota lain).
export function NetBand({ phase, pendingCount = 0, recipientsText = "" }: NetBandProps) {
  if (phase === "offline") {
    return (
      <div className={styles.band} role="status">
        <span className={styles.dot} aria-hidden="true" />
        <OffIcon />
        <span>{t("system.netband.offline", { count: pendingCount, recipients: recipientsText })}</span>
        <span className={styles.pill}>{t("system.netband.offlinePill")}</span>
      </div>
    );
  }

  if (phase === "sync") {
    return (
      <div className={`${styles.band} ${styles.sync}`} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        <span>{t("system.netband.sync", { count: pendingCount })}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.band} ${styles.done}`} role="status">
      <CheckIcon />
      <span>{t("system.netband.done")}</span>
    </div>
  );
}
