import { t } from "@/lib/i18n";
import { LoadFailure } from "@/shared/system/failure/LoadFailure";
import { Skeleton } from "@/shared/system/skeleton/Skeleton";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function LoadFailureSection() {
  return (
    <Section title="LoadFailure + Skeleton">
      <StateCard label="sedang memuat">
        <Skeleton variant="card" />
        <Skeleton variant="line" width="60%" />
        <Skeleton variant="line" width="90%" />
      </StateCard>
      <StateCard label="gagal muat">
        <LoadFailure
          heading={t("devui.sample.loadFailureHeading")}
          message={t("devui.sample.loadFailureMessage")}
          retryLabel={t("system.retry")}
          onRetry={() => undefined}
        />
      </StateCard>
    </Section>
  );
}
