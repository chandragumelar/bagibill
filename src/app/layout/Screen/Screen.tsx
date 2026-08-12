import type { ReactNode } from "react";
import styles from "@/app/layout/Screen/Screen.module.css";

export interface ScreenProps {
  /** Topbar atau GroupHeader — chrome tetap di atas, di luar area scroll. */
  header: ReactNode;
  /** Isi yang scroll. */
  children: ReactNode;
  /** BottomBar opsional — chrome tetap di bawah, di luar area scroll. */
  bottomBar?: ReactNode;
}

// Shell flex-column dipakai tiap rute layar penuh: header dan bottomBar
// jadi sibling flex:0 0 auto, body-nya satu-satunya yang scroll.
export function Screen({ header, children, bottomBar }: ScreenProps) {
  return (
    <div className={styles.screen}>
      {header}
      <div className={styles.body}>{children}</div>
      {bottomBar}
    </div>
  );
}
