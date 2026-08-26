import { useEffect, useState } from "react";
import { expenseRepository, groupRepository, memberRepository, settlementRepository } from "@/lib/storage/repositories";
import type { GroupRecord, MemberRecord } from "@/lib/storage/records";
import { memberTransactionCount } from "./group-member-helpers";

export interface MemberRow {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
  readonly active: boolean;
  readonly transactionCount: number;
}

export type GroupMembersState =
  | { readonly status: "loading" }
  | { readonly status: "not-found" }
  | { readonly status: "error"; readonly retry: () => void }
  | {
      readonly status: "ready";
      readonly group: GroupRecord;
      readonly rows: readonly MemberRow[];
      readonly reload: () => void;
    };

// Same canonical order as F3-07's balance tab (K-110): joinedAt then
// memberId, so this list and any other member-ordered screen agree.
function sortByJoinOrder(members: readonly MemberRecord[]): readonly MemberRecord[] {
  return [...members].sort((a, b) => a.joinedAt - b.joinedAt || a.memberId.localeCompare(b.memberId));
}

interface LoadedState {
  readonly slug: string;
  readonly state: GroupMembersState;
}

export function useGroupMembers(slug: string): GroupMembersState {
  const [loaded, setLoaded] = useState<LoadedState>({ slug, state: { status: "loading" } });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const group = await groupRepository.getGroupBySlug(slug);
        if (cancelled) return;
        if (group === undefined) {
          setLoaded({ slug, state: { status: "not-found" } });
          return;
        }
        const [members, expenses, settlements] = await Promise.all([
          memberRepository.listMembers(slug, { includeInactive: true }),
          expenseRepository.listExpensesByGroup(slug),
          settlementRepository.listSettlementsByGroup(slug),
        ]);
        if (cancelled) return;
        const rows: readonly MemberRow[] = sortByJoinOrder(members).map((member) => ({
          memberId: member.memberId,
          name: member.name,
          color: member.color,
          active: member.deactivatedAt === undefined,
          transactionCount: memberTransactionCount(member.memberId, expenses, settlements),
        }));
        setLoaded({ slug, state: { status: "ready", group, rows, reload: () => setReloadToken((token) => token + 1) } });
      } catch {
        if (cancelled) return;
        setLoaded({ slug, state: { status: "error", retry: () => setReloadToken((token) => token + 1) } });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, reloadToken]);

  return loaded.slug === slug ? loaded.state : { status: "loading" };
}
