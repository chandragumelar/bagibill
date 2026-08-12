import { t } from "@/lib/i18n";
import { Toast } from "@/shared/ui/Toast/Toast";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function ToastSection() {
  return (
    <Section title="Toast">
      <StateCard label="aktif">
        <Toast
          message={t("devui.sample.toastMessage")}
          subMessage={t("devui.sample.toastSub")}
          secondsRemaining={6}
          secondsTotal={6}
          onUndo={() => undefined}
        />
      </StateCard>
      <StateCard label="hampir habis">
        <Toast
          message={t("devui.sample.toastMessage")}
          subMessage={t("devui.sample.toastSub")}
          secondsRemaining={2}
          secondsTotal={6}
          onUndo={() => undefined}
        />
      </StateCard>
      <StateCard label="bertumpuk dua">
        <Toast
          message={t("devui.sample.toastStackedMessage")}
          subMessage={t("devui.sample.toastStackedSub")}
          secondsRemaining={6}
          secondsTotal={6}
          count={2}
          onUndo={() => undefined}
          onUndoAll={() => undefined}
        />
      </StateCard>
    </Section>
  );
}
