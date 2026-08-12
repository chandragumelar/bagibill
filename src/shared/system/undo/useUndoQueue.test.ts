import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUndoQueue, type UndoQueueItem } from "@/shared/system/undo/useUndoQueue";

interface Expense {
  title: string;
}

function makeItem(id: string): UndoQueueItem<Expense> {
  return { id, message: `"${id}" dihapus`, data: { title: id } };
}

describe("useUndoQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useUndoQueue<Expense>());
    expect(result.current.items).toHaveLength(0);
  });

  it("adds an item to the queue on remove()", () => {
    const { result } = renderHook(() => useUndoQueue<Expense>());
    act(() => {
      result.current.remove(makeItem("Sate Padang"), vi.fn(), vi.fn());
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.message).toBe('"Sate Padang" dihapus');
  });

  it("counts down remainingSeconds after remove()", () => {
    const { result } = renderHook(() => useUndoQueue<Expense>(6000));
    act(() => {
      result.current.remove(makeItem("Sate Padang"), vi.fn(), vi.fn());
    });
    expect(result.current.remainingSeconds).toBe(6);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.remainingSeconds).toBeCloseTo(4, 0);
  });

  it("calls onRestore and removes the item when undoLast() is called", () => {
    const onRestore = vi.fn();
    const onCommit = vi.fn();
    const { result } = renderHook(() => useUndoQueue<Expense>());
    act(() => {
      result.current.remove(makeItem("Sate Padang"), onRestore, onCommit);
    });
    act(() => {
      result.current.undoLast();
    });
    expect(onRestore).toHaveBeenCalledWith({ title: "Sate Padang" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
  });

  it("stacks a second deletion into the same queue and resets the timer", () => {
    const { result } = renderHook(() => useUndoQueue<Expense>(6000));
    act(() => {
      result.current.remove(makeItem("Sate Padang"), vi.fn(), vi.fn());
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.remainingSeconds).toBeCloseTo(2, 0);
    act(() => {
      result.current.remove(makeItem("Kopi Kenangan"), vi.fn(), vi.fn());
    });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.remainingSeconds).toBe(6);
  });

  it("undoAll restores every pending item in order and clears the queue", () => {
    const restoreA = vi.fn();
    const restoreB = vi.fn();
    const { result } = renderHook(() => useUndoQueue<Expense>());
    act(() => {
      result.current.remove(makeItem("A"), restoreA, vi.fn());
      result.current.remove(makeItem("B"), restoreB, vi.fn());
    });
    act(() => {
      result.current.undoAll();
    });
    expect(restoreA).toHaveBeenCalledOnce();
    expect(restoreB).toHaveBeenCalledOnce();
    expect(result.current.items).toHaveLength(0);
  });

  it("commits automatically once the window elapses", () => {
    const onRestore = vi.fn();
    const onCommit = vi.fn();
    const { result } = renderHook(() => useUndoQueue<Expense>(6000));
    act(() => {
      result.current.remove(makeItem("Sate Padang"), onRestore, onCommit);
    });
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onRestore).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
  });

  it("commitAll commits every pending item immediately without restoring", () => {
    const commitA = vi.fn();
    const commitB = vi.fn();
    const { result } = renderHook(() => useUndoQueue<Expense>());
    act(() => {
      result.current.remove(makeItem("A"), vi.fn(), commitA);
      result.current.remove(makeItem("B"), vi.fn(), commitB);
    });
    act(() => {
      result.current.commitAll();
    });
    expect(commitA).toHaveBeenCalledOnce();
    expect(commitB).toHaveBeenCalledOnce();
    expect(result.current.items).toHaveLength(0);
  });

  it("does not commit pending items on unmount — only commitAll() does", () => {
    const onCommit = vi.fn();
    const { result, unmount } = renderHook(() => useUndoQueue<Expense>());
    act(() => {
      result.current.remove(makeItem("Sate Padang"), vi.fn(), onCommit);
    });
    unmount();
    expect(onCommit).not.toHaveBeenCalled();
  });

  // StrictMode (dev) memanggil updater fungsional setState dua kali buat cek
  // purity. Kalau onCommit/onRestore pernah balik dipanggil di dalam
  // updater, ini bakal nembak dua kali per item — ketauan manual pas
  // dites di /dev/ui (K-23).
  it("under StrictMode, commits each pending item exactly once via the auto-commit timeout", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useUndoQueue<Expense>(6000), { wrapper: StrictMode });
    act(() => {
      result.current.remove(makeItem("Sate Padang"), vi.fn(), onCommit);
    });
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("under StrictMode, undoLast restores exactly once", () => {
    const onRestore = vi.fn();
    const { result } = renderHook(() => useUndoQueue<Expense>(), { wrapper: StrictMode });
    act(() => {
      result.current.remove(makeItem("Sate Padang"), onRestore, vi.fn());
    });
    act(() => {
      result.current.undoLast();
    });
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("under StrictMode, commitAll commits exactly once per item", () => {
    const commitA = vi.fn();
    const commitB = vi.fn();
    const { result } = renderHook(() => useUndoQueue<Expense>(), { wrapper: StrictMode });
    act(() => {
      result.current.remove(makeItem("A"), vi.fn(), commitA);
      result.current.remove(makeItem("B"), vi.fn(), commitB);
    });
    act(() => {
      result.current.commitAll();
    });
    expect(commitA).toHaveBeenCalledOnce();
    expect(commitB).toHaveBeenCalledOnce();
  });
});
