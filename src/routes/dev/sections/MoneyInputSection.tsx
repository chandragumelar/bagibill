import { useState } from "react";
import { t } from "@/lib/i18n";
import { MoneyInput } from "@/shared/ui/MoneyInput/MoneyInput";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function MoneyInputSection() {
  const [amountEmpty, setAmountEmpty] = useState(0);
  const [amountFilled, setAmountFilled] = useState(60000);

  return (
    <Section title="MoneyInput">
      <StateCard label="kosong">
        <MoneyInput label={t("devui.sample.moneyInputLabel")} prefix="Rp" amountMinor={amountEmpty} onChange={setAmountEmpty} />
      </StateCard>
      <StateCard label="terisi">
        <MoneyInput label={t("devui.sample.moneyInputLabel")} prefix="Rp" amountMinor={amountFilled} onChange={setAmountFilled} />
      </StateCard>
    </Section>
  );
}
