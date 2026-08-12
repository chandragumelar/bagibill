import { describe, expect, it } from "vitest";
import { formatMoney, getCurrencyDecimalDigits, parseMoney } from "./money";

describe("getCurrencyDecimalDigits", () => {
  it("zero decimals for IDR, JPY, KRW, VND", () => {
    expect(getCurrencyDecimalDigits("IDR")).toBe(0);
    expect(getCurrencyDecimalDigits("JPY")).toBe(0);
    expect(getCurrencyDecimalDigits("KRW")).toBe(0);
    expect(getCurrencyDecimalDigits("VND")).toBe(0);
  });

  it("three decimals for KWD, BHD, OMR", () => {
    expect(getCurrencyDecimalDigits("KWD")).toBe(3);
    expect(getCurrencyDecimalDigits("BHD")).toBe(3);
    expect(getCurrencyDecimalDigits("OMR")).toBe(3);
  });

  it("two decimals for the majority", () => {
    expect(getCurrencyDecimalDigits("USD")).toBe(2);
    expect(getCurrencyDecimalDigits("EUR")).toBe(2);
    expect(getCurrencyDecimalDigits("SGD")).toBe(2);
  });
});

describe("parseMoney — normal", () => {
  it("plain digits for a zero-decimal currency", () => {
    expect(parseMoney("45000", "IDR")).toEqual({ amountMinor: 45000, currency: "IDR" });
  });

  it("exact fraction length for a two-decimal currency", () => {
    expect(parseMoney("$45.00", "USD")).toEqual({ amountMinor: 4500, currency: "USD" });
  });

  it("exact fraction length for a three-decimal currency", () => {
    expect(parseMoney("KWD 45.123", "KWD")).toEqual({ amountMinor: 45123, currency: "KWD" });
  });
});

describe("parseMoney — batas", () => {
  it("dirty currency symbol and NBSP are stripped", () => {
    expect(parseMoney("Rp 45.000", "IDR")).toEqual({ amountMinor: 45000, currency: "IDR" });
  });

  it("european-style grouping with a comma decimal", () => {
    expect(parseMoney("1.234.567,89", "EUR")).toEqual({ amountMinor: 123456789, currency: "EUR" });
  });

  it("us-style grouping with a dot decimal", () => {
    expect(parseMoney("1,234,567.89", "USD")).toEqual({ amountMinor: 123456789, currency: "USD" });
  });

  it("a lone dot with three grouped digits reads as grouping, not a fraction", () => {
    expect(parseMoney("12.500", "USD")).toEqual({ amountMinor: 1250000, currency: "USD" });
  });

  it("partial fraction shorter than the currency precision is padded", () => {
    expect(parseMoney("12.5", "USD")).toEqual({ amountMinor: 1250, currency: "USD" });
  });

  it("negative amount, sign kept at the front", () => {
    expect(parseMoney("-50000", "IDR")).toEqual({ amountMinor: -50000, currency: "IDR" });
    expect(parseMoney("-$12.50", "USD")).toEqual({ amountMinor: -1250, currency: "USD" });
  });

  it("zero amount", () => {
    expect(parseMoney("0", "IDR")).toEqual({ amountMinor: 0, currency: "IDR" });
    expect(parseMoney("Rp 0", "IDR")).toEqual({ amountMinor: 0, currency: "IDR" });
  });
});

describe("parseMoney — ditolak", () => {
  it("throws with the raw input and currency in the message", () => {
    expect(() => parseMoney("", "IDR")).toThrow('cannot parse money input "" for currency IDR');
  });

  it("throws on input with no digits at all", () => {
    expect(() => parseMoney("abc", "USD")).toThrow();
    expect(() => parseMoney("-", "USD")).toThrow();
    expect(() => parseMoney("$", "USD")).toThrow();
  });

  it("throws on a misplaced or repeated minus sign", () => {
    expect(() => parseMoney("12-34", "USD")).toThrow();
    expect(() => parseMoney("--12", "USD")).toThrow();
  });
});

describe("formatMoney", () => {
  it("zero-decimal currency has no decimal point", () => {
    expect(formatMoney({ amountMinor: 45000, currency: "IDR" })).toBe("45000");
  });

  it("two-decimal currency", () => {
    expect(formatMoney({ amountMinor: 4500, currency: "USD" })).toBe("45.00");
  });

  it("three-decimal currency", () => {
    expect(formatMoney({ amountMinor: 45123, currency: "KWD" })).toBe("45.123");
  });

  it("negative amount keeps the sign in front", () => {
    expect(formatMoney({ amountMinor: -1250, currency: "USD" })).toBe("-12.50");
  });
});

describe("parseMoney and formatMoney round-trip", () => {
  it.each([
    { amountMinor: 45000, currency: "IDR" },
    { amountMinor: 4500, currency: "USD" },
    { amountMinor: 45123, currency: "KWD" },
    { amountMinor: -1250, currency: "USD" },
    { amountMinor: 0, currency: "EUR" },
  ])("round-trips $currency $amountMinor", (money) => {
    expect(parseMoney(formatMoney(money), money.currency)).toEqual(money);
  });
});
