import { computeGroupBalances } from "../balance/compute-balances";
import type { ExpenseLedger } from "../balance/balance.types";
import type { SplitWarning } from "../modes/split-result";
import { computeSettlement } from "../settlement/compute-settlement";
import type { Transfer } from "../settlement/settlement.types";

// spec.md 24: groups over this size are fully supported, but Simplify's
// minimized transfer list gets harder to make sense of at this scale — a
// warning, not a rejection.
const LARGE_GROUP_SIMPLIFY_THRESHOLD = 50;

export interface GroupCalculation {
  readonly netMinor: readonly number[];
  readonly transfers: readonly Transfer[];
  readonly pairwiseTransfers: readonly Transfer[];
  readonly warnings: readonly SplitWarning[];
}

export function calculateGroupBalances(input: {
  participantCount: number;
  expenses: readonly ExpenseLedger[];
  settlementMode: "direct" | "simplified";
}): GroupCalculation {
  const { participantCount, expenses, settlementMode } = input;
  const groupBalance = computeGroupBalances({ participantCount, expenses });
  const settlement = computeSettlement({ participantCount, expenses, mode: settlementMode });

  return {
    netMinor: groupBalance.netMinor,
    transfers: settlement.transfers,
    pairwiseTransfers: settlement.pairwiseTransfers,
    warnings: buildWarnings(participantCount, settlementMode),
  };
}

function buildWarnings(participantCount: number, settlementMode: "direct" | "simplified"): SplitWarning[] {
  if (settlementMode === "simplified" && participantCount > LARGE_GROUP_SIMPLIFY_THRESHOLD) {
    return [{ code: "large_group_simplify", participantCount }];
  }
  return [];
}
