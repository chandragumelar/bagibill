import { useState } from "react";
import { t } from "@/lib/i18n";
import { systemClock } from "@/lib/storage/clock";
import { BottomBar } from "@/app/layout/BottomBar/BottomBar";
import { GroupHeader } from "@/app/layout/GroupHeader/GroupHeader";
import { Screen } from "@/app/layout/Screen/Screen";
import { TabBar, type Tab } from "@/app/layout/TabBar/TabBar";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { navigate, useRouteParams } from "@/routes/router";
import { Button } from "@/shared/ui/Button/Button";
import { LoadFailure } from "@/shared/system";
import { useGroupDetail, type GroupDetailState } from "./use-group-detail";
import { TransactionList } from "./TransactionList";
import styles from "./GroupDetailScreen.module.css";

type TabId = "transactions" | "balance" | "summary";

function tabs(): Tab[] {
  return [
    { id: "transactions", label: t("group.tab.transactions") },
    { id: "balance", label: t("group.tab.balance") },
    { id: "summary", label: t("group.tab.summary"), disabled: true },
  ];
}

// "Grup tidak ditemukan" bukan kegagalan teknis, jadi tampilannya beda dari
// gagal memuat (LoadFailure) — Topbar sederhana, bukan GroupHeader dengan
// tab yang tidak punya isi untuk grup yang sebenarnya tidak ada.
function NotFoundScreen() {
  return (
    <Screen
      header={
        <Topbar
          title={t("group.notFound.heading")}
          leading={<TopbarButton label={t("nav.back")} tone="ghost" onClick={() => navigate("/app")} />}
        />
      }
    >
      <div className={styles.notFound}>
        <p className={styles.notFoundBody}>{t("group.notFound.body")}</p>
        <Button onClick={() => navigate("/app")}>{t("route.title.home")}</Button>
      </div>
    </Screen>
  );
}

// Tab Saldo belum berisi (F3-07) — keadaan kosong yang jujur menyebut
// fiturnya belum ada, bukan spinner selamanya dan bukan angka karangan.
function BalanceComingSoon() {
  return (
    <div className={styles.comingSoon}>
      <p className={styles.comingSoonHeading}>{t("group.balance.comingSoonHeading")}</p>
      <p className={styles.comingSoonBody}>{t("route.placeholder")}</p>
    </div>
  );
}

interface GroupDetailBodyProps {
  readonly slug: string;
  readonly state: Exclude<GroupDetailState, { status: "not-found" }>;
  readonly activeTab: TabId;
}

// Data lokal (IndexedDB) tidak pernah dapat spinner (F0-07) — keadaan
// "loading" cuma berarti belum ada apapun buat dirender, bukan skeleton.
function GroupDetailBody({ slug, state, activeTab }: GroupDetailBodyProps) {
  if (state.status === "loading") return null;
  if (state.status === "error") {
    return (
      <LoadFailure
        heading={t("group.error.loadHeading")}
        message={t("group.error.loadMessage")}
        retryLabel={t("system.retry")}
        onRetry={state.retry}
      />
    );
  }
  if (activeTab === "balance") return <BalanceComingSoon />;
  return (
    <TransactionList
      items={state.items}
      currency={state.currency}
      nowMs={systemClock.now()}
      onAddExpense={() => navigate(`/g/${slug}/add`)}
    />
  );
}

export function GroupDetailScreen() {
  const { slug = "" } = useRouteParams();
  const [activeTab, setActiveTab] = useState<TabId>("transactions");
  const state = useGroupDetail(slug);

  if (state.status === "not-found") return <NotFoundScreen />;

  const title = state.status === "ready" ? state.group.name : t("group.detail.titleFallback", { slug });

  return (
    <Screen
      header={
        <GroupHeader
          title={title}
          onBack={() => navigate("/app")}
          onMenu={() => navigate(`/g/${slug}/members`)}
          position={{ amount: "Rp 0", sign: "zero", sub: t("group.position.empty"), highlighted: activeTab === "balance" }}
        >
          <TabBar tabs={tabs()} activeId={activeTab} onSelect={(id) => setActiveTab(id as TabId)} />
        </GroupHeader>
      }
      bottomBar={
        state.status === "ready" ? (
          <BottomBar>
            <Button onClick={() => navigate(`/g/${slug}/add`)}>{t("route.title.addExpense")}</Button>
          </BottomBar>
        ) : undefined
      }
    >
      <GroupDetailBody slug={slug} state={state} activeTab={activeTab} />
    </Screen>
  );
}
