import { t } from "@/lib/i18n";
import { InlineFailure } from "@/shared/system/failure/InlineFailure";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function InlineFailureSection() {
  return (
    <Section title="InlineFailure">
      <StateCard label="simpan gagal (boxed)">
        <InlineFailure message={t("devui.sample.inlineFailureSave")} retryLabel={t("system.retry")} onRetry={() => undefined} />
      </StateCard>
      <StateCard label="baris gagal (attached)">
        <InlineFailure
          message={t("devui.sample.inlineFailureRow")}
          retryLabel={t("system.retry")}
          onRetry={() => undefined}
          variant="attached"
        />
      </StateCard>
    </Section>
  );
}
