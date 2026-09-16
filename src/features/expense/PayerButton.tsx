import { useState } from "react";
import { t } from "@/lib/i18n";
import { Avatar, ListRow, Sheet } from "@/shared/ui";
import { CheckIcon } from "@/shared/system";
import type { ExpenseDraftMember } from "./expense-draft";
import formStyles from "./AddExpenseScreen.module.css";
import styles from "./PayerButton.module.css";

// spec.md 12.3: initials from words, not letters. Duplicated on purpose —
// the five ExpenseForm* screens each already carry their own copy
// (consolidation is tracked separately, see progress.md), and this is a
// sixth caller of the same rule, not the file to fix that in.
function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase();
}

export interface PayerButtonProps {
  /** Every active member of the group, checked or not — spec.md 6.7 lets
   * whoever fronts the bill skip eating, so the picker can never be
   * narrowed to participants only. */
  readonly members: readonly ExpenseDraftMember[];
  readonly payerMemberId: string;
  readonly onSelect: (memberId: string) => void;
}

// Shared by all five split modes (mockup-inventory: the "Dibayar" block is
// identical across every Tambah_Pengeluaran.html row set) so the picker
// markup and behavior live once instead of five times.
export function PayerButton({ members, payerMemberId, onSelect }: PayerButtonProps) {
  const [open, setOpen] = useState(false);
  const payer = members.find((member) => member.memberId === payerMemberId);
  if (payer === undefined) return null;

  function handleSelect(memberId: string): void {
    onSelect(memberId);
    setOpen(false);
  }

  return (
    <div className={formStyles.section}>
      <div className={formStyles.sectionHeading}>{t("expense.payer.label")}</div>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        <Avatar initials={initialsFromName(payer.name)} color={`var(${payer.color})`} name={payer.name} />
        <span className={styles.name}>{payer.name}</span>
        <span className={styles.changeAffordance}>{t("expense.payer.changeAffordance")}</span>
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("expense.payer.pickerTitle")}
        subtitle={t("expense.payer.pickerSubtitle")}
      >
        <div className={formStyles.participantList}>
          {members.map((member) => (
            <ListRow
              key={member.memberId}
              onClick={() => handleSelect(member.memberId)}
              leading={<Avatar initials={initialsFromName(member.name)} color={`var(${member.color})`} name={member.name} />}
              trailing={member.memberId === payerMemberId ? <CheckIcon /> : undefined}
            >
              <span className={formStyles.memberName}>{member.name}</span>
            </ListRow>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
