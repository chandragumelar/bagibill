import { describe, expect, it } from "vitest";
import { findSimilarMembers, normalizeMemberName } from "./member-name";
import type { MemberRecord } from "./records";

function makeMember(name: string): MemberRecord {
  return {
    memberId: `id-${name}`,
    groupSlug: "group-1",
    name,
    color: "--m-1",
    joinedAt: 0,
    seq: 0,
  };
}

describe("normalizeMemberName", () => {
  it("trims and collapses repeated whitespace", () => {
    expect(normalizeMemberName("  Dimas   Prasetyo  ")).toBe("dimas prasetyo");
  });

  it("lowercases", () => {
    expect(normalizeMemberName("DIMAS")).toBe("dimas");
  });

  it("strips diacritics", () => {
    expect(normalizeMemberName("José")).toBe("jose");
  });

  it("treats 'dimas', 'Dimas ', and 'DIMAS' as the same normalized form", () => {
    const forms = new Set(["dimas", "Dimas ", "DIMAS"].map(normalizeMemberName));
    expect(forms.size).toBe(1);
  });
});

describe("findSimilarMembers", () => {
  it("flags an exact match after normalization", () => {
    const existing = [makeMember("Dimas")];
    expect(findSimilarMembers("dimas", existing)).toEqual(existing);
  });

  it("flags a name one edit away as similar", () => {
    const existing = [makeMember("Dimas")];
    expect(findSimilarMembers("Dimass", existing)).toEqual(existing);
  });

  it("does not flag a name two edits away", () => {
    const existing = [makeMember("Dimas")];
    expect(findSimilarMembers("Dimasss", existing)).toEqual([]);
  });

  it("does not let a short two-letter name drag in unrelated members", () => {
    const existing = [makeMember("Dimas"), makeMember("Budi"), makeMember("Citra")];
    expect(findSimilarMembers("Al", existing)).toEqual([]);
  });

  it("returns empty for an empty existing list", () => {
    expect(findSimilarMembers("Dimas", [])).toEqual([]);
  });

  it("has no side effects on the existing list", () => {
    const existing = [makeMember("Dimas")];
    const snapshot = [...existing];
    findSimilarMembers("Dimass", existing);
    expect(existing).toEqual(snapshot);
  });
});
