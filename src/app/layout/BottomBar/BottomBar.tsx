import type { ReactNode } from "react";
import styles from "@/app/layout/BottomBar/BottomBar.module.css";

export interface BottomBarProps {
  /** Satu atau dua Button (shared/ui), ditumpuk penuh lebar. */
  children: ReactNode;
}

// Sibling flex:0 0 auto dari body yang scroll (BG + KI), bukan position:fixed
// — lebih tahan terhadap keyboard/browser chrome tanpa perlu hack safe-area.
export function BottomBar({ children }: BottomBarProps) {
  return <div className={styles.bar}>{children}</div>;
}
