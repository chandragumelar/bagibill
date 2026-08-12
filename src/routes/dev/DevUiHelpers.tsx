import type { ReactNode } from "react";
import { useState } from "react";
import { getStoredThemeOverride, setThemeOverride, type ThemeOverride } from "@/shared/theme";
import { useLocale } from "@/lib/i18n";
import styles from "@/routes/dev/ui.module.css";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.grid}>{children}</div>
    </section>
  );
}

export function StateCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>{label}</span>
      {children}
    </div>
  );
}

export function DevControls() {
  const { locale, setLocale } = useLocale();
  const [theme, setTheme] = useState<ThemeOverride | null>(() => getStoredThemeOverride());

  function applyTheme(next: ThemeOverride) {
    setThemeOverride(next);
    setTheme(next);
  }

  return (
    <div className={styles.controls}>
      <div className={styles.controlGroup}>
        <button
          type="button"
          className={theme === "light" ? styles.controlActive : styles.control}
          onClick={() => applyTheme("light")}
        >
          Light
        </button>
        <button
          type="button"
          className={theme === "dark" ? styles.controlActive : styles.control}
          onClick={() => applyTheme("dark")}
        >
          Dark
        </button>
      </div>
      <div className={styles.controlGroup}>
        <button
          type="button"
          className={locale === "id" ? styles.controlActive : styles.control}
          onClick={() => setLocale("id")}
        >
          ID
        </button>
        <button
          type="button"
          className={locale === "en" ? styles.controlActive : styles.control}
          onClick={() => setLocale("en")}
        >
          EN
        </button>
      </div>
    </div>
  );
}
