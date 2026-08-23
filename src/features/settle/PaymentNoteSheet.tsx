import { useState } from "react";
import { formatMoney, t } from "@/lib/i18n";
import { Button, Sheet } from "@/shared/ui";
import styles from "./PaymentNoteSheet.module.css";

export interface PaymentNoteSheetTarget {
  readonly memberId: string;
  readonly name: string;
  readonly netMinor: number;
  readonly paymentNote?: string;
  /** True when this member currently owes money overall (net < 0) and isn't the current member — the only case the mockup offers a "susun pesan tagih" shortcut from this sheet. */
  readonly canRemind: boolean;
}

export interface PaymentNoteSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly target: PaymentNoteSheetTarget | undefined;
  readonly currency: string;
  readonly groupName: string;
  readonly onRemind: (memberId: string) => void;
}

type CopyState = "idle" | "done" | "failed";

function copyLabelFor(copyState: CopyState): string {
  if (copyState === "done") return t("settle.note.copyDone");
  if (copyState === "failed") return t("settle.note.copyFailed");
  return t("settle.note.copyButton");
}

function subtitleFor(netMinor: number, currency: string, groupName: string): string {
  if (netMinor > 0) return t("settle.note.subtitleReceiving", { amount: formatMoney(netMinor, currency), groupName });
  if (netMinor < 0) return t("settle.note.subtitlePaying", { amount: formatMoney(-netMinor, currency), groupName });
  return t("settle.note.subtitleSettled", { groupName });
}

// Clipboard writes and their failure are both async and both worth showing
// — a silent failure here would leave someone believing they copied a bank
// account number that never made it to their clipboard.
async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function PaymentNoteSheet({ open, onClose, target, currency, groupName, onRemind }: PaymentNoteSheetProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  if (!open || target === undefined) return null;

  async function handleCopy(): Promise<void> {
    if (target?.paymentNote === undefined) return;
    const ok = await copyToClipboard(target.paymentNote);
    setCopyState(ok ? "done" : "failed");
  }

  const copyLabel = copyLabelFor(copyState);

  return (
    <Sheet open={open} onClose={onClose} title={target.name} subtitle={subtitleFor(target.netMinor, currency, groupName)}>
      <div className={styles.noteCard}>
        <div className={styles.noteInfo}>
          <div className={styles.noteLabel}>{t("settle.note.label")}</div>
          <div className={styles.noteValue}>{target.paymentNote ?? t("settle.note.empty")}</div>
        </div>
        {target.paymentNote !== undefined ? (
          <Button variant="secondary" onClick={() => void handleCopy()}>
            {copyLabel}
          </Button>
        ) : null}
      </div>

      {/* spec.md 11.4: this field is free text, never parsed or reformatted —
          it might be a bank account number, an IBAN, an e-wallet tag, or
          something else entirely, and BagiBill has no banking logic to
          validate any of that against. Tidying it up would be guessing. */}
      <p className={styles.disclaimer}>{t("settle.note.disclaimer")}</p>

      {target.canRemind ? (
        <Button onClick={() => onRemind(target.memberId)}>{t("settle.note.remindCta")}</Button>
      ) : null}
    </Sheet>
  );
}
