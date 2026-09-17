import { t } from "@/lib/i18n";
import { Screen } from "@/app/layout/Screen/Screen";
import { Topbar } from "@/app/layout/Topbar/Topbar";
import { navigate } from "@/routes/router";
import { LoadFailure, PlusIcon } from "@/shared/system";
import { EmptyGroups } from "./EmptyGroups";
import { GroupCard } from "./GroupCard";
import { useHomeGroups, type HomeGroupsState, type HomeGroupViewModel } from "./use-home-groups";
import styles from "./HomeScreen.module.css";

function goToNewGroup(): void {
  navigate("/app/new");
}

interface GroupListProps {
  readonly groups: readonly HomeGroupViewModel[];
}

function GroupList({ groups }: GroupListProps) {
  return (
    <div className={styles.groups}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{t("home.section.groupsTitle")}</h2>
        <button type="button" className={styles.addLink} onClick={goToNewGroup}>
          <PlusIcon />
          {t("home.section.addGroup")}
        </button>
      </div>
      {groups.map((group) => (
        <GroupCard key={group.slug} group={group} onOpen={() => navigate(`/g/${group.slug}`)} />
      ))}
    </div>
  );
}

interface HomeBodyProps {
  readonly state: HomeGroupsState;
}

// Data lokal (IndexedDB) tidak pernah dapat spinner (F0-07) — "loading"
// cuma berarti belum ada apapun buat dirender, sama seperti GroupDetailBody.
function HomeBody({ state }: HomeBodyProps) {
  if (state.status === "loading") return null;
  if (state.status === "error") {
    return (
      <LoadFailure
        heading={t("home.error.loadHeading")}
        message={t("home.error.loadMessage")}
        retryLabel={t("system.retry")}
        onRetry={state.retry}
      />
    );
  }
  if (state.groups.length === 0) return <EmptyGroups onCreate={goToNewGroup} />;
  return <GroupList groups={state.groups} />;
}

export function HomeScreen() {
  const state = useHomeGroups();

  return (
    <Screen header={<Topbar title={t("route.title.home")} />}>
      <HomeBody state={state} />
    </Screen>
  );
}
