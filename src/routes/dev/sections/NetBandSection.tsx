import { t } from "@/lib/i18n";
import { NetBand } from "@/shared/system/netBand/NetBand";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

// Fase di sini di-set langsung lewat prop, bukan lewat useNetworkPhase —
// hook-nya dengerin event online/offline browser beneran, gak bisa dipicu
// tombol di halaman debug. Perilaku hook-nya sendiri diuji lewat test.
export function NetBandSection() {
  return (
    <Section title="NetBand">
      <StateCard label="offline">
        <NetBand phase="offline" pendingCount={2} recipientsText={t("devui.sample.netbandRecipients")} />
      </StateCard>
      <StateCard label="sync">
        <NetBand phase="sync" pendingCount={2} />
      </StateCard>
      <StateCard label="done">
        <NetBand phase="done" />
      </StateCard>
    </Section>
  );
}
