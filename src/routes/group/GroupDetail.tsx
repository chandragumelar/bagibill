import { useState } from "react";
import { t } from "@/lib/i18n";
import { BottomBar } from "@/app/layout/BottomBar/BottomBar";
import { GroupHeader } from "@/app/layout/GroupHeader/GroupHeader";
import { Screen } from "@/app/layout/Screen/Screen";
import { TabBar, type Tab } from "@/app/layout/TabBar/TabBar";
import { navigate, useRouteParams } from "@/routes/router";
import { Button } from "@/shared/ui/Button/Button";

type TabId = "transactions" | "balance" | "summary";

// Kerangka F0-06 — tab Transaksi F3-05, tab Saldo F3-07, tab Ringkasan fase 2.
// Posisi kamu belum bisa dihitung (F1/F2 belum ada), jadi tampil keadaan nol
// yang jujur, bukan angka karangan.
export default function GroupDetail() {
  const { slug = "" } = useRouteParams();
  const [activeTab, setActiveTab] = useState<TabId>("transactions");

  const tabs: Tab[] = [
    { id: "transactions", label: t("group.tab.transactions") },
    { id: "balance", label: t("group.tab.balance") },
    { id: "summary", label: t("group.tab.summary"), disabled: true },
  ];

  return (
    <Screen
      header={
        <GroupHeader
          title={t("group.detail.titleFallback", { slug })}
          onBack={() => navigate("/app")}
          onMenu={() => navigate(`/g/${slug}/members`)}
          position={{ amount: "Rp 0", sign: "zero", sub: t("group.position.empty"), highlighted: activeTab === "balance" }}
        >
          <TabBar tabs={tabs} activeId={activeTab} onSelect={(id) => setActiveTab(id as TabId)} />
        </GroupHeader>
      }
      bottomBar={
        <BottomBar>
          <Button onClick={() => navigate(`/g/${slug}/add`)}>{t("route.title.addExpense")}</Button>
        </BottomBar>
      }
    >
      <p>{t("route.placeholder")}</p>
    </Screen>
  );
}
