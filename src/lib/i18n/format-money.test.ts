import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n/locale-store";
import { formatMoney, getCurrencyDecimals } from "@/lib/i18n/format-money";

beforeEach(() => {
  setLocale("id");
});

describe("getCurrencyDecimals", () => {
  it("nol desimal untuk IDR, JPY, KRW, VND", () => {
    expect(getCurrencyDecimals("IDR")).toBe(0);
    expect(getCurrencyDecimals("JPY")).toBe(0);
    expect(getCurrencyDecimals("KRW")).toBe(0);
    expect(getCurrencyDecimals("VND")).toBe(0);
  });

  it("tiga desimal untuk KWD, BHD, OMR", () => {
    expect(getCurrencyDecimals("KWD")).toBe(3);
    expect(getCurrencyDecimals("BHD")).toBe(3);
    expect(getCurrencyDecimals("OMR")).toBe(3);
  });

  it("dua desimal untuk mayoritas lainnya", () => {
    expect(getCurrencyDecimals("USD")).toBe(2);
    expect(getCurrencyDecimals("EUR")).toBe(2);
    expect(getCurrencyDecimals("SGD")).toBe(2);
  });
});

// Intl memisahkan simbol mata uang dan angka pakai non-breaking space
// (\u00a0), bukan spasi biasa — literal di bawah sengaja pakai escape
// eksplisit biar kelihatan, bukan spasi ASCII yang mirip secara visual.
describe("formatMoney", () => {
  it("IDR keluar tanpa desimal", () => {
    expect(formatMoney(45000, "IDR")).toBe("Rp\u00a045.000");
  });

  it("USD dua desimal, dari fungsi yang sama", () => {
    setLocale("en");
    expect(formatMoney(4500, "USD")).toBe("$45.00");
  });

  it("format ngikutin bahasa app, bukan mata uangnya — USD dilihat dari locale id", () => {
    setLocale("id");
    expect(formatMoney(4500, "USD")).toBe("US$45,00");
  });

  it("tiga desimal untuk KWD", () => {
    setLocale("en");
    expect(formatMoney(45123, "KWD")).toBe("KWD\u00a045.123");
  });
});
