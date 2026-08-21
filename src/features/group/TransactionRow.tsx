import { t, formatMoney } from "@/lib/i18n";
import { Avatar } from "@/shared/ui/Avatar/Avatar";
import { ListRow } from "@/shared/ui/ListRow/ListRow";
import styles from "./TransactionRow.module.css";

// A single participant's effect on "kamu" for one expense — bucketed here
// (not left as a raw signed number) because the sign of netMinor is money
// logic, and money logic doesn't belong in the render layer.
export type RowEffect =
  | { readonly kind: "owed"; readonly netMinor: number }
  | { readonly kind: "credit"; readonly netMinor: number }
  | { readonly kind: "even" }
  | { readonly kind: "out" };

export interface ExpenseTransactionRow {
  readonly kind: "expense";
  readonly expenseId: string;
  readonly title: string;
  readonly payerNames: readonly string[];
  readonly isCurrentMemberPayer: boolean;
  readonly payerAvatarInitials: string;
  readonly payerAvatarColor: string;
  readonly hasAttachment: boolean;
  readonly isPerItemMode: boolean;
  /** Present only when the expense's own currency differs from the group's base currency. */
  readonly foreignAmountMinor?: number;
  readonly foreignCurrency?: string;
  readonly effect: RowEffect;
}

// Settlements can't be created by any screen yet (F3-07 builds that flow) —
// this variant exists so the row shape from the mockup is fully built and
// tested, even though TransactionList never has real data to pass it today.
export interface SettlementTransactionRow {
  readonly kind: "settlement";
  readonly settlementId: string;
  readonly counterpartyName: string;
  readonly direction: "received" | "paid";
  readonly amountMinor: number;
}

// A stored expense that failed to calculate (corrupt data) renders honestly
// instead of taking the whole list down with it.
export interface BrokenTransactionRow {
  readonly kind: "broken";
  readonly expenseId: string;
}

export type TransactionRowData = ExpenseTransactionRow | SettlementTransactionRow | BrokenTransactionRow;

export interface TransactionRowProps {
  readonly row: TransactionRowData;
  readonly currency: string;
}

export function TransactionRow({ row, currency }: TransactionRowProps) {
  if (row.kind === "broken") return <BrokenRow />;
  if (row.kind === "settlement") return <SettlementRow row={row} currency={currency} />;
  return <ExpenseRow row={row} currency={currency} />;
}

function payerLabel(row: ExpenseTransactionRow): string {
  if (row.payerNames.length === 1) {
    return row.isCurrentMemberPayer
      ? t("group.transaction.payerYou")
      : t("group.transaction.payerOther", { name: row.payerNames[0] ?? "" });
  }
  return t("group.transaction.payerMultiple", { count: row.payerNames.length });
}

interface EffectViewProps {
  readonly effect: RowEffect;
  readonly currency: string;
}

function EffectView({ effect, currency }: EffectViewProps) {
  if (effect.kind === "out") {
    return (
      <span className={styles.effect}>
        <span className={`${styles.effectAmount} ${styles.muted}`}>{t("group.transaction.notInvolvedAmount")}</span>
        <span className={styles.effectLabel}>{t("group.transaction.notInvolvedLabel")}</span>
      </span>
    );
  }
  if (effect.kind === "even") {
    return (
      <span className={styles.effect}>
        <span className={`${styles.effectAmount} bb-numeral`}>{formatMoney(0, currency)}</span>
        <span className={styles.effectLabel}>{t("group.transaction.settled")}</span>
      </span>
    );
  }
  const tone = effect.kind === "owed" ? styles.negative : styles.positive;
  const label = effect.kind === "owed" ? t("group.transaction.yourShare") : t("group.transaction.forYou");
  return (
    <span className={styles.effect}>
      <span className={`${styles.effectAmount} ${tone} bb-numeral`}>{formatMoney(effect.netMinor, currency)}</span>
      <span className={styles.effectLabel}>{label}</span>
    </span>
  );
}

interface ExpenseRowProps {
  readonly row: ExpenseTransactionRow;
  readonly currency: string;
}

// The mockup's leading circle is a category icon, tinted per category —
// but there's no category icon set built anywhere yet (K-09, decided but
// never implemented) and CLAUDE.md's hard rule bans category color on a
// screen that shows people either way. The payer's own avatar fills the
// same 40px slot instead: real data, real member color, and it answers
// "who paid" at a glance instead of a color that isn't allowed here.
function ExpenseRow({ row, currency }: ExpenseRowProps) {
  const titleClassName = row.effect.kind === "out" ? `${styles.title} ${styles.titleMuted}` : styles.title;
  return (
    <ListRow
      leading={<Avatar initials={row.payerAvatarInitials} color={`var(${row.payerAvatarColor})`} />}
      trailing={<EffectView effect={row.effect} currency={currency} />}
    >
      <div className={titleClassName}>{row.title}</div>
      <div className={styles.meta}>
        <span className={styles.payer}>{payerLabel(row)}</span>
        {row.foreignAmountMinor !== undefined && row.foreignCurrency !== undefined ? (
          <>
            <span className={styles.payer}>· {formatMoney(row.foreignAmountMinor, row.foreignCurrency)}</span>
            <span className={styles.fxBadge}>{row.foreignCurrency}</span>
          </>
        ) : null}
        {row.isPerItemMode ? <span className={styles.mark}>{t("group.transaction.perItemBadge")}</span> : null}
        {row.hasAttachment ? (
          <span className={styles.mark} role="img" aria-label={t("group.transaction.attachmentLabel")}>
            📎
          </span>
        ) : null}
      </div>
    </ListRow>
  );
}

interface SettlementRowProps {
  readonly row: SettlementTransactionRow;
  readonly currency: string;
}

function SettlementRow({ row, currency }: SettlementRowProps) {
  const flow =
    row.direction === "received"
      ? t("group.transaction.settlementReceived", { name: row.counterpartyName })
      : t("group.transaction.settlementPaid", { name: row.counterpartyName });
  const effectLabel =
    row.direction === "received" ? t("group.transaction.settlementReceivedLabel") : t("group.transaction.settlementPaidLabel");
  const signedAmountMinor = row.direction === "received" ? row.amountMinor : -row.amountMinor;

  return (
    <ListRow
      leading={<span className={styles.settlementIcon} aria-hidden="true">→</span>}
      trailing={
        <span className={styles.effect}>
          <span className={`${styles.effectAmount} ${styles.positive} bb-numeral`}>
            {formatMoney(signedAmountMinor, currency)}
          </span>
          <span className={styles.effectLabel}>{effectLabel}</span>
        </span>
      }
    >
      <div className={styles.settlementTitle}>{t("group.transaction.settlementTitle")}</div>
      <div className={styles.settlementFlow}>{flow}</div>
    </ListRow>
  );
}

function BrokenRow() {
  return (
    <div className={styles.broken} role="alert">
      {t("group.transaction.brokenRow")}
    </div>
  );
}
