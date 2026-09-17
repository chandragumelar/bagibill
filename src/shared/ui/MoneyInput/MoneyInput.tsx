import type { ChangeEvent } from "react";
import { useId, useLayoutEffect, useRef } from "react";
import { formatGroupedDigits } from "@/lib/i18n";
import styles from "@/shared/ui/MoneyInput/MoneyInput.module.css";

export interface MoneyInputProps {
  label: string;
  /** Simbol atau kode mata uang, ditampilkan sebagai prefix statis (mis. "Rp"). */
  prefix: string;
  amountMinor: number;
  onChange: (amountMinor: number) => void;
  placeholder?: string;
}

// Input ini bekerja di minor unit: apa yang diketik jadi angka bulat minor
// unit langsung, tanpa titik desimal. Cukup untuk IDR (0 desimal), satu-
// satunya mata uang yang muncul di mockup gelombang 1. Mata uang berdesimal
// (USD dkk) belum punya rujukan desain input-nya — nyusul kalau ada.
function parseDigitsToMinor(raw: string): number {
  const digitsOnly = raw.replace(/\D/g, "");
  return digitsOnly === "" ? 0 : Number(digitsOnly);
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function countDigitsBefore(value: string, index: number): number {
  let count = 0;
  for (let i = 0; i < index && i < value.length; i++) {
    if (isDigit(value[i] ?? "")) count++;
  }
  return count;
}

// Kebalikan dari countDigitsBefore: posisi tepat setelah digit ke-N di
// string yang SUDAH diberi pemisah ribuan — dipakai buat naruh kursor balik
// ke tempat yang benar walau posisi pemisahnya ikut geser (F4-04, mengetik
// di tengah angka yang sudah terisi, bukan cuma nambah di ujung).
function offsetAfterDigitCount(value: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < value.length; i++) {
    if (isDigit(value[i] ?? "")) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return value.length;
}

export function MoneyInput({ label, prefix, amountMinor, onChange, placeholder = "0" }: MoneyInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursorDigitsRef = useRef<number | null>(null);
  const displayValue = amountMinor === 0 ? "" : formatGroupedDigits(amountMinor);

  // Pemisah ribuan menggeser posisi karakter tiap ketik — tanpa ini kursor
  // React taruh di ujung otomatis, bukan di titik yang barusan diketik.
  useLayoutEffect(() => {
    const digitsBeforeCursor = pendingCursorDigitsRef.current;
    if (digitsBeforeCursor === null) return;
    pendingCursorDigitsRef.current = null;
    const input = inputRef.current;
    if (!input) return;
    const position = offsetAfterDigitCount(displayValue, digitsBeforeCursor);
    input.setSelectionRange(position, position);
  }, [displayValue]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { value, selectionStart } = event.target;
    pendingCursorDigitsRef.current = countDigitsBefore(value, selectionStart ?? value.length);
    onChange(parseDigitsToMinor(value));
  }

  return (
    <div className={styles.wrap}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <span className={styles.prefix} aria-hidden="true">
        {prefix}
      </span>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className={styles.field}
        size={Math.max(displayValue.length, placeholder.length, 1)}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}
