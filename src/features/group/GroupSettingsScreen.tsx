import { useEffect, useState } from "react";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { Screen } from "@/app/layout/Screen/Screen";
import { t } from "@/lib/i18n";
import { expenseRepository, groupRepository, memberRepository, settlementRepository } from "@/lib/storage/repositories";
import { ReceiptIcon, TrashIcon, WarnIcon, DangerSheet } from "@/shared/system";
import { navigate, useRouteParams } from "@/routes/router";
import { buildGroupDeleteSummary, type GroupDeleteSummary } from "./group-delete-summary";
import styles from "./GroupSettingsScreen.module.css";

type SettingsState =
  | { readonly status: "loading" }
  | { readonly status: "not-found" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly groupName: string; readonly summary: GroupDeleteSummary };

function losingItems(summary: GroupDeleteSummary) {
  return (
    <>
      <li>
        <ReceiptIcon />
        <span><b>{t("group.delete.expenseCount", { count: summary.expenseCount })}</b> &amp; {t("group.delete.settlementCount", { count: summary.settlementCount })}</span>
      </li>
      <li>
        <WarnIcon />
        <span>{t("group.delete.runningBalance")} <b>{t("group.delete.peopleCount", { count: summary.outstandingMemberCount })}</b></span>
      </li>
      <li>
        <TrashIcon />
        <span>{t("group.delete.attachmentsAndNotes")}</span>
      </li>
    </>
  );
}

export function GroupSettingsScreen() {
  const { slug = "" } = useRouteParams();
  const [state, setState] = useState<SettingsState>({ status: "loading" });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const group = await groupRepository.getGroupBySlug(slug);
        if (cancelled) return;
        if (group === undefined) {
          setState({ status: "not-found" });
          return;
        }
        const [members, expenses, settlements] = await Promise.all([
          memberRepository.listMembers(slug, { includeInactive: true }),
          expenseRepository.listExpensesByGroup(slug),
          settlementRepository.listSettlementsByGroup(slug),
        ]);
        if (cancelled) return;
        setState({
          status: "ready",
          groupName: group.name,
          summary: buildGroupDeleteSummary({ group, members, expenses, settlements }),
        });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function deleteGroup(): Promise<void> {
    try {
      await groupRepository.deleteGroup(slug);
      navigate("/app");
    } catch {
      setDeleteOpen(false);
      setDeleteError(true);
    }
  }

  const groupName = state.status === "ready" ? state.groupName : "";
  const summary = state.status === "ready" ? state.summary : undefined;

  return (
    <Screen
      header={
        <Topbar
          title={t("route.title.groupSettings")}
          leading={<TopbarButton label={t("nav.back")} tone="ghost" onClick={() => navigate(`/g/${slug}`)} />}
        />
      }
    >
      {state.status === "ready" ? (
        <section className={styles.dangerZone} aria-labelledby="group-delete-heading">
          <h2 id="group-delete-heading" className={styles.heading}>{t("group.delete.sectionHeading")}</h2>
          <button type="button" className={styles.deleteButton} onClick={() => setDeleteOpen(true)}>
            <TrashIcon />
            {t("group.delete.openButton")}
          </button>
        </section>
      ) : null}
      {state.status === "not-found" ? <p className={styles.message}>{t("group.notFound.body")}</p> : null}
      {state.status === "error" ? <p className={styles.message} role="alert">{t("group.delete.loadFailed")}</p> : null}
      {deleteError ? <p className={styles.message} role="alert">{t("group.delete.failed")}</p> : null}
      {summary === undefined ? null : (
        <DangerSheet
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title={t("group.delete.title", { name: groupName })}
          subtitle={t("group.delete.subtitle")}
          badgeLabel={t("group.delete.badge")}
          losingItems={losingItems(summary)}
          irreversibleNote={t("group.delete.irreversibleNote")}
          holdLabel={t("group.delete.holdLabel")}
          completingLabel={t("group.delete.completingLabel")}
          hint={t("group.delete.hint")}
          cancelLabel={t("group.delete.cancelLabel")}
          onConfirm={() => void deleteGroup()}
        />
      )}
    </Screen>
  );
}
