import { useState } from "react";
import { t } from "@/lib/i18n";
import { TextInput } from "@/shared/ui/TextInput/TextInput";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";

export function TextInputSection() {
  const [textValue, setTextValue] = useState("");
  const [duplicateValue, setDuplicateValue] = useState(t("devui.sample.name"));

  return (
    <Section title="TextInput">
      <StateCard label="kosong">
        <TextInput label={t("devui.sample.textInputLabel")} value={textValue} onChange={setTextValue} />
      </StateCard>
      <StateCard label="terisi">
        <TextInput label={t("devui.sample.textInputLabel")} value={t("devui.sample.name")} onChange={() => undefined} />
      </StateCard>
      <StateCard label="dengan peringatan">
        <TextInput
          label={t("devui.sample.textInputLabel")}
          value={duplicateValue}
          onChange={setDuplicateValue}
          warning={t("devui.sample.textInputWarning")}
        />
      </StateCard>
    </Section>
  );
}
