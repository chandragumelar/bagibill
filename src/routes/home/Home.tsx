import { t } from "@/lib/i18n";
import { Screen } from "@/app/layout/Screen/Screen";
import { Topbar } from "@/app/layout/Topbar/Topbar";

// Kerangka F0-06 — isi asli (daftar grup, Quick Split, empty state) F3-10.
export default function Home() {
  return (
    <Screen header={<Topbar title={t("route.title.home")} />}>
      <p>{t("route.placeholder")}</p>
    </Screen>
  );
}
