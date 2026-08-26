import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { memberRepository } from "@/lib/storage/repositories";
import { useGroupMembers, type MemberRow } from "./use-group-members";
import { useMemberActions } from "./use-member-actions";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear(), db.settlements.clear()]);
});

async function seedGroup(): Promise<void> {
  const adapter = createDexieAdapter(db);
  await adapter.groups.put({
    slug: "g1",
    name: "Trip Bali",
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
  });
  await adapter.members.put({ memberId: "m1", groupSlug: "g1", name: "Andi", color: "--m-1", joinedAt: 1_000, seq: 0 });
  await adapter.members.put({ memberId: "m2", groupSlug: "g1", name: "Rina", color: "--m-2", joinedAt: 2_000, seq: 0 });
}

function useHarness(slug: string) {
  const state = useGroupMembers(slug);
  const rows: readonly MemberRow[] = state.status === "ready" ? state.rows : [];
  const reload = state.status === "ready" ? state.reload : () => {};
  const actions = useMemberActions(slug, rows, reload);
  return { state, actions };
}

describe("useMemberActions", () => {
  it("adds a new member through the composer", async () => {
    await seedGroup();
    const { result } = renderHook(() => useHarness("g1"));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.addComposer.setNameInput("Budi"));
    act(() => result.current.actions.addComposer.submit());

    await waitFor(async () => {
      const members = await memberRepository.listMembers("g1");
      expect(members.map((member) => member.name)).toContain("Budi");
    });
  });

  it("saves a rename and a deactivate together, and undo reverses the deactivate", async () => {
    await seedGroup();
    const { result } = renderHook(() => useHarness("g1"));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => {
      await result.current.actions.saveEdit("m1", "Andi Wijaya", false);
    });

    const afterSave = await memberRepository.listMembers("g1", { includeInactive: true });
    const renamed = afterSave.find((member) => member.memberId === "m1");
    expect(renamed?.name).toBe("Andi Wijaya");
    expect(renamed?.deactivatedAt).toBeDefined();
    expect(result.current.actions.toast.items).toHaveLength(1);

    act(() => result.current.actions.toast.undoLast());

    await waitFor(async () => {
      const reactivated = await memberRepository.listMembers("g1", { includeInactive: true });
      expect(reactivated.find((member) => member.memberId === "m1")?.deactivatedAt).toBeUndefined();
    });
  });

  it("does not queue an undo toast when re-saving an already-inactive member", async () => {
    await seedGroup();
    await memberRepository.deactivateMember("m1");
    const { result } = renderHook(() => useHarness("g1"));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => {
      await result.current.actions.saveEdit("m1", "Andi", false);
    });
    expect(result.current.actions.toast.items).toHaveLength(0);
  });

  it("routes a member with transactions to the locked target, not the danger target", async () => {
    await seedGroup();
    const { result } = renderHook(() => useHarness("g1"));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.requestDelete("m1", "Andi", 3));
    expect(result.current.actions.lockedTarget).toEqual({ memberId: "m1", name: "Andi", transactionCount: 3 });
    expect(result.current.actions.dangerTarget).toBeUndefined();
  });

  it("routes a member with zero transactions to the danger target", async () => {
    await seedGroup();
    const { result } = renderHook(() => useHarness("g1"));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.requestDelete("m1", "Andi", 0));
    expect(result.current.actions.dangerTarget).toEqual({ memberId: "m1", name: "Andi" });
    expect(result.current.actions.lockedTarget).toBeUndefined();
  });

  it("confirmDelete removes a zero-transaction member for real", async () => {
    await seedGroup();
    const { result } = renderHook(() => useHarness("g1"));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.requestDelete("m1", "Andi", 0));
    await act(async () => {
      await result.current.actions.confirmDelete();
    });

    const members = await memberRepository.listMembers("g1", { includeInactive: true });
    expect(members.find((member) => member.memberId === "m1")).toBeUndefined();
  });

  it("confirmDeactivateFromLocked deactivates and queues undo, without deleting", async () => {
    await seedGroup();
    const { result } = renderHook(() => useHarness("g1"));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.requestDelete("m1", "Andi", 3));
    await act(async () => {
      await result.current.actions.confirmDeactivateFromLocked();
    });

    const members = await memberRepository.listMembers("g1", { includeInactive: true });
    const target = members.find((member) => member.memberId === "m1");
    expect(target).toBeDefined();
    expect(target?.deactivatedAt).toBeDefined();
    expect(result.current.actions.lockedTarget).toBeUndefined();
    expect(result.current.actions.toast.items).toHaveLength(1);
  });
});
