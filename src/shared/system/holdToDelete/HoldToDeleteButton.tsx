import type { KeyboardEvent, PointerEvent } from "react";
import { useRef, useState } from "react";
import { TrashIcon } from "@/shared/system/icons";
import styles from "@/shared/system/holdToDelete/HoldToDeleteButton.module.css";

// Setelah --dur-hold kelar, label ganti dan fill dikunci penuh sebentar
// sebelum onComplete beneran dipanggil — jeda ini biar orang lihat hasilnya
// kepencet, bukan langsung lompat ke layar berikutnya. Sumber: bindHold()
// Lapisan_Sistem.html (setTimeout 650 setelah --dur-hold).
const COMPLETION_DISPLAY_MS = 650;

export interface HoldToDeleteButtonProps {
  label: string;
  completingLabel: string;
  onComplete: () => void;
}

// Aksi permanen tidak boleh terpicu gerakan tak sengaja — gestur tekan-tahan
// dipilih justru karena hampir mustahil kepencet sendirian.
export function HoldToDeleteButton({ label, completingLabel, onComplete }: HoldToDeleteButtonProps) {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start(): void {
    if (done) return;
    setHolding(true);
    const holdMs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-hold")) || 1100;
    timeoutRef.current = setTimeout(() => {
      setDone(true);
      setHolding(false);
      setTimeout(onComplete, COMPLETION_DISPLAY_MS);
    }, holdMs);
  }

  function cancel(): void {
    if (done) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHolding(false);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
    // Opsional: jsdom (test) dan browser lawas tak punya Pointer Events
    // capture API. Tanpa ini gestur tetap jalan, cuma nggak kekunci ke
    // elemen kalau jari geser keluar batas tombol.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    start();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.repeat) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      start();
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === " " || event.key === "Enter") cancel();
  }

  const className = holding ? `${styles.button} ${styles.holding}` : styles.button;

  return (
    <button
      type="button"
      className={className}
      onPointerDown={handlePointerDown}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <span className={styles.fill} aria-hidden="true" />
      <TrashIcon />
      <span className={styles.label}>{done ? completingLabel : label}</span>
    </button>
  );
}
