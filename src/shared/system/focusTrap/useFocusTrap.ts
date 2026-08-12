import { useEffect } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Kunci Tab di dalam container selama active — dari trapFocus() di
 * Lapisan_Sistem.html. Dipasang dari luar Sheet (F0-05), bukan mengubah
 * Sheet.tsx: satu-satunya elemen fokusabel di dalam sheet konfirmasi
 * permanen ya cuma yang ada di children ini (tombol tahan-hapus + batal),
 * jadi menjebak di sini setara menjebak seluruh dialog.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;

      // Tanpa filter "kelihatan" (mis. offsetParent) — di jsdom nilainya
      // selalu null (nol layout engine) jadi bikin trap mati total di
      // test, dan pemakaian nyatanya (DangerSheet) tidak pernah
      // menyembunyikan salah satu tombol secara kondisional.
      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, active]);
}
