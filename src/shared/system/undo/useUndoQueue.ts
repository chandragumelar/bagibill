import { useCallback, useEffect, useRef, useState } from "react";

export interface UndoQueueItem<T> {
  id: string;
  message: string;
  data: T;
}

interface PendingEntry<T> {
  item: UndoQueueItem<T>;
  onRestore: (data: T) => void;
  onCommit: () => void;
}

const UNDO_WINDOW_MS = 6000; // --dur-undo
const TICK_MS = 100; // cukup halus buat cincin, gak terlalu sering render ulang

/**
 * Orkestrasi undo di atas Toast (shared/ui, F0-05): antrean, cincin
 * countdown, tumpuk jadi satu toast. "Pindah layar = komit" BUKAN
 * tanggung jawab hook ini lewat unmount — StrictMode, remount, dan hot
 * reload semuanya unmount tanpa pengguna pindah kemana-mana, dan commit
 * di situ akan menghabiskan kesempatan urungkan diam-diam.
 *
 * Kontrak: pemanggil WAJIB memanggil `commitAll()` sendiri waktu rute
 * berubah (mis. lewat `useLocationPath` dari `src/routes/router`
 * dibandingkan di `useEffect` dengan dependency path).
 *
 * `pendingRef` menyalin `pending` state secara sinkron (bukan cuma baca
 * argumen updater fungsional) supaya dua alasan sekaligus terpenuhi:
 * (1) side effect (onRestore/onCommit) tidak pernah dijalankan di dalam
 * updater setState — StrictMode dev mode memanggilnya dua kali buat cek
 * purity, ketauan manual di /dev/ui: onCommit nembak 2x untuk satu item;
 * (2) closure tidak basi kalau remove()/undoLast() dipanggil berturutan
 * dalam batch render yang sama — pakai `pending` polos dari closure di
 * percobaan sebelumnya bikin panggilan kedua menimpa panggilan pertama.
 */
export function useUndoQueue<T>(windowMs: number = UNDO_WINDOW_MS) {
  const [pending, setPending] = useState<PendingEntry<T>[]>([]);
  const pendingRef = useRef<PendingEntry<T>[]>([]);
  const [remainingMs, setRemainingMs] = useState(windowMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyPending = useCallback((next: PendingEntry<T>[]) => {
    pendingRef.current = next;
    setPending(next);
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const commitAll = useCallback(() => {
    clearTimer();
    pendingRef.current.forEach((entry) => entry.onCommit());
    applyPending([]);
  }, [clearTimer, applyPending]);

  const startTimer = useCallback(() => {
    clearTimer();
    setRemainingMs(windowMs);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, windowMs - (Date.now() - start));
      setRemainingMs(left);
      if (left <= 0) commitAll();
    }, TICK_MS);
  }, [windowMs, clearTimer, commitAll]);

  const remove = useCallback(
    (item: UndoQueueItem<T>, onRestore: (data: T) => void, onCommit: () => void) => {
      applyPending([...pendingRef.current, { item, onRestore, onCommit }]);
      startTimer();
    },
    [startTimer, applyPending],
  );

  const undoLast = useCallback(() => {
    const current = pendingRef.current;
    if (current.length === 0) return;
    const last = current[current.length - 1];
    if (!last) return;
    last.onRestore(last.item.data);
    const next = current.slice(0, -1);
    applyPending(next);
    if (next.length > 0) startTimer();
    else clearTimer();
  }, [startTimer, clearTimer, applyPending]);

  const undoAll = useCallback(() => {
    clearTimer();
    pendingRef.current.forEach((entry) => entry.onRestore(entry.item.data));
    applyPending([]);
  }, [clearTimer, applyPending]);

  // Cuma bersihin handle timer waktu unmount — bukan commit. Item yang
  // masih pending waktu ini kejadian tetap tanggung jawab commitAll()
  // eksplisit dari pemanggil (lihat kontrak di atas).
  useEffect(() => clearTimer, [clearTimer]);

  return {
    items: pending.map((entry) => entry.item),
    remainingSeconds: remainingMs / 1000,
    totalSeconds: windowMs / 1000,
    remove,
    undoLast,
    undoAll,
    commitAll,
  };
}
