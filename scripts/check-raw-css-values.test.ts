import path from "node:path";
import { describe, expect, it } from "vitest";
import { findRawCssValueViolations, scanCssText } from "./check-raw-css-values.ts";

const SRC_DIR = path.resolve(import.meta.dirname, "../src");

describe("scanCssText — warna", () => {
  it("menangkap hex 3, 4, 6, dan 8 digit", () => {
    const kinds = scanCssText("a{color:#fff;border:1px solid #1E63E9AA;background:#12f3}");
    expect(kinds.filter((m) => m.kind === "hex-color")).toHaveLength(3);
  });

  it("menangkap rgb/rgba/hsl/hsla", () => {
    const kinds = scanCssText(
      "a{color:rgb(0,0,0);background:rgba(0,0,0,.5);border-color:hsl(0,0%,0%);fill:hsla(0,0%,0%,.5)}",
    );
    expect(kinds.filter((m) => m.kind === "color-function")).toHaveLength(4);
  });

  it("tidak menangkap referensi var(--...)", () => {
    expect(scanCssText("a{color:var(--brand);background:var(--surface)}")).toEqual([]);
  });
});

describe("scanCssText — px", () => {
  it("menangkap px mentah selain 0px dan 1px border", () => {
    const matches = scanCssText("a{padding:12px;border-radius:8px}");
    expect(matches).toEqual([
      { line: 1, value: "12px", kind: "px" },
      { line: 1, value: "8px", kind: "px" },
    ]);
  });

  it("meloloskan 0px", () => {
    expect(scanCssText("a{margin:0px}")).toEqual([]);
  });

  it("meloloskan 1px kalau barisnya nyebut border", () => {
    expect(scanCssText("a{border:1px solid var(--border)}")).toEqual([]);
  });

  it("tetap menangkap 1px di luar konteks border", () => {
    expect(scanCssText("a{letter-spacing:1px}")).toEqual([{ line: 1, value: "1px", kind: "px" }]);
  });
});

describe("scanCssText — durasi", () => {
  it("menangkap ms dan s mentah", () => {
    const matches = scanCssText("a{transition:background 200ms;animation:ring 1.8s linear}");
    expect(matches).toEqual([
      { line: 1, value: "200ms", kind: "duration" },
      { line: 1, value: "1.8s", kind: "duration" },
    ]);
  });

  it("meloloskan 0ms dan 0s", () => {
    expect(scanCssText("a{transition-delay:0ms;animation-delay:0s}")).toEqual([]);
  });
});

describe("scanCssText — persen", () => {
  it("menangkap persen mentah selain 100%", () => {
    expect(scanCssText("a{width:40%}")).toEqual([{ line: 1, value: "40%", kind: "percent" }]);
  });

  it("meloloskan 100% dan 0%", () => {
    expect(scanCssText("a{width:100%;left:0%}")).toEqual([]);
  });
});

describe("findRawCssValueViolations", () => {
  it("nol pelanggaran di src/ yang sekarang", () => {
    expect(findRawCssValueViolations(SRC_DIR)).toEqual([]);
  });
});
