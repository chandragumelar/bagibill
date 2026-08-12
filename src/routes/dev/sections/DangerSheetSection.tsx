import { useState } from "react";
import { t } from "@/lib/i18n";
import { DangerSheet } from "@/shared/system/dangerSheet/DangerSheet";
import { Button } from "@/shared/ui/Button/Button";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function DangerSheetSection() {
  const [open, setOpen] = useState(false);

  return (
    <Section title="DangerSheet + HoldToDeleteButton">
      <StateCard label="tahan untuk hapus">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t("devui.sample.openDangerSheet")}
        </Button>
      </StateCard>
      <DangerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("devui.sample.dangerSheetTitle")}
        subtitle={t("devui.sample.dangerSheetSubtitle")}
        badgeLabel={t("devui.sample.dangerSheetBadge")}
        losingItems={<li>{t("devui.sample.dangerSheetLosing")}</li>}
        irreversibleNote={t("devui.sample.dangerSheetIrreversible")}
        holdLabel={t("devui.sample.dangerSheetHold")}
        completingLabel={t("devui.sample.dangerSheetCompleting")}
        hint={t("devui.sample.dangerSheetHint")}
        cancelLabel={t("devui.sample.dangerSheetCancel")}
        onConfirm={() => setOpen(false)}
      />
    </Section>
  );
}
