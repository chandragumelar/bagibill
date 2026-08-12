import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import styles from "@/app/layout/GroupHeader/GroupHeader.module.css";

export type PositionSign = "pos" | "neg" | "zero";

export interface GroupHeaderPosition {
  amount: string;
  sign: PositionSign;
  sub: ReactNode;
  /** Kartu ini nyorot dirinya sendiri waktu tab aktifnya adalah tab yang direpresentasikan kartu ini (mis. tab Saldo). */
  highlighted?: boolean;
  onClick?: () => void;
}

export interface GroupHeaderProps {
  title: string;
  onBack: () => void;
  onMenu?: () => void;
  /** Tumpukan avatar member. Dibiarkan slot, bukan komponen tersendiri, karena Beranda juga butuh pola sama nanti. */
  avatars?: ReactNode;
  position: GroupHeaderPosition;
  /** TabBar. Bersarang di dalam header karena mockup DT/DS merender begitu, bukan pilihan tata letak bebas. */
  children?: ReactNode;
}

const SIGN_CLASS: Record<PositionSign, string> = {
  pos: styles.positive ?? "",
  neg: styles.negative ?? "",
  zero: styles.zero ?? "",
};

export function GroupHeader({ title, onBack, onMenu, avatars, position, children }: GroupHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <button type="button" className={styles.iconButton} aria-label={t("nav.back")} onClick={onBack}>
          ‹
        </button>
        <div className={styles.title}>
          <h1>{title}</h1>
        </div>
        {onMenu ? (
          <button
            type="button"
            className={`${styles.iconButton} ${styles.menu}`}
            aria-label={t("nav.menu")}
            onClick={onMenu}
          >
            ⋯
          </button>
        ) : (
          <span className={styles.iconButton} aria-hidden="true" />
        )}
      </div>

      <div className={styles.mid}>
        {avatars ? <div className={styles.avatars}>{avatars}</div> : null}
        <PositionCard {...position} />
      </div>

      {children}
    </header>
  );
}

function PositionCard({ amount, sign, sub, highlighted, onClick }: GroupHeaderPosition) {
  const className = highlighted ? `${styles.position} ${styles.here}` : styles.position;

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <span className={styles.positionLabel}>{t("group.position.label")}</span>
        <span className={`${styles.positionAmount} ${SIGN_CLASS[sign]}`}>{amount}</span>
        <span className={styles.positionSub}>{sub}</span>
      </button>
    );
  }

  return (
    <div className={className}>
      <span className={styles.positionLabel}>{t("group.position.label")}</span>
      <span className={`${styles.positionAmount} ${SIGN_CLASS[sign]}`}>{amount}</span>
      <span className={styles.positionSub}>{sub}</span>
    </div>
  );
}
