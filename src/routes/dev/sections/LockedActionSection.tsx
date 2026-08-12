import { LockedActionExplain } from "@/shared/system/lockedAction/LockedActionExplain";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function LockedActionSection() {
  return (
    <Section title="LockedActionExplain">
      <StateCard label="member ber-transaksi">
        <LockedActionExplain name="Farhan" transactionCount={8} onDeactivate={() => undefined} />
      </StateCard>
    </Section>
  );
}
