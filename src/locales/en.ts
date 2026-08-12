import type { LocaleDictionary } from "@/lib/i18n/types";

// Kunci dan isinya bersumber dari spec.md 22 (tabel padanan) dan K-04 di
// progress.md. Seeded minimal buat buktiin infrastrukturnya jalan — kunci
// per layar menyusul di tugas F3 masing-masing.
export const en: LocaleDictionary = {
  "common.allSettled": "All settled",
  "common.noExpensesYet": "No expenses yet",
  "common.saveFailed": "Couldn't save. Try again.",
  "common.expenseCount": { one: "{count} expense", other: "{count} expenses" },
  "expense.mode.adjustment": "Adjustment",
};
