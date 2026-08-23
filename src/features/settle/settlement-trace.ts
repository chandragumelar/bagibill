import type { ExpenseLedger, Transfer } from "@bagibill/split-engine";

// Where one ExpenseLedger fed into computeGroupBalances actually came from —
// built once in use-group-balance.ts, alongside the ledger array itself, so
// a contribution traced back through the engine can point at a real
// transaction instead of a bare number. A settlement is never disguised as
// an expense here (spec.md, plan.md F3-07): the two kinds carry different
// fields and the sheet renders them differently.
export type LedgerOrigin =
  | { readonly kind: "expense"; readonly expenseId: string; readonly title: string; readonly date: number }
  | {
      readonly kind: "settlement";
      readonly settlementId: string;
      readonly date: number;
      readonly fromMemberId: string;
      readonly toMemberId: string;
      readonly note?: string;
    };

export interface MemberContribution {
  readonly origin: LedgerOrigin;
  /** Signed: paid minus share for this ledger. Positive = this member is owed by this ledger, negative = they owe it. */
  readonly amountMinor: number;
}

function requireIndexedNumber(values: readonly number[], index: number, label: string): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`traceMemberBalance: missing ${label} at index ${index}`);
  }
  return value;
}

function requireIndexedOrigin(origins: readonly LedgerOrigin[], index: number): LedgerOrigin {
  const origin = origins[index];
  if (origin === undefined) {
    throw new Error(`traceMemberBalance: missing origin at index ${index}`);
  }
  return origin;
}

// One member's net balance, decomposed back into the ledgers that produced
// it. `ledgers` and `origins` must be the exact same arrays (same order,
// same length) use-group-balance.ts fed into computeGroupBalances — that
// pairing is the contract, not re-derived here. A ledger this member wasn't
// part of nets to zero and is dropped, since a zero contribution explains
// nothing.
export function traceMemberBalance(
  participantIndex: number,
  ledgers: readonly ExpenseLedger[],
  origins: readonly LedgerOrigin[],
): readonly MemberContribution[] {
  if (ledgers.length !== origins.length) {
    throw new Error(
      `traceMemberBalance: ledgers length ${ledgers.length} does not match origins length ${origins.length}`,
    );
  }
  const contributions: MemberContribution[] = [];
  ledgers.forEach((ledger, index) => {
    const paidMinor = requireIndexedNumber(ledger.paymentsMinor, participantIndex, "paymentsMinor");
    const shareMinor = requireIndexedNumber(ledger.sharesMinor, participantIndex, "sharesMinor");
    const amountMinor = paidMinor - shareMinor;
    if (amountMinor === 0) return;
    contributions.push({ origin: requireIndexedOrigin(origins, index), amountMinor });
  });
  return contributions;
}

export interface TransferChainSegment {
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly amountMinor: number;
}

export interface TransferChain {
  readonly segments: readonly TransferChainSegment[];
  readonly amountMinor: number;
}

export type TransferExplanationKind = "direct" | "chained" | "partial";

export interface TransferExplanation {
  readonly kind: TransferExplanationKind;
  readonly chains: readonly TransferChain[];
  readonly explainedMinor: number;
  readonly unexplainedMinor: number;
}

// A chain longer than this isn't legible to someone reading the sheet
// anyway (spec: "batasi panjang lintasan ... dengan konstanta bernama").
// Reaching it makes the remainder honestly "partial", never a silent stop.
export const MAX_TRACE_PATH_LENGTH = 6;

type ResidualGraph = Map<number, Map<number, number>>;

function buildResidualGraph(pairwiseTransfers: readonly Transfer[]): ResidualGraph {
  const graph: ResidualGraph = new Map();
  for (const transfer of pairwiseTransfers) {
    const neighbors = graph.get(transfer.fromIndex) ?? new Map<number, number>();
    neighbors.set(transfer.toIndex, (neighbors.get(transfer.toIndex) ?? 0) + transfer.amountMinor);
    graph.set(transfer.fromIndex, neighbors);
  }
  return graph;
}

function buildPath(parent: ReadonlyMap<number, number>, from: number, to: number): readonly number[] {
  const path = [to];
  let node = to;
  while (node !== from) {
    const previous = parent.get(node);
    if (previous === undefined) {
      throw new Error("traceTransfer: internal error, broken path reconstruction");
    }
    path.push(previous);
    node = previous;
  }
  return path.reverse();
}

// BFS with neighbors visited in ascending participant-index order (K-24) —
// the same graph always yields the same shortest path, so two runs on the
// same input never disagree about which chain explains a transfer first.
function findShortestPath(graph: ResidualGraph, from: number, to: number): readonly number[] | undefined {
  if (from === to) return undefined;
  const queue: number[] = [from];
  const visited = new Set<number>([from]);
  const depth = new Map<number, number>([[from, 0]]);
  const parent = new Map<number, number>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    const currentDepth = depth.get(current) ?? 0;
    if (currentDepth >= MAX_TRACE_PATH_LENGTH) continue;
    const neighbors = graph.get(current);
    if (neighbors === undefined) continue;
    const targets = [...neighbors.keys()].sort((a, b) => a - b);
    for (const next of targets) {
      if (visited.has(next) || (neighbors.get(next) ?? 0) <= 0) continue;
      visited.add(next);
      parent.set(next, current);
      if (next === to) return buildPath(parent, from, to);
      depth.set(next, currentDepth + 1);
      queue.push(next);
    }
  }
  return undefined;
}

function pathBottleneck(graph: ResidualGraph, path: readonly number[]): number {
  let bottleneck = Number.POSITIVE_INFINITY;
  for (let index = 0; index < path.length - 1; index++) {
    const from = requireIndexedNumber(path, index, "path");
    const to = requireIndexedNumber(path, index + 1, "path");
    const capacity = graph.get(from)?.get(to) ?? 0;
    bottleneck = Math.min(bottleneck, capacity);
  }
  return bottleneck;
}

function buildSegments(path: readonly number[], amountMinor: number): readonly TransferChainSegment[] {
  const segments: TransferChainSegment[] = [];
  for (let index = 0; index < path.length - 1; index++) {
    segments.push({
      fromIndex: requireIndexedNumber(path, index, "path"),
      toIndex: requireIndexedNumber(path, index + 1, "path"),
      amountMinor,
    });
  }
  return segments;
}

function deductFlow(graph: ResidualGraph, path: readonly number[], amountMinor: number): void {
  for (let index = 0; index < path.length - 1; index++) {
    const from = requireIndexedNumber(path, index, "path");
    const to = requireIndexedNumber(path, index + 1, "path");
    const neighbors = graph.get(from);
    if (neighbors === undefined) continue;
    const remaining = (neighbors.get(to) ?? 0) - amountMinor;
    if (remaining > 0) neighbors.set(to, remaining);
    else neighbors.delete(to);
  }
}

function classify(chains: readonly TransferChain[], unexplainedMinor: number): TransferExplanationKind {
  if (unexplainedMinor > 0) return "partial";
  const onlyChain = chains.length === 1 ? chains[0] : undefined;
  if (onlyChain !== undefined && onlyChain.segments.length === 1) return "direct";
  return "chained";
}

// Explains a suggested transfer (Ringkas mode can route A->C through people
// A never actually owed) by repeatedly finding the shortest still-open path
// from A to C in the pairwise debt graph and saturating it — spec.md /
// plan.md's greedy-then-record-then-repeat algorithm. Never invents a chain:
// once no path remains, whatever is left of the transfer is reported as
// unexplainedMinor instead of being papered over (K-decision, progress.md).
export function traceTransfer(transfer: Transfer, pairwiseTransfers: readonly Transfer[]): TransferExplanation {
  const graph = buildResidualGraph(pairwiseTransfers);
  const chains: TransferChain[] = [];
  let remainingMinor = transfer.amountMinor;

  while (remainingMinor > 0) {
    const path = findShortestPath(graph, transfer.fromIndex, transfer.toIndex);
    if (path === undefined) break;
    const flowMinor = Math.min(pathBottleneck(graph, path), remainingMinor);
    chains.push({ segments: buildSegments(path, flowMinor), amountMinor: flowMinor });
    deductFlow(graph, path, flowMinor);
    remainingMinor -= flowMinor;
  }

  const explainedMinor = transfer.amountMinor - remainingMinor;
  return { kind: classify(chains, remainingMinor), chains, explainedMinor, unexplainedMinor: remainingMinor };
}
