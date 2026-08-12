import { t } from "@/lib/i18n";
import { Screen } from "@/app/layout/Screen/Screen";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { navigate, useRouteParams } from "@/routes/router";

// Kerangka F0-06 — isi asli (tambah/ubah/nonaktifkan member) F3-09.
export default function GroupMembers() {
  const { slug = "" } = useRouteParams();

  return (
    <Screen
      header={
        <Topbar
          title={t("route.title.members")}
          leading={<TopbarButton label={t("nav.back")} icon="‹" onClick={() => navigate(`/g/${slug}`)} />}
        />
      }
    >
      <p>{t("route.placeholder")}</p>
    </Screen>
  );
}
