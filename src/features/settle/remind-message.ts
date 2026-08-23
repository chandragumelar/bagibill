import { t } from "@/lib/i18n";

export interface RemindMessageInput {
  readonly groupName: string;
  readonly debtorName: string;
  readonly formattedAmount: string;
  /** The recipient's own payment note (spec.md 11.4) — omitted when they haven't set one, in which case the line naming where to pay is left out rather than printed empty. */
  readonly recipientNote?: string;
}

// Pure text assembly (spec.md 11.5): every phrase comes from a locale key,
// this function only decides which pieces appear and in what order — never
// concatenates raw Indonesian/English of its own. Built from three
// independently-keyed lines rather than one template with an optional
// {noteLine} slot, so a translator can drop or reorder the note line without
// fighting a nested placeholder.
export function buildRemindMessage(input: RemindMessageInput): string {
  const lines = [
    t("settle.remind.greeting", { debtorName: input.debtorName, groupName: input.groupName, amount: input.formattedAmount }),
  ];
  if (input.recipientNote !== undefined && input.recipientNote.trim() !== "") {
    lines.push("", t("settle.remind.transferTo", { note: input.recipientNote }));
  }
  lines.push("", t("settle.remind.signoff"));
  return lines.join("\n");
}
