import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useNetworkPhase } from "@/shared/system/netBand/useNetworkPhase";

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("useNetworkPhase", () => {
  afterEach(() => {
    setOnline(true);
  });

  it("starts as offline when the browser is already offline", () => {
    setOnline(false);
    const { result } = renderHook(() => useNetworkPhase());
    expect(result.current.phase).toBe("offline");
  });

  it("starts with no band when the browser is online", () => {
    setOnline(true);
    const { result } = renderHook(() => useNetworkPhase());
    expect(result.current.phase).toBeNull();
  });

  it("moves to sync when the browser comes back online after being offline", () => {
    setOnline(false);
    const { result } = renderHook(() => useNetworkPhase());
    expect(result.current.phase).toBe("offline");
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.phase).toBe("sync");
  });

  it("does not move to sync from a coming-online event when nothing was pending", () => {
    setOnline(true);
    const { result } = renderHook(() => useNetworkPhase());
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.phase).toBeNull();
  });

  it("only moves to done via markSynced, never automatically", () => {
    setOnline(false);
    const { result } = renderHook(() => useNetworkPhase());
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.phase).toBe("sync");
    // Nol timer di hook ini — "sync" cuma pindah lewat markSynced() eksplisit.
    act(() => {
      result.current.markSynced();
    });
    expect(result.current.phase).toBe("done");
  });

  it("clears the band via dismiss", () => {
    setOnline(false);
    const { result } = renderHook(() => useNetworkPhase());
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.phase).toBeNull();
  });
});
