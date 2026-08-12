import type { ReactNode } from "react";
import styles from "@/app/layout/Topbar/Topbar.module.css";

export interface TopbarProps {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

// Dari .topbar Lapisan_Sistem.html — satu pola dipakai identik di tiga
// layar non-grup (tambah, kelola member, join). Slot kiri/kanan selebar
// --size-touch-min biar judul di tengah tetap seimbang walau salah satu
// slot kosong.
export function Topbar({ title, leading, trailing }: TopbarProps) {
  return (
    <div className={styles.topbar}>
      <div className={styles.slot}>{leading}</div>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.slot}>{trailing}</div>
    </div>
  );
}

export interface TopbarButtonProps {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  tone?: "default" | "ghost";
}

/** Tombol teks atau ikon buat slot Topbar. Bukan varian Button (shared/ui) — bentuknya inline, bukan blok penuh lebar. */
export function TopbarButton({ label, onClick, icon, tone = "default" }: TopbarButtonProps) {
  if (icon) {
    return (
      <button type="button" className={styles.iconButton} aria-label={label} onClick={onClick}>
        {icon}
      </button>
    );
  }

  const className = tone === "ghost" ? `${styles.textButton} ${styles.ghost}` : styles.textButton;
  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}
