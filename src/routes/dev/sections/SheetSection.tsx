import { useState } from "react";
import { t } from "@/lib/i18n";
import { Button } from "@/shared/ui/Button/Button";
import { Sheet } from "@/shared/ui/Sheet/Sheet";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function SheetSection() {
  const [openSheet, setOpenSheet] = useState<"none" | "biasa" | "berat">("none");

  return (
    <Section title="Sheet">
      <StateCard label="biasa">
        <Button variant="secondary" onClick={() => setOpenSheet("biasa")}>
          Buka
        </Button>
      </StateCard>
      <StateCard label="berat">
        <Button variant="secondary" onClick={() => setOpenSheet("berat")}>
          Buka
        </Button>
      </StateCard>
      <Sheet
        open={openSheet === "biasa"}
        onClose={() => setOpenSheet("none")}
        title={t("devui.sample.sheetTitle")}
        subtitle={t("devui.sample.sheetSubtitle")}
      >
        <p>{t("devui.sample.sheetBody")}</p>
      </Sheet>
      <Sheet
        open={openSheet === "berat"}
        onClose={() => setOpenSheet("none")}
        title={t("devui.sample.sheetHeavyTitle")}
        subtitle={t("devui.sample.sheetHeavySubtitle")}
      />
    </Section>
  );
}
