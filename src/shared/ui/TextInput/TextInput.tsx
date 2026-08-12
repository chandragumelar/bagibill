import type { ChangeEvent } from "react";
import { useId } from "react";
import styles from "@/shared/ui/TextInput/TextInput.module.css";

export interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  warning?: string;
}

export function TextInput({ label, value, onChange, placeholder, warning }: TextInputProps) {
  const inputId = useId();
  const warningId = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <div className={styles.wrap}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        className={styles.field}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-describedby={warning ? warningId : undefined}
      />
      {warning ? (
        <p id={warningId} className={styles.warning} role="alert">
          {warning}
        </p>
      ) : null}
    </div>
  );
}
