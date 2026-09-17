import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "@/shared/ui/Button/Button";
import { Sheet } from "@/shared/ui/Sheet/Sheet";
import { useFocusTrap } from "@/shared/system/focusTrap/useFocusTrap";
import { HoldToDeleteButton } from "@/shared/system/holdToDelete/HoldToDeleteButton";
import { WarnIcon } from "@/shared/system/icons";
import styles from "@/shared/system/dangerSheet/DangerSheet.module.css";

const INITIAL_FOCUS_DELAY_MS = 80;

export interface DangerSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  badgeLabel: string;
  /** Daftar "yang hilang" — data spesifik entitas, disuplai pemanggil (mis. jumlah transaksi). */
  losingItems: ReactNode;
  irreversibleNote: string;
  holdLabel: string;
  completingLabel: string;
  hint: string;
  cancelLabel: string;
  onConfirm: () => void;
}

// Anak "permanen" dari tangga bahaya (F0-06's plan.md): sheet berat plus
// tahan-untuk-hapus. Fokus terjebak Tab-cycling beneran (useFocusTrap),
// bukan cuma fokus awal + Esc bawaan Sheet — itu cukup untuk sheet biasa,
// tapi aksi permanen butuh lebih.
export function DangerSheet({
  open,
  onClose,
  title,
  subtitle,
  badgeLabel,
  losingItems,
  irreversibleNote,
  holdLabel,
  completingLabel,
  hint,
  cancelLabel,
  onConfirm,
}: DangerSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  useFocusTrap(contentRef, open);

  useEffect(() => {
    if (!open) {
      lastFocusRef.current?.focus();
      return;
    }
    lastFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timeoutId = window.setTimeout(() => cancelRef.current?.focus(), INITIAL_FOCUS_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div ref={contentRef}>
        <span className={styles.badge}>
          <WarnIcon />
          {badgeLabel}
        </span>
        <ul className={styles.losing}>{losingItems}</ul>
        <p className={styles.irreversible}>
          <WarnIcon />
          {irreversibleNote}
        </p>
        <HoldToDeleteButton label={holdLabel} completingLabel={completingLabel} onComplete={onConfirm} />
        <p className={styles.hint}>{hint}</p>
        <Button ref={cancelRef} variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </Sheet>
  );
}
