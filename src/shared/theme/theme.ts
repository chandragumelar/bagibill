export type ThemeOverride = "light" | "dark";

/**
 * Kunci localStorage. Nilainya harus sama persis dengan literal di
 * inline bootstrap script index.html — script itu jalan sebelum modul
 * ES manapun ke-load, jadi tidak bisa import konstanta ini langsung.
 */
export const THEME_STORAGE_KEY = "bagibill:theme";

function isThemeOverride(value: string | null): value is ThemeOverride {
  return value === "light" || value === "dark";
}

/** Override yang tersimpan, atau null kalau ikut preferensi sistem. */
export function getStoredThemeOverride(): ThemeOverride | null {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeOverride(raw) ? raw : null;
}

/** Set override manual, atau null buat balik ikut preferensi sistem. */
export function setThemeOverride(theme: ThemeOverride | null): void {
  if (theme === null) {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

/** Pasang override tersimpan ke DOM. Tidak melakukan apapun kalau belum ada override. */
export function applyStoredTheme(): void {
  const stored = getStoredThemeOverride();
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
  }
}
