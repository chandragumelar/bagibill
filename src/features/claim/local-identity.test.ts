import { afterEach, describe, expect, it, vi } from "vitest";
import { getClaimIdentity, saveClaimIdentity } from "./local-identity";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("local-identity", () => {
  it("saves and reads back an identity for one slug", () => {
    expect(saveClaimIdentity("trip-bali", "m1")).toBe(true);
    expect(getClaimIdentity("trip-bali")).toBe("m1");
  });

  it("returns undefined for a slug that never had an identity saved", () => {
    expect(getClaimIdentity("no-such-slug")).toBeUndefined();
  });

  it("keeps two slugs from overwriting each other", () => {
    saveClaimIdentity("trip-bali", "m1");
    saveClaimIdentity("kopdar-bandung", "m9");

    expect(getClaimIdentity("trip-bali")).toBe("m1");
    expect(getClaimIdentity("kopdar-bandung")).toBe("m9");
  });

  it("returns false instead of throwing when storage rejects the write (e.g. private browsing)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(saveClaimIdentity("trip-bali", "m1")).toBe(false);
  });

  it("returns undefined instead of throwing when storage rejects the read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(getClaimIdentity("trip-bali")).toBeUndefined();
  });
});
