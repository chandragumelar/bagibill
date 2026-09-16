import type { ReactNode } from "react";
import formStyles from "./AddExpenseScreen.module.css";
import styles from "./ParticipantControlRow.module.css";

export interface ParticipantControlRowProps {
  readonly leading: ReactNode;
  readonly name: string;
  /** Konten tambahan di bawah nama (badge, catatan, DeviationBar) — ikut lebar kolom nama, bukan trailing. */
  readonly secondary?: ReactNode;
  readonly trailing: ReactNode;
}

// Dipakai khusus untuk baris peserta yang checked di mode Nominal, Persen,
// Porsi, dan Selisih — bukan ListRow (shell generik dipakai juga di
// transaksi/saldo/member/klaim, lihat ListRow.tsx). Baris payer dan baris
// unchecked/excluded tetap pakai ListRow seperti biasa karena trailing-nya
// cuma teks polos, nol risiko tabrakan.
export function ParticipantControlRow({ leading, name, secondary, trailing }: ParticipantControlRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.leading}>{leading}</span>
      <div className={styles.content}>
        <span className={formStyles.memberName}>{name}</span>
        {secondary}
      </div>
      <div className={styles.trailing}>{trailing}</div>
    </div>
  );
}
