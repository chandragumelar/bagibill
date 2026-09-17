import { useEffect, useState } from "react";
import { expenseRepository, groupRepository, memberRepository, settlementRepository } from "@/lib/storage/repositories";
import { computeGroupBalanceState, type GroupBalanceState } from "./group-balance";

export type {
  BalanceMemberRow,
  ComputedGroupBalance,
  CurrentMemberPosition,
  GroupBalanceState,
  SettlementMode,
} from "./group-balance";

interface LoadedState {
  readonly slug: string;
  readonly state: GroupBalanceState;
}

// Loads group + members (including inactive) + expenses + settlements
// straight from storage, same as use-group-detail.ts's independent load —
// features/settle and features/group each own their own read rather than
// sharing state across a feature boundary. Local reads don't get a spinner
// (F0-07); the "loading" status is just "nothing to render yet". The actual
// balance math lives in group-balance.ts's computeGroupBalanceState — this
// hook is just that function wired to storage and re-fetchable.
export function useGroupBalance(slug: string, refreshSignal: number = 0): GroupBalanceState {
  const [loaded, setLoaded] = useState<LoadedState>({ slug, state: { status: "loading" } });
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const group = await groupRepository.getGroupBySlug(slug);
        if (cancelled) return;
        if (group === undefined) {
          setLoaded({ slug, state: { status: "empty" } });
          return;
        }
        const [members, expenses, settlements] = await Promise.all([
          memberRepository.listMembers(slug, { includeInactive: true }),
          expenseRepository.listExpensesByGroup(slug),
          settlementRepository.listSettlementsByGroup(slug),
        ]);
        if (cancelled) return;
        setLoaded({ slug, state: computeGroupBalanceState(group, members, expenses, settlements, reload) });
      } catch {
        if (cancelled) return;
        setLoaded({ slug, state: { status: "error", retry: reload } });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, reloadToken, refreshSignal]);

  return loaded.slug === slug ? loaded.state : { status: "loading" };
}
