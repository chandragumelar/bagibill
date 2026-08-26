import { formatMoney, t } from "@/lib/i18n";
import { AvatarStack } from "@/shared/ui/AvatarStack/AvatarStack";
import { CheckIcon } from "@/shared/system";
import type { HomeGroupViewModel } from "./use-home-groups";
import styles from "./GroupCard.module.css";

export interface GroupCardProps {
  readonly group: HomeGroupViewModel;
  readonly onOpen: () => void;
}

// Sign and word together, color never alone — same rule and the same glyphs
// as BalanceList.tsx's DirectionTag, because this is the same fact ("posisi
// kamu di grup ini") shown one screen earlier. Keeping the visual language
// identical means it doesn't have to be relearned when you tap through.
function signedAmount(netMinor: number, currency: string): string {
  const magnitude = formatMoney(Math.abs(netMinor), currency);
  if (netMinor > 0) return `+${magnitude}`;
  if (netMinor < 0) return `−${magnitude}`;
  return magnitude;
}

function toneClass(netMinor: number): string {
  if (netMinor > 0) return styles.pos ?? "";
  if (netMinor < 0) return styles.neg ?? "";
  return styles.settled ?? "";
}

function DirectionTag({ netMinor }: { readonly netMinor: number }) {
  if (netMinor > 0) {
    return (
      <span className={`${styles.tag} ${styles.tagPos}`}>
        <span aria-hidden="true">↓</span>
        {t("home.group.tagCredit")}
      </span>
    );
  }
  if (netMinor < 0) {
    return (
      <span className={`${styles.tag} ${styles.tagNeg}`}>
        <span aria-hidden="true">↑</span>
        {t("home.group.tagDebt")}
      </span>
    );
  }
  return <span className={`${styles.tag} ${styles.tagZero}`}>{t("home.group.tagSettled")}</span>;
}

function Foot({ group }: { readonly group: HomeGroupViewModel }) {
  if (group.netMinor === 0) {
    return (
      <div className={styles.foot}>
        <DirectionTag netMinor={0} />
        <span className={styles.settledDone}>
          <CheckIcon />
          {t("home.group.settledDone")}
        </span>
      </div>
    );
  }
  return (
    <div className={styles.foot}>
      <DirectionTag netMinor={group.netMinor} />
      <span className={`${styles.amount} bb-numeral`}>{signedAmount(group.netMinor, group.currency)}</span>
    </div>
  );
}

export function GroupCard({ group, onOpen }: GroupCardProps) {
  const activity = group.hasTransactions
    ? t("common.expenseCount", { count: group.expenseCount })
    : t("common.noExpensesYet");

  return (
    <button type="button" className={`${styles.card} ${toneClass(group.netMinor)}`} onClick={onOpen}>
      <div className={styles.top}>
        <span className={styles.name}>{group.name}</span>
        <span className={styles.meta}>
          {t("home.group.memberCount", { count: group.memberCount })} · {activity}
        </span>
      </div>
      <AvatarStack members={group.avatarMembers} />
      <Foot group={group} />
    </button>
  );
}
