import type { CategoryKey } from "@/lib/storage/templates";
import { DatePill } from "./DatePill";
import { CategoryPill } from "./CategoryPill";
import styles from "./AddExpenseScreen.module.css";

export interface ExpenseChipsProps {
  readonly dateMs: number;
  readonly nowMs: number;
  readonly category: CategoryKey;
  readonly templateCategories: readonly CategoryKey[];
  readonly currency: string;
  readonly onDateChange: (dateMs: number) => void;
  readonly onCategoryChange: (category: CategoryKey) => void;
}

// The header pill row shared by all five split modes (mockup-inventory: the
// chip row is identical across every Tambah_Pengeluaran.html state) — date
// and category are editable (F4-06), currency stays a static chip because
// it's a group property, not an expense property, so it never gets a picker.
export function ExpenseChips({
  dateMs,
  nowMs,
  category,
  templateCategories,
  currency,
  onDateChange,
  onCategoryChange,
}: ExpenseChipsProps) {
  return (
    <div className={styles.chipRow}>
      <DatePill dateMs={dateMs} nowMs={nowMs} onChange={onDateChange} />
      <CategoryPill category={category} templateCategories={templateCategories} onSelect={onCategoryChange} />
      <span className={styles.chip}>{currency}</span>
    </div>
  );
}
