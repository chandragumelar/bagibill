import { useLocale } from "@/lib/i18n";
import { DevControls } from "@/routes/dev/DevUiHelpers";
import { AvatarSection } from "@/routes/dev/sections/AvatarSection";
import { ButtonSection } from "@/routes/dev/sections/ButtonSection";
import { DangerSheetSection } from "@/routes/dev/sections/DangerSheetSection";
import { InlineFailureSection } from "@/routes/dev/sections/InlineFailureSection";
import { ListRowSection } from "@/routes/dev/sections/ListRowSection";
import { LoadFailureSection } from "@/routes/dev/sections/LoadFailureSection";
import { LockedActionSection } from "@/routes/dev/sections/LockedActionSection";
import { MoneyInputSection } from "@/routes/dev/sections/MoneyInputSection";
import { NetBandSection } from "@/routes/dev/sections/NetBandSection";
import { SheetSection } from "@/routes/dev/sections/SheetSection";
import { TextInputSection } from "@/routes/dev/sections/TextInputSection";
import { ToastSection } from "@/routes/dev/sections/ToastSection";
import { UndoSection } from "@/routes/dev/sections/UndoSection";
import styles from "@/routes/dev/ui.module.css";

// Halaman debug utama sepanjang proyek (CLAUDE.md), bukan pajangan sekali
// pakai. Menampilkan seluruh keadaan yang dicatat F0-02 untuk komponen
// dasar F0-05 dan lapisan sistem F0-07, dua tema, dua bahasa. Dirender
// langsung dari App.tsx sampai F0-06 memasang routing sungguhan.
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
        <UndoSection />
        <DangerSheetSection />
        <LockedActionSection />
        <NetBandSection />
        <InlineFailureSection />
        <LoadFailureSection />
      </div>
    </main>
  );
}
