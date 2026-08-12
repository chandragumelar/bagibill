import type { LocaleDictionary } from "@/lib/i18n/types";

// Kunci dan isinya bersumber dari spec.md 22 (tabel padanan) dan K-04 di
// progress.md. Seeded minimal buat buktiin infrastrukturnya jalan — kunci
// per layar menyusul di tugas F3 masing-masing.
export const id: LocaleDictionary = {
  "common.allSettled": "Semua sudah lunas",
  "common.noExpensesYet": "Belum ada transaksi",
  "common.saveFailed": "Gagal menyimpan. Coba lagi.",
  "common.expenseCount": { other: "{count} pengeluaran" },
  "expense.mode.adjustment": "Selisih",
};
