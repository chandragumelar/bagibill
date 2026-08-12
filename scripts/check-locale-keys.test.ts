import { describe, expect, it } from "vitest";
import { findMissingLocaleKeys } from "./check-locale-keys.ts";
import { en } from "../src/locales/en.ts";
import { id } from "../src/locales/id.ts";

describe("findMissingLocaleKeys", () => {
  it("mendeteksi kunci yang cuma ada di salah satu sisi", () => {
    expect(findMissingLocaleKeys({ a: "1", b: "2" }, { a: "1" })).toEqual({
      onlyInA: ["b"],
      onlyInB: [],
    });
  });

  it("mendeteksi dua arah sekaligus", () => {
    expect(findMissingLocaleKeys({ a: "1", x: "1" }, { a: "1", y: "1" })).toEqual({
      onlyInA: ["x"],
      onlyInB: ["y"],
    });
  });

  it("kosong kalau kunci sama persis, nilai boleh beda", () => {
    expect(findMissingLocaleKeys({ a: "1" }, { a: "lain" })).toEqual({
      onlyInA: [],
      onlyInB: [],
    });
  });

  it("id.ts dan en.ts di repo sekarang sinkron", () => {
    expect(findMissingLocaleKeys(id, en)).toEqual({ onlyInA: [], onlyInB: [] });
  });
});
