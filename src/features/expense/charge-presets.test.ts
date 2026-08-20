import { describe, expect, it } from "vitest";
import { getChargePresets } from "./charge-presets";

describe("getChargePresets", () => {
  it("returns the Indonesia preset for IDR: service charge from subtotal, then PB1 from running_total, in that order", () => {
    const presets = getChargePresets("IDR");
    expect(presets).toEqual([
      {
        nameKey: "expense.charge.preset.serviceCharge",
        amountKind: "percent",
        rawValue: "5",
        percentBasis: "subtotal",
        allocationMode: "proportional",
      },
      {
        nameKey: "expense.charge.preset.pb1",
        amountKind: "percent",
        rawValue: "10",
        percentBasis: "running_total",
        allocationMode: "proportional",
      },
    ]);
  });

  it("never names the Indonesia preset PPN, in any key", () => {
    const presets = getChargePresets("IDR");
    for (const preset of presets) {
      expect(preset.nameKey.toLowerCase()).not.toContain("ppn");
    }
  });

  it("returns a single subtotal-based tip preset for a non-Indonesia currency", () => {
    const presets = getChargePresets("USD");
    expect(presets).toEqual([
      {
        nameKey: "expense.charge.preset.tip",
        amountKind: "percent",
        rawValue: "10",
        percentBasis: "subtotal",
        allocationMode: "proportional",
      },
    ]);
  });
});
