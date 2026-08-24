import { allocateByWeights } from "@bagibill/split-engine";
import { formatMoney, t } from "@/lib/i18n";
import { Avatar, Button, Sheet } from "@/shared/ui";
import type { ExpenseItemRecord } from "@/lib/storage/records";
import type { ClaimParticipant } from "./use-claim";
import styles from "./ShareConfirmSheet.module.css";

export interface ShareConfirmSheetProps {
  readonly open: boolean;
  readonly item: ExpenseItemRecord | undefined;
  readonly currentClaimant: ClaimParticipant | undefined;
  readonly currency: string;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

// Order matches claimItem: the existing claimant keeps position 0, the
// person confirming the split lands at position 1 — the same array shape
// that ends up persisted, so the number shown here is exactly what saving
// will produce, not a preview that can drift from it.
function myShareAfterSplitMinor(item: ExpenseItemRecord): number {
  const itemTotalMinor = item.unitPriceMinor * item.quantity;
  const shares = allocateByWeights({ totalMinor: itemTotalMinor, weights: [1, 1] });
  return shares[1] ?? 0;
}

interface SheetBodyProps {
  readonly item: ExpenseItemRecord;
  readonly currentClaimant: ClaimParticipant;
  readonly currency: string;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

function SheetBody({ item, currentClaimant, currency, onConfirm, onClose }: SheetBodyProps) {
  const itemTotalMinor = item.unitPriceMinor * item.quantity;
  const myShareMinor = myShareAfterSplitMinor(item);

  return (
    <>
      <div className={styles.itemCard}>
        <span className={styles.itemName}>{item.name}</span>
        <span className={`${styles.itemAmount} bb-numeral`}>{formatMoney(itemTotalMinor, currency)}</span>
      </div>

      <p className={styles.currentLabel}>{t("claim.confirm.currentlyWith")}</p>
      <div className={styles.currentClaimant}>
        <Avatar initials={initialsFromName(currentClaimant.name)} color={`var(${currentClaimant.color})`} size="small" name={currentClaimant.name} />
        <span>{currentClaimant.name}</span>
      </div>

      <div className={styles.priceBox}>
        <span className={styles.priceLabel}>{t("claim.confirm.yourShareLabel")}</span>
        <span className={styles.priceValues}>
          <span className={`${styles.oldPrice} bb-numeral`}>{formatMoney(itemTotalMinor, currency)}</span>
          <span className={`${styles.newPrice} bb-numeral`}>{formatMoney(myShareMinor, currency)}</span>
        </span>
      </div>

      <Button onClick={onConfirm}>{t("claim.confirm.shareButton")}</Button>
      <Button variant="ghost" onClick={onClose}>
        {t("claim.confirm.cancelButton")}
      </Button>
    </>
  );
}

export function ShareConfirmSheet({ open, item, currentClaimant, currency, onConfirm, onClose }: ShareConfirmSheetProps) {
  const isReady = item !== undefined && currentClaimant !== undefined;
  return (
    <Sheet open={open && isReady} onClose={onClose} title={t("claim.confirm.heading")} subtitle={t("claim.confirm.body")}>
      {item !== undefined && currentClaimant !== undefined ? (
        <SheetBody item={item} currentClaimant={currentClaimant} currency={currency} onConfirm={onConfirm} onClose={onClose} />
      ) : null}
    </Sheet>
  );
}
