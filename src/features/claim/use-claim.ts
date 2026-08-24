import { useCallback, useEffect, useRef, useState } from "react";
import { resolveMemberOrder } from "@/lib/storage/expense-mapping";
import { expenseRepository, groupRepository, memberRepository } from "@/lib/storage/repositories";
import type { ExpenseRecord, GroupRecord, MemberRecord } from "@/lib/storage/records";
import { claimItem, unclaimItem } from "./claim-actions";
import { getClaimIdentity, saveClaimIdentity } from "./local-identity";

export interface ClaimParticipant {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
}

export type ClaimState =
  | { readonly status: "loading" }
  | { readonly status: "invalid" }
  | { readonly status: "error"; readonly retry: () => void }
  | {
      readonly status: "ready";
      readonly group: GroupRecord;
      readonly expense: ExpenseRecord;
      readonly participants: readonly ClaimParticipant[];
      readonly currentMemberId: string | undefined;
      readonly saveError: boolean;
      readonly identityError: boolean;
    };

function resolveParticipants(expense: ExpenseRecord, members: readonly MemberRecord[]): readonly ClaimParticipant[] {
  const byId = new Map(members.map((member) => [member.memberId, member]));
  return resolveMemberOrder(expense.splitData)
    .map((memberId) => byId.get(memberId))
    .filter((member): member is MemberRecord => member !== undefined)
    .map((member) => ({ memberId: member.memberId, name: member.name, color: member.color }));
}

interface LoadedReady {
  readonly group: GroupRecord;
  readonly expense: ExpenseRecord;
  readonly participants: readonly ClaimParticipant[];
}

type Loaded = { readonly kind: "invalid" } | { readonly kind: "error" } | { readonly kind: "ready"; readonly value: LoadedReady };

async function load(slug: string, expenseId: string): Promise<Loaded> {
  const group = await groupRepository.getGroupBySlug(slug);
  if (group === undefined) return { kind: "invalid" };

  const expense = await expenseRepository.getExpense(expenseId);
  if (expense === undefined || expense.groupSlug !== slug) return { kind: "invalid" };
  if (expense.splitData.mode !== "byItems" || expense.items.length === 0) return { kind: "invalid" };

  const members = await memberRepository.listMembers(slug, { includeInactive: true });
  const participants = resolveParticipants(expense, members);
  return { kind: "ready", value: { group, expense, participants } };
}

export interface UseClaimResult {
  readonly state: ClaimState;
  readonly pickIdentity: (memberId: string) => void;
  readonly addIdentity: (name: string) => Promise<void>;
  readonly claim: (itemId: string) => Promise<void>;
  readonly unclaim: (itemId: string) => Promise<void>;
  readonly retrySave: () => void;
}

interface LoadedState {
  readonly slug: string;
  readonly expenseId: string;
  readonly result: Loaded;
}

type ItemsBuilder = (items: ExpenseRecord["items"]) => ExpenseRecord["items"];

// Local reads never get a spinner (F0-07) — "loading" just means there's
// nothing to render yet, not a skeleton. Storage failures and a broken
// link get two different honest states instead of one blank screen.
export function useClaim(slug: string, expenseId: string): UseClaimResult {
  const [loaded, setLoaded] = useState<LoadedState | undefined>(undefined);
  const [reloadToken, setReloadToken] = useState(0);
  const [currentMemberId, setCurrentMemberId] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState(false);
  const [identityError, setIdentityError] = useState(false);
  const lastFailedBuildRef = useRef<ItemsBuilder | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const result = await load(slug, expenseId);
        if (cancelled) return;
        setLoaded({ slug, expenseId, result });
        if (result.kind === "ready") {
          const saved = getClaimIdentity(slug);
          const isParticipant = result.value.participants.some((participant) => participant.memberId === saved);
          setCurrentMemberId(isParticipant ? saved : undefined);
        }
      } catch {
        if (cancelled) return;
        setLoaded({ slug, expenseId, result: { kind: "error" } });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [slug, expenseId, reloadToken]);

  // Falls back to "loading" whenever the slug/expenseId being rendered
  // hasn't finished its own load yet — same guard use-group-detail.ts uses,
  // so nothing here ever calls setState synchronously inside the effect.
  const current = loaded !== undefined && loaded.slug === slug && loaded.expenseId === expenseId ? loaded.result : undefined;

  const runMutation = useCallback(
    async (build: ItemsBuilder) => {
      if (current === undefined || current.kind !== "ready") return;
      const newItems = build(current.value.expense.items);
      try {
        const updatedExpense = await expenseRepository.updateExpense(current.value.expense.expenseId, { items: newItems });
        setLoaded({ slug, expenseId, result: { kind: "ready", value: { ...current.value, expense: updatedExpense } } });
        setSaveError(false);
        lastFailedBuildRef.current = undefined;
      } catch {
        setSaveError(true);
        lastFailedBuildRef.current = build;
      }
    },
    [current, slug, expenseId],
  );

  const claim = useCallback(
    async (itemId: string) => {
      if (currentMemberId === undefined) return;
      await runMutation((items) => claimItem(items, itemId, currentMemberId));
    },
    [currentMemberId, runMutation],
  );

  const unclaim = useCallback(
    async (itemId: string) => {
      if (currentMemberId === undefined) return;
      await runMutation((items) => unclaimItem(items, itemId, currentMemberId));
    },
    [currentMemberId, runMutation],
  );

  const pickIdentity = useCallback(
    (memberId: string) => {
      const saved = saveClaimIdentity(slug, memberId);
      setIdentityError(!saved);
      if (saved) setCurrentMemberId(memberId);
    },
    [slug],
  );

  const addIdentity = useCallback(
    async (name: string) => {
      if (current === undefined || current.kind !== "ready") return;
      try {
        const newMember = await memberRepository.addMember({ groupSlug: slug, name });
        const splitData = current.value.expense.splitData;
        if (splitData.mode !== "byItems") return;
        const updatedExpense = await expenseRepository.updateExpense(current.value.expense.expenseId, {
          splitData: { mode: "byItems", memberIds: [...splitData.memberIds, newMember.memberId] },
        });
        const participants = [...current.value.participants, { memberId: newMember.memberId, name: newMember.name, color: newMember.color }];
        setLoaded({ slug, expenseId, result: { kind: "ready", value: { group: current.value.group, expense: updatedExpense, participants } } });
        pickIdentity(newMember.memberId);
      } catch {
        setIdentityError(true);
      }
    },
    [current, slug, expenseId, pickIdentity],
  );

  const retrySave = useCallback(() => {
    const build = lastFailedBuildRef.current;
    if (build !== undefined) void runMutation(build);
  }, [runMutation]);

  if (current === undefined) return { state: { status: "loading" }, pickIdentity, addIdentity, claim, unclaim, retrySave };
  if (current.kind === "invalid") return { state: { status: "invalid" }, pickIdentity, addIdentity, claim, unclaim, retrySave };
  if (current.kind === "error") {
    return {
      state: { status: "error", retry: () => setReloadToken((token) => token + 1) },
      pickIdentity,
      addIdentity,
      claim,
      unclaim,
      retrySave,
    };
  }

  return {
    state: {
      status: "ready",
      group: current.value.group,
      expense: current.value.expense,
      participants: current.value.participants,
      currentMemberId,
      saveError,
      identityError,
    },
    pickIdentity,
    addIdentity,
    claim,
    unclaim,
    retrySave,
  };
}
