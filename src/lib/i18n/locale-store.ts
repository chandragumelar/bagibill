import type { Locale } from "@/lib/i18n/types";

const STORAGE_KEY = "bagibill:locale";

/**
 * Belum ada layar pemilihan bahasa (itu tugas F3). Sebelum ada override
 * tersimpan, navigator.language dipakai sebagai tebakan awal, sama seperti
 * yang spec.md 22 bilang dipakai buat nyorot pilihan duluan di layar itu.
 */
export function detectDefaultLocale(): Locale {
  const lang = typeof navigator !== "undefined" ? navigator.language : "";
  return lang.toLowerCase().startsWith("id") ? "id" : "en";
}

function readStoredLocale(): Locale | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "id" || raw === "en" ? raw : null;
}

let currentLocale: Locale = readStoredLocale() ?? detectDefaultLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return currentLocale;
}

/** Ganti bahasa, tersimpan per device, berlaku seketika tanpa reload. */
export function setLocale(locale: Locale): void {
  // Selalu ditulis, walau kebetulan sama dengan currentLocale sekarang —
  // currentLocale bisa saja hasil tebakan navigator.language yang belum
  // pernah benar-benar tersimpan. Yang di-skip cuma notifikasi listener,
  // biar nggak render ulang tanpa perubahan.
  const changed = locale !== currentLocale;
  currentLocale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  if (changed) {
    listeners.forEach((listener) => {
      listener();
    });
  }
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
