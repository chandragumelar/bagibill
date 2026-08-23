import type { ExpenseLedger, Transfer } from "@bagibill/split-engine";
import { formatDate, formatMoney, t } from "@/lib/i18n";
import { Avatar, Sheet } from "@/shared/ui";
import { initialsFromName } from "./BalanceList";
import { traceMemberBalance, traceTransfer, type LedgerOrigin, type MemberContribution, type TransferChain } from "./settlement-trace";
import type { BalanceMemberRow } from "./use-group-balance";
import styles from "./TraceSheet.module.css";

export type TraceSheetTarget =
  | { readonly kind: "member"; readonly memberId: string }
  | { readonly kind: "transfer"; readonly transfer: Transfer };

export interface TraceSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly target: TraceSheetTarget | undefined;
  readonly rows: readonly BalanceMemberRow[];
  readonly ledgers: readonly ExpenseLedger[];
  readonly origins: readonly LedgerOrigin[];
  /** Always the pairwise list — the graph traceTransfer routes a Ringkas transfer through. */
  readonly directTransfers: readonly Transfer[];
  readonly currency: string;
}

function findRowById(rows: readonly BalanceMemberRow[], memberId: string): BalanceMemberRow | undefined {
  return rows.find((row) => row.memberId === memberId);
}

function signedAmount(amountMinor: number, currency: string): string {
  const magnitude = formatMoney(Math.abs(amountMinor), currency);
  if (amountMinor > 0) return `+${magnitude}`;
  if (amountMinor < 0) return `−${magnitude}`;
  return magnitude;
}

interface ContributionRowProps {
  readonly contribution: MemberContribution;
  readonly rows: readonly BalanceMemberRow[];
  readonly currency: string;
}

// Expense rows name a real transaction but never look tappable — there is
// no expense detail screen yet to send someone to (plan.md F3-07 bagian 4,
// Catatan lepas). A settlement is rendered as its own kind, never disguised
// as an expense (spec.md).
function ContributionRow({ contribution, rows, currency }: ContributionRowProps) {
  const { origin, amountMinor } = contribution;
  const dateLabel = formatDate(new Date(origin.date), { day: "numeric", month: "short", year: "numeric" });
  const label =
    origin.kind === "expense"
      ? origin.title
      : t("settle.trace.settlementRow", {
          from: findRowById(rows, origin.fromMemberId)?.name ?? "",
          to: findRowById(rows, origin.toMemberId)?.name ?? "",
        });

  return (
    <li className={styles.contributionRow}>
      <span className={styles.contributionInfo}>
        <span className={styles.contributionName}>{label}</span>
        <span className={styles.contributionDate}>{dateLabel}</span>
      </span>
      <span className={`${styles.contributionAmount} bb-numeral`}>{signedAmount(amountMinor, currency)}</span>
    </li>
  );
}

interface MemberTraceBodyProps {
  readonly memberId: string;
  readonly rows: readonly BalanceMemberRow[];
  readonly ledgers: readonly ExpenseLedger[];
  readonly origins: readonly LedgerOrigin[];
  readonly currency: string;
}

function MemberTraceBody({ memberId, rows, ledgers, origins, currency }: MemberTraceBodyProps) {
  const participantIndex = rows.findIndex((row) => row.memberId === memberId);
  const row = rows[participantIndex];
  if (row === undefined) return null;

  const contributions = traceMemberBalance(participantIndex, ledgers, origins);
  const total = contributions.reduce((sum, contribution) => sum + contribution.amountMinor, 0);

  return (
    <>
      <div className={styles.head}>
        <Avatar initials={initialsFromName(row.name)} color={`var(${row.color})`} name={row.name} />
        <span className={`${styles.headAmount} bb-numeral`}>{signedAmount(row.netMinor, currency)}</span>
      </div>
      {contributions.length === 0 ? (
        <p className={styles.emptyBody}>{t("settle.trace.emptyBody")}</p>
      ) : (
        <>
          <ul className={styles.contributionList}>
            {contributions.map((contribution, index) => (
              <ContributionRow key={index} contribution={contribution} rows={rows} currency={currency} />
            ))}
          </ul>
          <div className={styles.sum}>
            <span>{t("settle.trace.contributionsCount", { count: contributions.length })}</span>
            <b className={`${styles.sumAmount} bb-numeral`}>{signedAmount(total, currency)}</b>
          </div>
        </>
      )}
    </>
  );
}

interface ChainProps {
  readonly chain: TransferChain;
  readonly rows: readonly BalanceMemberRow[];
  readonly currency: string;
}

function Chain({ chain, rows, currency }: ChainProps) {
  const participantIndices = [chain.segments[0]?.fromIndex, ...chain.segments.map((segment) => segment.toIndex)];

  return (
    <li className={styles.chain}>
      <span className={styles.chainRoute}>
        {participantIndices.map((participantIndex, index) => {
          const chainRow = participantIndex === undefined ? undefined : rows[participantIndex];
          if (chainRow === undefined) return null;
          return (
            <span key={`${chainRow.memberId}-${index}`} className={styles.chainStep}>
              {index > 0 ? (
                <span className={styles.chainArrow} aria-hidden="true">
                  →
                </span>
              ) : null}
              <Avatar initials={initialsFromName(chainRow.name)} color={`var(${chainRow.color})`} size="small" name={chainRow.name} />
              <span className={styles.chainName}>{chainRow.name}</span>
            </span>
          );
        })}
      </span>
      <span className={`${styles.chainAmount} bb-numeral`}>{formatMoney(chain.amountMinor, currency)}</span>
    </li>
  );
}

interface TransferTraceBodyProps {
  readonly transfer: Transfer;
  readonly rows: readonly BalanceMemberRow[];
  readonly directTransfers: readonly Transfer[];
  readonly currency: string;
}

function TransferTraceBody({ transfer, rows, directTransfers, currency }: TransferTraceBodyProps) {
  const fromRow = rows[transfer.fromIndex];
  const toRow = rows[transfer.toIndex];
  if (fromRow === undefined || toRow === undefined) return null;

  const explanation = traceTransfer(transfer, directTransfers);
  const names = { from: fromRow.name, to: toRow.name };

  return (
    <>
      <div className={styles.head}>
        <span className={styles.headFlow}>
          <Avatar initials={initialsFromName(fromRow.name)} color={`var(${fromRow.color})`} size="small" name={fromRow.name} />
          <span className={styles.headArrow} aria-hidden="true">
            →
          </span>
          <Avatar initials={initialsFromName(toRow.name)} color={`var(${toRow.color})`} size="small" name={toRow.name} />
        </span>
        <span className={`${styles.headAmount} bb-numeral`}>{formatMoney(transfer.amountMinor, currency)}</span>
      </div>

      {explanation.kind === "direct" ? <p className={styles.note}>{t("settle.trace.directBody", names)}</p> : null}

      {explanation.chains.length > 0 && explanation.kind !== "direct" ? (
        <>
          <p className={styles.note}>{t("settle.trace.chainedIntro", names)}</p>
          <ul className={styles.chainList}>
            {explanation.chains.map((chain, index) => (
              <Chain key={index} chain={chain} rows={rows} currency={currency} />
            ))}
          </ul>
        </>
      ) : null}

      {explanation.unexplainedMinor > 0 ? (
        <p className={styles.partialNote}>
          {t("settle.trace.partialBody", { amount: formatMoney(explanation.unexplainedMinor, currency) })}
        </p>
      ) : null}
    </>
  );
}

function subtitleFor(target: TraceSheetTarget, rows: readonly BalanceMemberRow[]): string {
  if (target.kind === "member") {
    const row = findRowById(rows, target.memberId);
    return t("settle.trace.memberSubtitle", { name: row?.name ?? "" });
  }
  const fromRow = rows[target.transfer.fromIndex];
  const toRow = rows[target.transfer.toIndex];
  return t("settle.trace.transferSubtitle", { from: fromRow?.name ?? "", to: toRow?.name ?? "" });
}

// Two doors, one sheet (F3-07 bagian 3): a BalanceList amount opens the
// "member" variant (why is my number this), a SuggestedTransfers row opens
// the "transfer" variant (why does this money go through this person).
export function TraceSheet({ open, onClose, target, rows, ledgers, origins, directTransfers, currency }: TraceSheetProps) {
  if (!open || target === undefined) return null;

  return (
    <Sheet open={open} onClose={onClose} title={t("settle.trace.title")} subtitle={subtitleFor(target, rows)}>
      {target.kind === "member" ? (
        <MemberTraceBody memberId={target.memberId} rows={rows} ledgers={ledgers} origins={origins} currency={currency} />
      ) : (
        <TransferTraceBody transfer={target.transfer} rows={rows} directTransfers={directTransfers} currency={currency} />
      )}
    </Sheet>
  );
}
