import { t, formatMoney } from "@/lib/i18n";
import { Avatar } from "@/shared/ui";
import { CheckIcon } from "@/shared/system/icons";
import { InlineFailure } from "@/shared/system";
import type { ExpenseItemRecord } from "@/lib/storage/records";
import { resolveTapEffect } from "./claim-actions";
import type { ClaimParticipant } from "./use-claim";
import styles from "./ClaimItemList.module.css";

export interface ClaimItemListProps {
  readonly expenseTitle: string;
  readonly creatorName: string;
  readonly creatorColor: string;
  readonly totalMinor: number;
  readonly currency: string;
  readonly participants: readonly ClaimParticipant[];
  readonly items: readonly ExpenseItemRecord[];
  readonly currentMemberId: string;
  readonly myTotalMinor: number;
  readonly myItemCount: number;
  readonly saveError: boolean;
  readonly onTapItem: (itemId: string) => void;
  readonly onRetrySave: () => void;
  readonly onViewSummary: () => void;
}

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

function participantMap(participants: readonly ClaimParticipant[]): ReadonlyMap<string, ClaimParticipant> {
  return new Map(participants.map((participant) => [participant.memberId, participant]));
}

// Who has claimed something so far — a snapshot of stored data, not a live
// presence feed (F3-08 is single-device, no realtime). Capped the same way
// the settle feature's reminder copy caps a name list.
function othersActiveNames(items: readonly ExpenseItemRecord[], currentMemberId: string, byId: ReadonlyMap<string, ClaimParticipant>): readonly string[] {
  const ids = new Set<string>();
  for (const item of items) {
    for (const claim of item.claims) {
      if (claim.memberId !== currentMemberId) ids.add(claim.memberId);
    }
  }
  return [...ids].map((id) => byId.get(id)?.name).filter((name): name is string => name !== undefined);
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" & ");
  const [first, second] = names;
  return t("claim.list.namesAndMore", { first: first ?? "", second: second ?? "", count: names.length - 2 });
}

interface ItemClaimantsProps {
  readonly item: ExpenseItemRecord;
  readonly byId: ReadonlyMap<string, ClaimParticipant>;
}

function ItemClaimants({ item, byId }: ItemClaimantsProps) {
  if (item.claims.length === 0) {
    return (
      <p className={styles.unclaimedHint}>
        <span className={styles.unclaimedDot} aria-hidden="true" />
        {t("claim.item.unclaimed")} — {t("claim.item.unclaimedHint")}
      </p>
    );
  }
  return (
    <div className={styles.claimants}>
      {item.claims.map((claim) => {
        const participant = byId.get(claim.memberId);
        if (participant === undefined) return null;
        return (
          <span key={claim.memberId} className={styles.claimant}>
            <Avatar initials={initialsFromName(participant.name)} color={`var(${participant.color})`} size="small" name={participant.name} />
            <span className={styles.claimantName}>{participant.name}</span>
          </span>
        );
      })}
    </div>
  );
}

interface CheckboxProps {
  readonly kind: ReturnType<typeof resolveTapEffect>["kind"];
}

function Checkbox({ kind }: CheckboxProps) {
  if (kind === "released") {
    return (
      <span className={`${styles.checkbox} ${styles.checked}`} aria-hidden="true">
        <CheckIcon />
      </span>
    );
  }
  if (kind === "confirmShare") return <span className={`${styles.checkbox} ${styles.dashed}`} aria-hidden="true" />;
  return <span className={styles.checkbox} aria-hidden="true" />;
}

interface ItemRowProps {
  readonly item: ExpenseItemRecord;
  readonly currentMemberId: string;
  readonly currency: string;
  readonly byId: ReadonlyMap<string, ClaimParticipant>;
  readonly onTap: (itemId: string) => void;
}

function ItemRow({ item, currentMemberId, currency, byId, onTap }: ItemRowProps) {
  const effect = resolveTapEffect(item, currentMemberId);
  const itemTotalMinor = item.unitPriceMinor * item.quantity;
  const claimedWeight = item.claims.reduce((sum, claim) => sum + claim.weight, 0);

  return (
    <button type="button" className={styles.item} onClick={() => onTap(item.itemId)}>
      <Checkbox kind={effect.kind} />
      <span className={styles.itemBody}>
        <span className={styles.itemHeadline}>
          <span className={styles.itemName}>{item.name}</span>
          <span className={`${styles.itemAmount} bb-numeral`}>{formatMoney(itemTotalMinor, currency)}</span>
        </span>
        <span className={styles.itemSub}>
          {item.quantity > 1 ? `${item.quantity} × ${formatMoney(item.unitPriceMinor, currency)}` : formatMoney(item.unitPriceMinor, currency)}
          {item.quantity > 1 ? ` · ${t("claim.item.portionRatio", { claimed: claimedWeight, quantity: item.quantity })}` : ""}
        </span>
        <ItemClaimants item={item} byId={byId} />
      </span>
    </button>
  );
}

export function ClaimItemList({
  expenseTitle,
  creatorName,
  creatorColor,
  totalMinor,
  currency,
  participants,
  items,
  currentMemberId,
  myTotalMinor,
  myItemCount,
  saveError,
  onTapItem,
  onRetrySave,
  onViewSummary,
}: ClaimItemListProps) {
  const byId = participantMap(participants);
  const claimedItemCount = items.filter((item) => item.claims.length > 0).length;
  const others = othersActiveNames(items, currentMemberId, byId);
  const progressPercent = items.length === 0 ? 0 : Math.round((claimedItemCount / items.length) * 100);

  return (
    <main className={styles.screen}>
      <div className={styles.brand}>
        <span className={styles.brandName}>{t("claim.list.brandName")}</span>
        <span className={styles.secureLink}>{t("claim.list.secureLink")}</span>
      </div>
      <div className={styles.invite}>
        <Avatar initials={initialsFromName(creatorName)} color={`var(${creatorColor})`} name={creatorName} />
        <span className={styles.inviteText}>
          <span className={styles.title}>{expenseTitle}</span>
          <span className={styles.inviteSub}>{t("claim.list.invitedBy", { creatorName })}</span>
        </span>
      </div>
      <div className={styles.totalRow}>
        <span>{t("claim.list.totalLabel")}</span>
        <span className="bb-numeral">{formatMoney(totalMinor, currency)}</span>
      </div>
      {others.length > 0 ? <p className={styles.others}>{t("claim.list.othersActive", { names: joinNames(others) })}</p> : null}

      <div className={styles.progressLabel}>
        <span>{t("claim.list.progressHeading")}</span>
        <span>{t("claim.list.progress", { claimed: claimedItemCount, total: items.length })}</span>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>

      {saveError ? (
        <InlineFailure message={t("common.saveFailed")} retryLabel={t("system.retry")} onRetry={onRetrySave} variant="boxed" />
      ) : null}

      <h2 className={styles.sectionLabel}>{t("claim.list.itemsHeading")}</h2>
      <div className={styles.list}>
        {items.map((item) => (
          <ItemRow key={item.itemId} item={item} currentMemberId={currentMemberId} currency={currency} byId={byId} onTap={onTapItem} />
        ))}
      </div>

      <button type="button" className={styles.footer} onClick={onViewSummary}>
        <span className={styles.footerLabel}>{t("claim.list.yoursLabel")}</span>
        <span className={`${styles.footerAmount} bb-numeral`}>{formatMoney(myTotalMinor, currency)}</span>
        <span className={styles.footerCount}>{t("claim.list.itemCount", { count: myItemCount })}</span>
      </button>
    </main>
  );
}
