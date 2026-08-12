import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n/locale-store";
import { t } from "@/lib/i18n/translate";

beforeEach(() => {
  setLocale("id");
});

describe("t", () => {
  it("ambil string biasa sesuai locale aktif", () => {
    expect(t("common.allSettled")).toBe("Semua sudah lunas");
    setLocale("en");
    expect(t("common.allSettled")).toBe("All settled");
  });

  it("lempar error kalau kunci tidak ada", () => {
    expect(() => t("common.doesNotExist")).toThrow(/common\.doesNotExist/);
  });

  it("pluralisasi bahasa Inggris beda bentuk one/other, Indonesia tidak", () => {
    setLocale("en");
    expect(t("common.expenseCount", { count: 1 })).toBe("1 expense");
    expect(t("common.expenseCount", { count: 3 })).toBe("3 expenses");

    setLocale("id");
    expect(t("common.expenseCount", { count: 1 })).toBe("1 pengeluaran");
    expect(t("common.expenseCount", { count: 3 })).toBe("3 pengeluaran");
  });

  it("kunci K-04: expense.mode.adjustment", () => {
    expect(t("expense.mode.adjustment")).toBe("Selisih");
    setLocale("en");
    expect(t("expense.mode.adjustment")).toBe("Adjustment");
  });
});
