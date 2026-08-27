import { useEffect, useState } from "react";
import { computeGroupBalanceState } from "@/features/settle";
import { expenseRepository, groupRepository, memberRepository, settlementRepository } from "@/lib/storage/repositories";
import type { GroupRecord, MemberRecord } from "@/lib/storage/records";
import type { AvatarStackMember } from "@/shared/ui/AvatarStack/AvatarStack";

export interface HomeGroupViewModel {
  readonly slug: string;
  readonly name: string;
  readonly currency: string;
  readonly memberCount: number;
  readonly avatarMembers: readonly AvatarStackMember[];
  /** My position in this group — same computeGroupBalanceState the Saldo tab renders from, never recomputed by hand (plan.md F3-10 done-criteria). */
  readonly netMinor: number;
  readonly expenseCount: number;
  /** False when the group has never had an expense or settlement — distinct from netMinor === 0, which can also mean "already settled up". */
  readonly hasTransactions: boolean;
}

export type HomeGroupsState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly retry: () => void }
  | { readonly status: "ready"; readonly groups: readonly HomeGroupViewModel[] };

// Same first+last convention as BalanceList.tsx/use-group-detail.ts/IdentityPicker.tsx
// (group-member-helpers.ts's dev-note tracks the 3-word mockup case those
// three miss — out of scope to fix here too).
function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

// Header avatar stacks only ever show who's actually still around — an
// inactive member hasn't vanished from the group's history (their balance
// still counts, see group-balance.ts), but they're not part of "who's in
// this group" at a glance.
function activeMembers(members: readonly MemberRecord[]): readonly MemberRecord[] {
  return members.filter((member) => member.deactivatedAt === undefined);
}

async function loadGroupViewModel(group: GroupRecord): Promise<HomeGroupViewModel> {
  const [members, expenses, settlements] = await Promise.all([
    memberRepository.listMembers(group.slug, { includeInactive: true }),
    expenseRepository.listExpensesByGroup(group.slug),
    settlementRepository.listSettlementsByGroup(group.slug),
  ]);
  const balance = computeGroupBalanceState(group, members, expenses, settlements, () => {});
  const active = activeMembers(members);

  return {
    slug: group.slug,
    name: group.name,
    currency: group.baseCurrency,
    memberCount: active.length,
    avatarMembers: active.map((member) => ({
      key: member.memberId,
      initials: initialsFromName(member.name),
      color: `var(${member.color})`,
    })),
    netMinor: balance.status === "ready" ? balance.position.netMinor : 0,
    expenseCount: balance.status === "ready" ? balance.expenseCount : 0,
    hasTransactions: balance.status === "ready",
  };
}

// Beranda needs every group's position at once, unlike useGroupBalance
// (settle/index.ts) which is scoped to one group's Saldo tab — this loads
// group+members+expenses+settlements per group, same shape as that hook's
// own load, and feeds each through the identical computeGroupBalanceState
// so a card's number can never drift from what the tab shows for the same
// group (plan.md F3-10 done-criteria).
export function useHomeGroups(): HomeGroupsState {
  const [state, setState] = useState<HomeGroupsState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const groups = await groupRepository.listGroups();
        const viewModels = await Promise.all(groups.map(loadGroupViewModel));
        if (cancelled) return;
        setState({ status: "ready", groups: viewModels });
      } catch {
        if (cancelled) return;
        setState({ status: "error", retry: reload });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return state;
}
