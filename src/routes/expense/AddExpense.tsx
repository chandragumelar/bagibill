import { t } from "@/lib/i18n";
import { BottomBar } from "@/app/layout/BottomBar/BottomBar";
import { Screen } from "@/app/layout/Screen/Screen";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { navigate, useRouteParams } from "@/routes/router";
import { Button } from "@/shared/ui/Button/Button";

// Kerangka F0-06 — isi asli (mode split, biaya tambahan, preview) F3-01..04.
export default function AddExpense() {
  const { slug = "" } = useRouteParams();

  return (
    <Screen
      header={
        <Topbar
          title={t("route.title.addExpense")}
          leading={<TopbarButton label={t("nav.back")} tone="ghost" onClick={() => navigate(`/g/${slug}`)} />}
        />
      }
      bottomBar={
        <BottomBar>
          <Button disabled>{t("route.title.addExpense")}</Button>
        </BottomBar>
      }
    >
      <p>{t("route.placeholder")}</p>
    </Screen>
  );
}
