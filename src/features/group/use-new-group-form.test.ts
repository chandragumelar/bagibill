import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { db } from "@/lib/storage/schema";
import { groupRepository, memberRepository } from "@/lib/storage/repositories";
import { useNewGroupForm } from "./use-new-group-form";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.groups.clear(), db.members.clear()]);
});

describe("useNewGroupForm", () => {
  it("seeds the draft with the creator as the only member", () => {
    const { result } = renderHook(() => useNewGroupForm());
    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0]?.isCreator).toBe(true);
  });

  it("cannot submit without a name or a template", () => {
    const { result } = renderHook(() => useNewGroupForm());
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setName("Trip Bali 2026"));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setTemplate("trip"));
    expect(result.current.canSubmit).toBe(true);
  });

  it("blocks the normal submit while a similar name is detected, but keepAddingAnyway still adds it", () => {
    const { result } = renderHook(() => useNewGroupForm());
    act(() => result.current.composer.setNameInput("Sarah"));
    act(() => result.current.composer.submit());
    expect(result.current.members).toHaveLength(2);

    act(() => result.current.composer.setNameInput("Sarahh"));
    expect(result.current.composer.similarMatches).toEqual(["Sarah"]);
    act(() => result.current.composer.submit());
    expect(result.current.members).toHaveLength(2); // blocked, not added

    act(() => result.current.composer.keepAddingAnyway());
    expect(result.current.members).toHaveLength(3);
    expect(result.current.members[2]?.name).toBe("Sarahh");
  });

  it("addAsSuggested commits the generic-letter-suffix name instead", () => {
    const { result } = renderHook(() => useNewGroupForm());
    act(() => result.current.composer.setNameInput("Dimas"));
    act(() => result.current.composer.submit());
    act(() => result.current.composer.setNameInput("Dimass"));
    expect(result.current.composer.similarMatches.length).toBeGreaterThan(0);
    const suggested = result.current.composer.suggestedName;
    act(() => result.current.composer.addAsSuggested());
    expect(result.current.members[2]?.name).toBe(suggested);
  });

  it("never removes the creator", () => {
    const { result } = renderHook(() => useNewGroupForm());
    const creatorId = result.current.members[0]?.tempId ?? "";
    act(() => result.current.removeMember(creatorId));
    expect(result.current.members).toHaveLength(1);
  });

  it("creates the group and every drafted member, in order, on submit", async () => {
    const { result } = renderHook(() => useNewGroupForm());
    act(() => result.current.setName("Trip Bali 2026"));
    act(() => result.current.setTemplate("trip"));
    act(() => result.current.composer.setNameInput("Farhan"));
    act(() => result.current.composer.submit());
    act(() => result.current.composer.setNameInput("Sarah"));
    act(() => result.current.composer.submit());

    await act(async () => {
      await result.current.submit();
    });

    const groups = await groupRepository.listGroups();
    expect(groups).toHaveLength(1);
    const group = groups[0];
    expect(group?.name).toBe("Trip Bali 2026");
    expect(group?.baseCurrency).toBe("IDR");

    // listMembers doesn't guarantee order (no sort in member-repository.ts
    // — K-110's own reasoning for why callers sort themselves), and
    // joinedAt ticks can tie within a fast loop, so sort by the palette
    // color instead: K-59 assigns it strictly in submission order, one
    // color per position, so it's an unambiguous stand-in for "the order
    // addMember was actually called in".
    const members = [...(await memberRepository.listMembers(group?.slug ?? ""))].sort(
      (a, b) => Number(a.color.replace("--m-", "")) - Number(b.color.replace("--m-", "")),
    );
    expect(members.map((member) => member.color)).toEqual(["--m-1", "--m-2", "--m-3"]);
    expect(members.map((member) => member.name)).toEqual([result.current.members[0]?.name, "Farhan", "Sarah"]);
  });

  it("is a no-op when submit is called without a template", async () => {
    const { result } = renderHook(() => useNewGroupForm());
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.submitError).toBe(false);
    await waitFor(() => expect(result.current.submitting).toBe(false));
    expect(await groupRepository.listGroups()).toHaveLength(0);
  });
});
