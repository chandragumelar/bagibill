import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { Button } from "@/shared/ui/Button/Button";
import { LoadFailure } from "@/shared/system";
import { WarnIcon } from "@/shared/system/icons";
import { BalanceList } from "./BalanceList";
import { SuggestedTransfers } from "./SuggestedTransfers";
import { TransferNetwork } from "./TransferNetwork";
import type { GroupBalanceState, SettlementMode } from "./use-group-balance";
import styles from "./BalanceTab.module.css";

// How long a row stays flagged after the header's "posisi kamu" card is
// tapped — same duration the mockup's own flash animation uses.
const HIGHLIGHT_DURATION_MS = 900;

export interface BalanceTabProps {
  readonly balance: GroupBalanceState;
  /** Bumped by GroupDetailScreen whenever the header position card is tapped — the value itself carries no meaning, only its change does. */
  readonly highlightSignal: number;
  readonly onAddExpense: () => void;
}

function EmptyBalance({ onAddExpense }: { readonly onAddExpense: () => void }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.emptyArt} aria-hidden="true">
        🧮
      </div>
      <h2 className={styles.overlayHeading}>{t("group.balance.emptyHeading")}</h2>
      <p className={styles.overlayBody}>{t("group.balance.emptyBody")}</p>
      <Button onClick={onAddExpense}>{t("group.balance.emptyCta")}</Button>
    </div>
  );
}

interface DoneBalanceProps {
  readonly expenseCount: number;
  readonly memberCount: number;
}

// Distinct from EmptyBalance on purpose (CLAUDE.md: "belum ada transaksi"
// and "semua lunas" have to feel different) — this one only shows once at
// least one expense actually calculated and settled to zero, never when
// uncountedExpenseCount hides the real picture (BalanceTab guards that).
function DoneBalance({ expenseCount, memberCount }: DoneBalanceProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.seal} aria-hidden="true">
        ✓
      </div>
      <h2 className={styles.overlayHeading}>{t("group.balance.doneHeading")}</h2>
      <p className={styles.overlayBody}>{t("group.balance.doneBody")}</p>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={`${styles.statNum} bb-numeral`}>{expenseCount}</div>
          <div className={styles.statLabel}>{t("common.expenseCount", { count: expenseCount })}</div>
        </div>
        <div className={styles.stat}>
          <div className={`${styles.statNum} bb-numeral`}>{memberCount}</div>
          <div className={styles.statLabel}>{t("group.balance.donePeopleCount", { count: memberCount })}</div>
        </div>
      </div>
    </div>
  );
}

function UncountedWarning({ count }: { readonly count: number }) {
  return (
    <div className={styles.warning} role="alert">
      <WarnIcon />
      <span>{t("group.balance.uncountedWarning", { count })}</span>
    </div>
  );
}

interface ModeToggleProps {
  readonly mode: SettlementMode;
  readonly onChange: (mode: SettlementMode) => void;
  readonly transferCount: number;
}

// This hint is a count summary ("disederhanakan jadi N transfer"), distinct
// from TransferNetwork's own caption below the diagram (which explains the
// dashed-line convention) — same text in both places would just be noise.
function ModeToggle({ mode, onChange, transferCount }: ModeToggleProps) {
  const hint =
    mode === "simplified"
      ? t("group.balance.hintSimplified", { count: transferCount })
      : t("group.balance.hintDirect", { count: transferCount });
  return (
    <div className={styles.segWrap}>
      <div className={styles.seg} role="group" aria-label={t("group.balance.modeGroupLabel")}>
        <button
          type="button"
          className={mode === "simplified" ? `${styles.segBtn} ${styles.segBtnActive}` : styles.segBtn}
          aria-pressed={mode === "simplified"}
          onClick={() => onChange("simplified")}
        >
          {t("group.balance.modeSimplified")}
        </button>
        <button
          type="button"
          className={mode === "direct" ? `${styles.segBtn} ${styles.segBtnActive}` : styles.segBtn}
          aria-pressed={mode === "direct"}
          onClick={() => onChange("direct")}
        >
          {t("group.balance.modeDirect")}
        </button>
      </div>
      <p className={styles.segHint}>{hint}</p>
    </div>
  );
}

// Starting the flash is done during render ("adjusting state while
// rendering", not an effect) by comparing highlightSignal against the last
// value we've already reacted to — React's own sanctioned pattern for
// deriving state from a changed prop without an effect. Only the auto-clear
// timer is a real effect, since a timer is the one part that's genuinely an
// external system to synchronize with.
function useHighlightedMember(balance: GroupBalanceState, highlightSignal: number): string | undefined {
  const [lastHandledSignal, setLastHandledSignal] = useState(highlightSignal);
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | undefined>(undefined);

  if (highlightSignal !== lastHandledSignal) {
    setLastHandledSignal(highlightSignal);
    setHighlightedMemberId(balance.status === "ready" ? balance.position.memberId : undefined);
  }

  useEffect(() => {
    if (highlightedMemberId === undefined) return;
    const timeoutId = window.setTimeout(() => setHighlightedMemberId(undefined), HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedMemberId]);

  return highlightedMemberId;
}

// Same render-time-adjustment pattern: seed `mode` from the group's own
// settlementMode preference exactly once, the first render where balance is
// ready, without ever needing an effect.
function useSettlementMode(balance: GroupBalanceState): [SettlementMode, (mode: SettlementMode) => void] {
  const [mode, setMode] = useState<SettlementMode>("simplified");
  const [initialized, setInitialized] = useState(false);

  if (!initialized && balance.status === "ready") {
    setInitialized(true);
    setMode(balance.initialMode);
  }

  return [mode, setMode];
}

function ReadyBalance({
  balance,
  highlightedMemberId,
  mode,
  onModeChange,
}: {
  readonly balance: Extract<GroupBalanceState, { status: "ready" }>;
  readonly highlightedMemberId: string | undefined;
  readonly mode: SettlementMode;
  readonly onModeChange: (mode: SettlementMode) => void;
}) {
  const allSettled = balance.uncountedExpenseCount === 0 && balance.rows.length > 0 && balance.rows.every((row) => row.netMinor === 0);
  if (allSettled) {
    return <DoneBalance expenseCount={balance.expenseCount} memberCount={balance.rows.length} />;
  }

  const transfers = mode === "simplified" ? balance.simplifiedTransfers : balance.directTransfers;

  return (
    <>
      {balance.uncountedExpenseCount > 0 ? <UncountedWarning count={balance.uncountedExpenseCount} /> : null}
      <ModeToggle mode={mode} onChange={onModeChange} transferCount={transfers.length} />
      <TransferNetwork
        rows={balance.rows}
        transfers={transfers}
        directTransfers={balance.directTransfers}
        mode={mode}
        currency={balance.currency}
      />
      <div className={styles.sectionLabel}>{t("group.balance.peopleHeading")}</div>
      <BalanceList rows={balance.rows} currency={balance.currency} highlightedMemberId={highlightedMemberId} />
      <div className={styles.sectionLabel}>{t("group.balance.transfersHeading")}</div>
      <SuggestedTransfers
        rows={balance.rows}
        transfers={transfers}
        directTransfers={balance.directTransfers}
        mode={mode}
        currency={balance.currency}
      />
    </>
  );
}

export function BalanceTab({ balance, highlightSignal, onAddExpense }: BalanceTabProps) {
  const highlightedMemberId = useHighlightedMember(balance, highlightSignal);
  const [mode, setMode] = useSettlementMode(balance);

  if (balance.status === "loading") return null;
  if (balance.status === "error") {
    return (
      <LoadFailure
        heading={t("group.error.loadHeading")}
        message={t("group.error.loadMessage")}
        retryLabel={t("system.retry")}
        onRetry={balance.retry}
      />
    );
  }
  if (balance.status === "empty") return <EmptyBalance onAddExpense={onAddExpense} />;

  return <ReadyBalance balance={balance} highlightedMemberId={highlightedMemberId} mode={mode} onModeChange={setMode} />;
}
