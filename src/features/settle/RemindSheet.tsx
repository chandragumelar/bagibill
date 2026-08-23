import { useState } from "react";
import { t } from "@/lib/i18n";
import { Button, Sheet } from "@/shared/ui";
import { buildRemindMessage } from "./remind-message";
import styles from "./RemindSheet.module.css";

export interface RemindSheetTarget {
  readonly debtorName: string;
  readonly groupName: string;
  readonly formattedAmount: string;
  readonly recipientNote?: string;
}

export interface RemindSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly target: RemindSheetTarget | undefined;
  /** Undefined when the Web Share API isn't available on this device — the share button must not render at all in that case, per spec.md 11.5. */
  readonly share: ((text: string) => Promise<void>) | undefined;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type CopyState = "idle" | "done" | "failed";

function copyLabelFor(copyState: CopyState): string {
  if (copyState === "done") return t("settle.remind.copyDone");
  if (copyState === "failed") return t("settle.remind.copyFailed");
  return t("settle.remind.copyButton");
}

export function RemindSheet({ open, onClose, target, share }: RemindSheetProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [sharing, setSharing] = useState(false);

  if (!open || target === undefined) return null;

  const message = buildRemindMessage({
    groupName: target.groupName,
    debtorName: target.debtorName,
    formattedAmount: target.formattedAmount,
    recipientNote: target.recipientNote,
  });

  async function handleCopy(): Promise<void> {
    const ok = await copyToClipboard(message);
    setCopyState(ok ? "done" : "failed");
  }

  async function handleShare(): Promise<void> {
    if (share === undefined) return;
    setSharing(true);
    try {
      await share(message);
    } finally {
      setSharing(false);
    }
  }

  const copyLabel = copyLabelFor(copyState);

  return (
    <Sheet open={open} onClose={onClose} title={t("settle.remind.title", { name: target.debtorName })} subtitle={t("settle.remind.subtitle")}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {share !== undefined ? (
          <Button onClick={() => void handleShare()} disabled={sharing}>
            {sharing ? t("settle.remind.shareOpening") : t("settle.remind.shareButton")}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => void handleCopy()}>
          {copyLabel}
        </Button>
      </div>
      {/* spec.md 11.5: this is text only — no payment collection, no bank
          link. The disclaimer here mirrors the one in PaymentNoteSheet
          because both sheets are the only places money-adjacent language
          appears, and CLAUDE.md's promise is that it never overstates what
          BagiBill does with it. */}
      <p className={styles.disclaimer}>{t("settle.remind.disclaimer")}</p>
    </Sheet>
  );
}
