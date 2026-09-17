import type { ReactNode } from "react";
import formStyles from "./AddExpenseScreen.module.css";
import styles from "./ParticipantControlRow.module.css";

export interface ParticipantControlRowProps {
  readonly leading: ReactNode;
  readonly name: string;
  /** Konten tambahan di bawah nama (badge, catatan, DeviationBar) — ikut lebar kolom nama, bukan trailing. */
  readonly secondary?: ReactNode;
  readonly trailing: ReactNode;
  readonly checked?: boolean;
  readonly onToggle?: () => void;
  readonly toggleLabel?: string;
}

// Dipakai khusus untuk baris peserta yang checked di mode Nominal, Persen,
// Porsi, dan Selisih — bukan ListRow (shell generik dipakai juga di
// transaksi/saldo/member/klaim, lihat ListRow.tsx). Input kontrol tetap
// terpisah dari checkbox supaya HTML valid dan tap tidak mengubah nominal.
export function ParticipantControlRow({
  leading,
  name,
  secondary,
  trailing,
  checked = true,
  onToggle = () => undefined,
  toggleLabel = name,
}: ParticipantControlRowProps) {
  return (
    <div className={styles.row}>
      <label className={styles.toggle}>
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label={toggleLabel} />
      </label>
      <span className={styles.leading}>{leading}</span>
      <div className={styles.content}>
        <span className={formStyles.memberName}>{name}</span>
        {secondary}
      </div>
      <div className={styles.trailing}>{trailing}</div>
    </div>
  );
}
