import type { SplitWarning } from "@bagibill/split-engine";
import { t, formatMoney } from "@/lib/i18n";
import styles from "./AllocationBar.module.css";

const PERCENT_MULTIPLIER = 100;

export interface AllocationBarMember {
  readonly memberId: string;
  readonly color: string;
  readonly shareMinor: number;
}

export type AllocationState =
  | { readonly kind: "exact" }
  | { readonly kind: "under"; readonly remainingMinor: number }
  | { readonly kind: "over"; readonly excessMinor: number };

// Reads the allocation state straight off the engine's own warnings — never
// recomputed from the member amounts, so this can never disagree with what
// the engine will enforce at save time (K-64).
export function resolveAllocationState(warnings: readonly SplitWarning[]): AllocationState {
  const under = warnings.find((warning) => warning.code === "under_allocated");
  if (under?.code === "under_allocated") return { kind: "under", remainingMinor: under.remainingMinor };
  const over = warnings.find((warning) => warning.code === "over_allocated");
  if (over?.code === "over_allocated") return { kind: "over", excessMinor: over.excessMinor };
  return { kind: "exact" };
}

// totalMinor plus/minus the engine's own remaining/excess figure — not a
// re-sum of member amounts. Used only to size the bar (how much of the
// track a segment/hatch covers), never shown as a number on its own.
function allocatedMinorFromState(totalMinor: number, state: AllocationState): number {
  if (state.kind === "under") return totalMinor - state.remainingMinor;
  if (state.kind === "over") return totalMinor + state.excessMinor;
  return totalMinor;
}

const READBOX_ICON: Record<AllocationState["kind"], string> = { exact: "✓", under: "◐", over: "⚠" };

function readboxText(state: AllocationState, currency: string): string {
  if (state.kind === "exact") return t("expense.allocation.exact");
  if (state.kind === "under") {
    return t("expense.warning.underAllocated", { amount: formatMoney(state.remainingMinor, currency) });
  }
  return t("expense.warning.overAllocated", { amount: formatMoney(state.excessMinor, currency) });
}

function readboxClass(kind: AllocationState["kind"]): string {
  if (kind === "exact") return `${styles.readbox} ${styles.readboxExact}`;
  if (kind === "under") return `${styles.readbox} ${styles.readboxUnder}`;
  return `${styles.readbox} ${styles.readboxOver}`;
}

export interface AllocationBarProps {
  readonly members: readonly AllocationBarMember[];
  readonly totalMinor: number;
  readonly currency: string;
  readonly warnings: readonly SplitWarning[];
}

// One horizontal meter for mode Nominal: stacked colored segments (one per
// member, in display order), a vertical line marking the total, and a
// hatched leftover segment when under-allocated. Over-allocation isn't
// clipped — the segments simply run past the target line (spec.md 6.2).
export function AllocationBar({ members, totalMinor, currency, warnings }: AllocationBarProps) {
  const state = resolveAllocationState(warnings);
  const allocatedMinor = allocatedMinorFromState(totalMinor, state);
  const denomMinor = Math.max(totalMinor, allocatedMinor);
  const targetPercent = (totalMinor / denomMinor) * PERCENT_MULTIPLIER;

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        {members
          .filter((member) => member.shareMinor > 0)
          .map((member) => (
            <div
              key={member.memberId}
              className={styles.segment}
              style={{
                width: `${((member.shareMinor / denomMinor) * PERCENT_MULTIPLIER).toFixed(3)}%`,
                background: `var(${member.color})`,
              }}
            />
          ))}
        {state.kind === "under" ? (
          <div
            className={styles.hatch}
            style={{ width: `${((state.remainingMinor / denomMinor) * PERCENT_MULTIPLIER).toFixed(3)}%` }}
          />
        ) : null}
        <div className={styles.target} style={{ left: `${targetPercent.toFixed(3)}%` }} />
      </div>
      <div className={readboxClass(state.kind)} role="status">
        <span aria-hidden="true">{READBOX_ICON[state.kind]}</span>
        <span>{readboxText(state, currency)}</span>
      </div>
    </div>
  );
}
