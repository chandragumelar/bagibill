import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n";
import { buildRemindMessage } from "./remind-message";

afterEach(() => {
  setLocale("id");
});

describe("buildRemindMessage", () => {
  it("includes the group name, formatted amount, and recipient's payment note", () => {
    setLocale("id");
    const message = buildRemindMessage({
      groupName: "Trip Bali 2026",
      debtorName: "Farhan",
      formattedAmount: "Rp 705.000",
      recipientNote: "BCA 1234567890 a.n. Nadia Putri",
    });

    expect(message).toContain("Trip Bali 2026");
    expect(message).toContain("Rp 705.000");
    expect(message).toContain("BCA 1234567890 a.n. Nadia Putri");
    expect(message).toContain("Farhan");
  });

  it("still reads sensibly without a recipient payment note", () => {
    setLocale("id");
    const message = buildRemindMessage({
      groupName: "Trip Bali 2026",
      debtorName: "Farhan",
      formattedAmount: "Rp 705.000",
    });

    expect(message).not.toContain("Transfer ke");
    expect(message).toContain("Farhan");
    expect(message).toContain("Rp 705.000");
  });

  it("follows the active locale", () => {
    setLocale("en");
    const message = buildRemindMessage({
      groupName: "Bali Trip",
      debtorName: "Farhan",
      formattedAmount: "IDR 705,000",
    });

    expect(message).toContain("Hi Farhan");
    expect(message).not.toMatch(/Hai|sisa ke aku/);
  });

  it("never assembles the message from raw Indonesian strings written in the module", () => {
    setLocale("en");
    const message = buildRemindMessage({
      groupName: "Bali Trip",
      debtorName: "Farhan",
      formattedAmount: "IDR 705,000",
      recipientNote: "BCA 123",
    });

    expect(message).not.toMatch(/Makasih|Transfer ke|dikirim lewat/);
  });
});
