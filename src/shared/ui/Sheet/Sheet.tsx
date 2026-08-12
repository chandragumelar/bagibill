import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import styles from "@/shared/ui/Sheet/Sheet.module.css";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

// Shell dari-bawah generik. "Biasa" dan "berat" (aksi permanen) memakai
// wadah yang sama persis di DS dan LS — bedanya cuma isi (children), bukan
// bentuk sheet-nya. Gestur tahan-untuk-hapus dan focus trap penuh menyusul
// di F0-07 waktu disambungkan ke aksi nyata; di sini baru Esc + klik scrim.
export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    sheetRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={sheetRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.grab} aria-hidden="true" />
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}
