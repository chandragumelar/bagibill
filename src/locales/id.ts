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
  "toast.undo": "Urungkan",
  "toast.undoAll": "Urungkan semua",
  "devui.sample.name": "Dimas Prasetyo",
  "devui.sample.buttonPrimary": "Simpan pengeluaran",
  "devui.sample.buttonSecondary": "Batal",
  "devui.sample.buttonGhost": "Scan struk",
  "devui.sample.textInputLabel": "Nama",
  "devui.sample.textInputWarning": "Sudah ada Dimas di grup ini. Orang yang beda?",
  "devui.sample.moneyInputLabel": "Nominal",
  "devui.sample.sheetTitle": "Dari mana angka ini",
  "devui.sample.sheetSubtitle": "Telusuri transfer ini sampai ke transaksi aslinya.",
  "devui.sample.sheetBody": "Bensin Cirebon · Budi bayar",
  "devui.sample.sheetHeavyTitle": "Hapus grup Trip Bali 2026?",
  "devui.sample.sheetHeavySubtitle":
    "Grup dan seluruh isinya hilang untuk semua anggota, dan tidak ada tombol urungkan setelah ini.",
  "devui.sample.toastMessage": "“Sate Padang Ajo Ramon” dihapus",
  "devui.sample.toastSub": "Bisa ditarik lagi sebentar",
  "devui.sample.toastStackedMessage": "2 transaksi dihapus",
  "devui.sample.toastStackedSub": "Ketuk urungkan untuk tarik yang terakhir",
  "devui.sample.listRowTitle": "Sate Padang Ajo Ramon",
  "devui.sample.listRowMeta": "Kamu bayar",
  "devui.sample.listRowTrailing": "−Rp 60.000",
};
