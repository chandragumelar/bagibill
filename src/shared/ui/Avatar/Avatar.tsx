import type { CSSProperties } from "react";
import styles from "@/shared/ui/Avatar/Avatar.module.css";

export type AvatarSize = "normal" | "small" | "stack";

export interface AvatarProps {
  /** Inisial dari kata, dihitung pemanggil (mis. "Dimas Prasetyo" -> "DP"). */
  initials: string;
  /** Warna member, token palet mis. "var(--m-3)". Avatar tidak menghitung warnanya sendiri. */
  color: string;
  size?: AvatarSize;
  /** false = nonaktif: cincin putus-putus warna member, bukan terisi. */
  active?: boolean;
  /** Orang ke-13 dst yang mengulang warna dari --m-1 (K-07): cincin luar putus-putus netral. */
  colorRepeated?: boolean;
  /** Nama lengkap untuk screen reader. Wajib diisi kecuali avatar ini muncul
   * di tumpukan avatar header yang sudah didampingi nama di tempat lain. */
  name?: string;
}

const SIZE_CLASS: Record<AvatarSize, string> = {
  normal: styles.normal ?? "",
  small: styles.small ?? "",
  stack: styles.stack ?? "",
};

export function Avatar({ initials, color, size = "normal", active = true, colorRepeated = false, name }: AvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const stateClass = active ? styles.active : styles.inactive;
  const style: CSSProperties = active ? { background: color } : { borderColor: color, color };
  const a11yProps = name ? { role: "img" as const, "aria-label": name } : { "aria-hidden": true as const };

  const circle = (
    <span className={`${styles.base} ${sizeClass} ${stateClass}`} style={style} {...a11yProps}>
      {initials}
    </span>
  );

  if (!colorRepeated) return circle;

  return <span className={styles.repeatRing}>{circle}</span>;
}
