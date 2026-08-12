import styles from "@/app/layout/TabBar/TabBar.module.css";

export interface Tab {
  id: string;
  label: string;
  /** Ringkasan gelombang 1: kelihatan sama seperti tab tidak aktif di mockup, cuma non-interaktif. */
  disabled?: boolean;
}

export interface TabBarProps {
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function TabBar({ tabs, activeId, onSelect }: TabBarProps) {
  return (
    <nav className={styles.tabs}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? `${styles.tab} ${styles.active}` : styles.tab}
            aria-current={isActive ? "page" : undefined}
            aria-disabled={tab.disabled || undefined}
            onClick={() => {
              if (!tab.disabled) onSelect(tab.id);
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
