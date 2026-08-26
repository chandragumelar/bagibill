import { t } from "@/lib/i18n";
import { Screen } from "@/app/layout/Screen/Screen";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { navigate, useRouteParams } from "@/routes/router";
import { Button, Sheet, Toast } from "@/shared/ui";
import { DangerSheet, LoadFailure, LockedActionExplain } from "@/shared/system";
import { useGroupMembers } from "./use-group-members";
import { useMemberActions } from "./use-member-actions";
import { MemberManageRow } from "./MemberManageRow";
import { MemberEditPanel } from "./MemberEditPanel";
import { SimilarNameWarning } from "./SimilarNameWarning";
import styles from "./GroupMembersScreen.module.css";

function NotFoundBody() {
  return (
    <div className={styles.notFound}>
      <p>{t("group.notFound.body")}</p>
      <Button onClick={() => navigate("/app")}>{t("route.title.home")}</Button>
    </div>
  );
}

export function GroupMembersScreen() {
  const { slug = "" } = useRouteParams();
  const state = useGroupMembers(slug);
  const rows = state.status === "ready" ? state.rows : [];
  const reload = state.status === "ready" ? state.reload : () => {};
  const actions = useMemberActions(slug, rows, reload);

  function leaveScreen(): void {
    actions.toast.commitAll();
    navigate(state.status === "ready" ? `/g/${slug}` : "/app");
  }

  const groupName = state.status === "ready" ? state.group.name : "";
  const lastToastItem = actions.toast.items[actions.toast.items.length - 1];

  return (
    <Screen
      header={
        <div className={styles.header}>
          <Topbar
            title={t("member.screenTitle")}
            leading={<TopbarButton label={t("nav.back")} icon="‹" onClick={leaveScreen} />}
            trailing={<TopbarButton label={t("member.doneButton")} onClick={leaveScreen} />}
          />
          {groupName === "" ? null : <p className={styles.groupName}>{groupName}</p>}
        </div>
      }
    >
      {state.status === "not-found" ? <NotFoundBody /> : null}
      {state.status === "error" ? (
        <LoadFailure
          heading={t("group.error.loadHeading")}
          message={t("group.error.loadMessage")}
          retryLabel={t("system.retry")}
          onRetry={state.retry}
        />
      ) : null}
      {state.status === "ready" ? (
        <>
          <p className={styles.hint}>{t("member.hint.joinDate")}</p>

          <div className={styles.composerRow}>
            <input
              type="text"
              className={styles.input}
              value={actions.addComposer.nameInput}
              onChange={(event) => actions.addComposer.setNameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") actions.addComposer.submit();
              }}
              placeholder={t("member.addInputPlaceholder")}
              aria-label={t("member.addInputPlaceholder")}
            />
            <button
              type="button"
              className={styles.addButton}
              onClick={actions.addComposer.submit}
              disabled={actions.addComposer.nameInput.trim() === "" || actions.addComposer.similarMatches.length > 0}
            >
              {t("member.addButton")}
            </button>
          </div>
          {actions.addComposer.similarMatches.length > 0 ? (
            <SimilarNameWarning
              matchedName={actions.addComposer.similarMatches[0] ?? ""}
              suggestedName={actions.addComposer.suggestedName}
              onKeepAdding={actions.addComposer.keepAddingAnyway}
              onAddSuggested={actions.addComposer.addAsSuggested}
            />
          ) : null}
          {actions.addError ? (
            <p className={styles.addErrorText} role="alert">
              {t("common.saveFailed")}
            </p>
          ) : null}

          <div className={styles.list}>
            {rows.map((row) =>
              actions.editingMemberId === row.memberId ? (
                <MemberEditPanel
                  key={row.memberId}
                  row={row}
                  saveError={actions.saveError}
                  onCancel={actions.cancelEdit}
                  onSave={(name, active) => actions.saveEdit(row.memberId, name, active)}
                  onRequestDelete={(name, count) => actions.requestDelete(row.memberId, name, count)}
                />
              ) : (
                <MemberManageRow key={row.memberId} row={row} onStartEdit={() => actions.startEdit(row.memberId)} />
              ),
            )}
          </div>
        </>
      ) : null}

      <Sheet open={actions.lockedTarget !== undefined} onClose={actions.closeLocked} title={t("member.locked.title")}>
        {actions.lockedTarget === undefined ? null : (
          <>
            <LockedActionExplain
              name={actions.lockedTarget.name}
              transactionCount={actions.lockedTarget.transactionCount}
              onDeactivate={() => void actions.confirmDeactivateFromLocked()}
            />
            <Button variant="secondary" onClick={actions.closeLocked}>
              {t("member.cancelButton")}
            </Button>
          </>
        )}
      </Sheet>

      {actions.dangerTarget === undefined ? null : (
        <DangerSheet
          open
          onClose={actions.closeDanger}
          title={t("member.danger.title", { name: actions.dangerTarget.name })}
          subtitle={t("member.danger.subtitle")}
          badgeLabel={t("member.danger.badge")}
          losingItems={<li>{t("member.danger.losingItem")}</li>}
          irreversibleNote={t("member.danger.irreversible", { name: actions.dangerTarget.name })}
          holdLabel={t("member.danger.hold")}
          completingLabel={t("member.danger.completing", { name: actions.dangerTarget.name })}
          hint={actions.deleteError ? t("member.danger.error") : t("member.danger.hint")}
          cancelLabel={t("member.cancelButton")}
          onConfirm={() => void actions.confirmDelete()}
        />
      )}

      {lastToastItem ? (
        <Toast
          message={lastToastItem.message}
          secondsRemaining={actions.toast.remainingSeconds}
          secondsTotal={actions.toast.totalSeconds}
          count={actions.toast.items.length}
          onUndo={actions.toast.undoLast}
        />
      ) : null}
    </Screen>
  );
}
