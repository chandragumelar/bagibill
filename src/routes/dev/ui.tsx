import { useLocale } from "@/lib/i18n";
import { DevControls } from "@/routes/dev/DevUiHelpers";
import { AvatarSection } from "@/routes/dev/sections/AvatarSection";
import { ButtonSection } from "@/routes/dev/sections/ButtonSection";
import { ListRowSection } from "@/routes/dev/sections/ListRowSection";
import { MoneyInputSection } from "@/routes/dev/sections/MoneyInputSection";
import { SheetSection } from "@/routes/dev/sections/SheetSection";
import { TextInputSection } from "@/routes/dev/sections/TextInputSection";
import { ToastSection } from "@/routes/dev/sections/ToastSection";
import styles from "@/routes/dev/ui.module.css";

// Halaman debug utama sepanjang proyek (CLAUDE.md), bukan pajangan sekali
// pakai. Menampilkan seluruh keadaan yang dicatat F0-02 untuk 7 komponen
// dasar F0-05, dua tema, dua bahasa. Dirender langsung dari App.tsx sampai
// F0-06 memasang routing sungguhan.
export function DevUiPage() {
  // t() sendiri tidak reaktif — cuma komponen yang panggil useLocale() yang
  // di-render ulang waktu bahasa ganti (useSyncExternalStore). Section di
  // bawah cuma panggil t() polos, jadi halaman ini yang subscribe lalu
  // key={locale} me-remount seluruhnya. F0-06 (routing) perlu pola yang
  // sama di root layout supaya ganti bahasa di layar manapun ikut kebaca,
  // bukan cuma di halaman yang kebetulan ikut panggil useLocale().
  const { locale } = useLocale();

  return (
    <main className={styles.page}>
      <DevControls />
      <div key={locale} className={styles.sections}>
        <ButtonSection />
        <TextInputSection />
        <MoneyInputSection />
        <SheetSection />
        <ToastSection />
        <AvatarSection />
        <ListRowSection />
      </div>
    </main>
  );
}
