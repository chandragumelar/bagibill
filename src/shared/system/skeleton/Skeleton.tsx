import type { CSSProperties } from "react";
import styles from "@/shared/system/skeleton/Skeleton.module.css";

export type SkeletonVariant = "card" | "line";

export interface SkeletonProps {
  variant: SkeletonVariant;
  /** Lebar baris, mis. "60%" — dipakai LS buat variasi panjang baris teks. */
  width?: string;
}

// Cuma di layar yang beneran nunggu jaringan (buka grup dari undangan).
// Data lokal tidak pernah punya spinner atau skeleton.
export function Skeleton({ variant, width }: SkeletonProps) {
  const className = variant === "card" ? `${styles.skeleton} ${styles.card}` : `${styles.skeleton} ${styles.line}`;
  const style: CSSProperties | undefined = width ? { width } : undefined;
  return <div className={className} style={style} aria-hidden="true" />;
}
