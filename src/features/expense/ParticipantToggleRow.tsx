import type { ReactNode } from "react";
import styles from "./ParticipantToggleRow.module.css";

export interface ParticipantToggleRowProps {
  readonly name: string;
  readonly leading: ReactNode;
  readonly checked: boolean;
  readonly onToggle: () => void;
  readonly trailing?: ReactNode;
  readonly secondary?: ReactNode;
  readonly toggleLabel: string;
}

export function ParticipantToggleRow({
  name,
  leading,
  checked,
  onToggle,
  trailing,
  secondary,
  toggleLabel,
}: ParticipantToggleRowProps) {
  return (
    <div className={`${styles.row} ${checked ? "" : styles.excluded}`}>
      <label className={styles.toggle}>
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label={toggleLabel} />
      </label>
      <span className={styles.leading}>{leading}</span>
      <div className={styles.content}>
        <span className={styles.name}>{name}</span>
        {secondary}
      </div>
      {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
    </div>
  );
}
