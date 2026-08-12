import { t } from "@/lib/i18n";

// Kerangka F0-06 — cabang bundle terpisah, tidak menarik chunk app utama.
// Isi asli (identitas, klaim berjalan, konfirmasi, ringkasan) F3-08.
export default function ClaimPage() {
  return (
    <main>
      <p>{t("route.placeholder")}</p>
    </main>
  );
}
