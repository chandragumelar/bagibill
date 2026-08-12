import { t } from "@/lib/i18n";
import { Button } from "@/shared/ui/Button/Button";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function ButtonSection() {
  return (
    <Section title="Button">
      <StateCard label="primary">
        <Button variant="primary">{t("devui.sample.buttonPrimary")}</Button>
      </StateCard>
      <StateCard label="primary disabled">
        <Button variant="primary" disabled>
          {t("devui.sample.buttonPrimary")}
        </Button>
      </StateCard>
      <StateCard label="secondary">
        <Button variant="secondary">{t("devui.sample.buttonSecondary")}</Button>
      </StateCard>
      <StateCard label="ghost">
        <Button variant="ghost">{t("devui.sample.buttonGhost")}</Button>
      </StateCard>
    </Section>
  );
}
