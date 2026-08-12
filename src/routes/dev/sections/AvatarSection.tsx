import { t } from "@/lib/i18n";
import { Avatar } from "@/shared/ui/Avatar/Avatar";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function AvatarSection() {
  return (
    <Section title="Avatar">
      <StateCard label="normal">
        <Avatar initials="DP" color="var(--m-8)" name={t("devui.sample.name")} />
      </StateCard>
      <StateCard label="kecil">
        <Avatar initials="DP" color="var(--m-8)" size="small" name={t("devui.sample.name")} />
      </StateCard>
      <StateCard label="nonaktif">
        <Avatar initials="DP" color="var(--m-8)" active={false} name={t("devui.sample.name")} />
      </StateCard>
      <StateCard label="pengulangan warna ke-13">
        <Avatar initials="A" color="var(--m-1)" colorRepeated name="Ayu" />
      </StateCard>
    </Section>
  );
}
