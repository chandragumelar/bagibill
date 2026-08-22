import { useState } from "react";
import { formatMoney, t } from "@/lib/i18n";
import { systemClock } from "@/lib/storage/clock";
import { BottomBar } from "@/app/layout/BottomBar/BottomBar";
import { GroupHeader, type GroupHeaderPosition } from "@/app/layout/GroupHeader/GroupHeader";
import { Screen } from "@/app/layout/Screen/Screen";
import { TabBar, type Tab } from "@/app/layout/TabBar/TabBar";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { navigate, useRouteParams } from "@/routes/router";
import { Button } from "@/shared/ui/Button/Button";
import { LoadFailure } from "@/shared/system";
import { BalanceTab, useGroupBalance, type GroupBalanceState } from "@/features/settle";
import { FilterBar } from "./FilterBar";
import { useGroupDetail, type FilterMemberOption, type GroupDetailState, type TransactionListItem } from "./use-group-detail";
import { useTransactionFilter, type UseTransactionFilterResult } from "./use-transaction-filter";
import { TransactionList } from "./TransactionList";
import styles from "./GroupDetailScreen.module.css";

type TabId = "transactions" | "balance" | "summary";

const EMPTY_ITEMS: readonly TransactionListItem[] = [];
const EMPTY_MEMBERS: readonly FilterMemberOption[] = [];

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

interface GroupDetailBodyProps {
  readonly slug: string;
  readonly state: Exclude<GroupDetailState, { status: "not-found" }>;
  readonly activeTab: TabId;
  readonly transactionFilter: UseTransactionFilterResult<TransactionListItem>;
  readonly members: readonly FilterMemberOption[];
  readonly balance: GroupBalanceState;
  readonly highlightSignal: number;
}

// Data lokal (IndexedDB) tidak pernah dapat spinner (F0-07) — keadaan
// "loading" cuma berarti belum ada apapun buat dirender, bukan skeleton.
function GroupDetailBody({ slug, state, activeTab, transactionFilter, members, balance, highlightSignal }: GroupDetailBodyProps) {
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
  if (activeTab === "balance") {
    return <BalanceTab balance={balance} highlightSignal={highlightSignal} onAddExpense={() => navigate(`/g/${slug}/add`)} />;
  }
  return (
    <>
      <FilterBar
        filter={transactionFilter.filter}
        isActive={transactionFilter.isActive}
        members={members}
        onSearchTextChange={transactionFilter.setSearchText}
        onMemberIdsChange={transactionFilter.setMemberIds}
        onDateRangeChange={transactionFilter.setDateRange}
        onClear={transactionFilter.clear}
      />
      <TransactionList
        items={transactionFilter.filteredItems}
        currency={state.currency}
        nowMs={systemClock.now()}
        onAddExpense={() => navigate(`/g/${slug}/add`)}
        isFiltered={transactionFilter.isActive}
        onClearFilter={transactionFilter.clear}
      />
    </>
  );
}

function positionSign(netMinor: number): GroupHeaderPosition["sign"] {
  if (netMinor > 0) return "pos";
  if (netMinor < 0) return "neg";
  return "zero";
}

function positionSub(netMinor: number, directInboundCount: number, directOutboundCount: number): string {
  if (netMinor === 0) return t("common.allSettled");
  if (netMinor > 0) return t("group.position.creditSub", { count: directInboundCount });
  return t("group.position.debtSub", { count: directOutboundCount });
}

// The header's "posisi kamu" card is the one and only place this number is
// summarized (README's design decision) — the balance tab never repeats it,
// it only points back here. Tapping the card while that tab is open flashes
// the matching row instead of opening a second summary.
function buildHeaderPosition(
  balance: GroupBalanceState,
  currency: string,
  isBalanceTab: boolean,
  onTapWhileOnBalanceTab: () => void,
): GroupHeaderPosition {
  if (balance.status !== "ready") {
    return { amount: formatMoney(0, currency), sign: "zero", sub: t("group.position.empty"), highlighted: isBalanceTab };
  }
  const { netMinor, directInboundCount, directOutboundCount } = balance.position;
  return {
    amount: formatMoney(netMinor, currency),
    sign: positionSign(netMinor),
    sub: positionSub(netMinor, directInboundCount, directOutboundCount),
    highlighted: isBalanceTab,
    onClick: isBalanceTab ? onTapWhileOnBalanceTab : undefined,
  };
}

export function GroupDetailScreen() {
  const { slug = "" } = useRouteParams();
  const [activeTab, setActiveTab] = useState<TabId>("transactions");
  const [highlightSignal, setHighlightSignal] = useState(0);
  const state = useGroupDetail(slug);
  const balance = useGroupBalance(slug);
  const items = state.status === "ready" ? state.items : EMPTY_ITEMS;
  const members = state.status === "ready" ? state.members : EMPTY_MEMBERS;
  const transactionFilter = useTransactionFilter(items);

  if (state.status === "not-found") return <NotFoundScreen />;

  const title = state.status === "ready" ? state.group.name : t("group.detail.titleFallback", { slug });
  const positionCurrency = state.status === "ready" ? state.currency : "IDR";
  const position = buildHeaderPosition(balance, positionCurrency, activeTab === "balance", () =>
    setHighlightSignal((token) => token + 1),
  );

  return (
    <Screen
      header={
        <GroupHeader title={title} onBack={() => navigate("/app")} onMenu={() => navigate(`/g/${slug}/members`)} position={position}>
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
      <GroupDetailBody
        slug={slug}
        state={state}
        activeTab={activeTab}
        transactionFilter={transactionFilter}
        members={members}
        balance={balance}
        highlightSignal={highlightSignal}
      />
    </Screen>
  );
}
