import { t } from "@/lib/i18n";
import { Avatar } from "@/shared/ui/Avatar/Avatar";
import { ListRow } from "@/shared/ui/ListRow/ListRow";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function ListRowSection() {
  return (
    <Section title="ListRow">
      <StateCard label="default">
        <ListRow leading={<Avatar initials="DP" color="var(--m-8)" />} trailing={<span>{t("devui.sample.listRowTrailing")}</span>}>
          <div>{t("devui.sample.listRowTitle")}</div>
          <div>{t("devui.sample.listRowMeta")}</div>
        </ListRow>
      </StateCard>
      <StateCard label="interaktif (onClick)">
        <ListRow
          leading={<Avatar initials="DP" color="var(--m-8)" />}
          trailing={<span>{t("devui.sample.listRowTrailing")}</span>}
          onClick={() => undefined}
        >
          <div>{t("devui.sample.listRowTitle")}</div>
          <div>{t("devui.sample.listRowMeta")}</div>
        </ListRow>
      </StateCard>
    </Section>
  );
}
