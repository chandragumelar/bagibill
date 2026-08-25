import { t } from "@/lib/i18n";
import { BottomBar } from "@/app/layout/BottomBar/BottomBar";
import { Screen } from "@/app/layout/Screen/Screen";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { navigate } from "@/routes/router";
import { Button } from "@/shared/ui";
import { InlineFailure } from "@/shared/system";
import { MemberDraftSection } from "./MemberDraftSection";
import { TemplateGrid } from "./TemplateGrid";
import { NEW_GROUP_CURRENCY, useNewGroupForm } from "./use-new-group-form";
import styles from "./NewGroupScreen.module.css";

function templateSummaryLabel(template: ReturnType<typeof useNewGroupForm>["template"]): string {
  return template === undefined ? t("newGroup.footerTemplateNone") : t(`newGroup.template.${template}`);
}

export function NewGroupScreen() {
  const form = useNewGroupForm();

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
          <div className={styles.footer}>
            <div>
              <p className={styles.footerCount}>{t("newGroup.footerSummary", { count: form.members.length })}</p>
              <p className={styles.footerMeta}>
                {templateSummaryLabel(form.template)} · {NEW_GROUP_CURRENCY}
              </p>
            </div>
          </div>
          <Button onClick={() => void form.submit()} disabled={!form.canSubmit || form.submitting}>
            {t("newGroup.submitButton")}
          </Button>
        </BottomBar>
      }
    >
      <input
        type="text"
        className={styles.nameInput}
        value={form.name}
        onChange={(event) => form.setName(event.target.value)}
        placeholder={t("newGroup.nameLabel")}
        aria-label={t("newGroup.nameLabel")}
      />
      <p className={styles.currencyPill}>
        {NEW_GROUP_CURRENCY} · {t("newGroup.currencyName")}
      </p>

      <TemplateGrid selected={form.template} onSelect={form.setTemplate} />
      <MemberDraftSection members={form.members} composer={form.composer} onRemove={form.removeMember} />

      {form.submitError ? (
        <InlineFailure message={t("common.saveFailed")} retryLabel={t("system.retry")} onRetry={() => void form.submit()} />
      ) : null}
    </Screen>
  );
}
