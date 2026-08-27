import { t } from "@/lib/i18n";
import { Button } from "@/shared/ui/Button/Button";
import styles from "./EmptyGroups.module.css";

export interface EmptyGroupsProps {
  readonly onCreate: () => void;
}

// spec.md 18.7: tiga bagian, nol paragraf — ilustrasi kecil, satu kalimat,
// satu tombol aksi utama. Mockup Beranda juga punya hint soal Bagi Cepat di
// sini, dibuang karena fiturnya gelombang 2 (Keputusan, progress.md).
export function EmptyGroups({ onCreate }: EmptyGroupsProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.art} aria-hidden="true">
        🧑‍🤝‍🧑
      </div>
      <h2 className={styles.heading}>{t("home.empty.title")}</h2>
      <p className={styles.body}>{t("home.empty.body")}</p>
      <Button onClick={onCreate}>{t("home.empty.cta")}</Button>
    </div>
  );
}
