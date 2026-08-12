import { t } from "@/lib/i18n";
import { BottomBar } from "@/app/layout/BottomBar/BottomBar";
import { Screen } from "@/app/layout/Screen/Screen";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { navigate } from "@/routes/router";
import { Button } from "@/shared/ui/Button/Button";

// Kerangka F0-06 — isi asli (template, mata uang, tambah member) F3-09.
export default function NewGroup() {
  return (
    <Screen
      header={
        <Topbar
          title={t("route.title.newGroup")}
          leading={<TopbarButton label={t("nav.back")} tone="ghost" onClick={() => navigate("/app")} />}
        />
      }
      bottomBar={
        <BottomBar>
          <Button disabled>{t("route.title.newGroup")}</Button>
        </BottomBar>
      }
    >
      <p>{t("route.placeholder")}</p>
    </Screen>
  );
}
