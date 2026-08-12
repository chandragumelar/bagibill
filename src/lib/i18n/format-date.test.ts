import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n/locale-store";
import { formatDate } from "@/lib/i18n/format-date";

const SAMPLE_DATE = new Date("2026-08-12T00:00:00Z");

beforeEach(() => {
  setLocale("id");
});

describe("formatDate", () => {
  it("format panjang bahasa Indonesia", () => {
    expect(formatDate(SAMPLE_DATE, { dateStyle: "long", timeZone: "UTC" })).toBe("12 Agustus 2026");
  });

  it("format panjang bahasa Inggris, dari fungsi yang sama", () => {
    setLocale("en");
    expect(formatDate(SAMPLE_DATE, { dateStyle: "long", timeZone: "UTC" })).toBe("August 12, 2026");
  });
});
