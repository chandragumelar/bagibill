import type { ChangeEvent } from "react";
import { useId } from "react";
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

export function MoneyInput({ label, prefix, amountMinor, onChange, placeholder = "0" }: MoneyInputProps) {
  const inputId = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(parseDigitsToMinor(event.target.value));
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
        type="text"
        inputMode="numeric"
        className={styles.field}
        value={amountMinor === 0 ? "" : String(amountMinor)}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}
