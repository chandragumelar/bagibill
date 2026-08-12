import type { ReactNode } from "react";
import styles from "@/shared/ui/ListRow/ListRow.module.css";

export interface ListRowProps {
  leading: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}

// Shell generik 3-kolom: leading | content | trailing. Pola grid yang sama
// dipakai baris transaksi (DT), baris saldo (DS), baris member (BG), dan
// baris item klaim (KI) — komponen-komponen spesifik itu dibangun di atas
// shell ini di masing-masing tugas F3, bukan di sini.
export function ListRow({ leading, children, trailing, onClick }: ListRowProps) {
  const content = (
    <>
      <span className={styles.leading}>{leading}</span>
      <span className={styles.content}>{children}</span>
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={styles.row} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={styles.row}>{content}</div>;
}
