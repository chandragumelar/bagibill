import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeExpectedHashes,
  diffCspHashes,
  extractHeadersHashes,
  extractInlineScripts,
  sha256CspSource,
} from "./check-csp-hash.ts";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");

describe("extractInlineScripts", () => {
  it("mengambil isi script inline tanpa src", () => {
    const html = `<head><script>var a = 1;</script></head>`;
    expect(extractInlineScripts(html)).toEqual(["var a = 1;"]);
  });

  it("melewati script yang punya src", () => {
    const html = `<script type="module" src="/src/main.tsx"></script>`;
    expect(extractInlineScripts(html)).toEqual([]);
  });

  it("melewati script inline kosong", () => {
    expect(extractInlineScripts("<script></script>")).toEqual([]);
  });

  it("mengambil lebih dari satu script inline urut kemunculan", () => {
    const html = `<script>var a = 1;</script><script>var b = 2;</script>`;
    expect(extractInlineScripts(html)).toEqual(["var a = 1;", "var b = 2;"]);
  });
});

describe("sha256CspSource", () => {
  it("menghasilkan format sha256-<base64>", () => {
    expect(sha256CspSource("var a = 1;")).toMatch(/^sha256-[A-Za-z0-9+/=]+$/);
  });

  it("beda satu spasi menghasilkan hash beda", () => {
    expect(sha256CspSource("var a = 1;")).not.toBe(sha256CspSource("var a = 1; "));
  });

  it("stabil untuk isi yang sama", () => {
    expect(sha256CspSource("var a = 1;")).toBe(sha256CspSource("var a = 1;"));
  });
});

describe("extractHeadersHashes", () => {
  it("mengambil token sha256-... dari isi _headers", () => {
    const content = "  Content-Security-Policy: script-src 'self' 'sha256-abc123+/='";
    expect(extractHeadersHashes(content)).toEqual(["sha256-abc123+/="]);
  });

  it("kosong kalau nol ada token sha256", () => {
    expect(extractHeadersHashes("  X-Content-Type-Options: nosniff")).toEqual([]);
  });
});

describe("diffCspHashes", () => {
  it("kosong kalau expected dan actual sama persis", () => {
    expect(diffCspHashes(["sha256-a"], ["sha256-a"])).toEqual({
      missingFromHeaders: [],
      staleInHeaders: [],
    });
  });

  it("menandai hash yang belum tertulis di headers", () => {
    expect(diffCspHashes(["sha256-a", "sha256-b"], ["sha256-a"])).toEqual({
      missingFromHeaders: ["sha256-b"],
      staleInHeaders: [],
    });
  });

  it("menandai hash basi yang masih tertulis di headers", () => {
    expect(diffCspHashes(["sha256-a"], ["sha256-a", "sha256-old"])).toEqual({
      missingFromHeaders: [],
      staleInHeaders: ["sha256-old"],
    });
  });
});

describe("index.html dan public/_headers repo ini", () => {
  it("hash script inline di index.html cocok dengan yang tertulis di public/_headers", () => {
    const indexHtml = readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    const headersContent = readFileSync(path.join(ROOT_DIR, "public/_headers"), "utf8");
    const expected = computeExpectedHashes(indexHtml);
    const actual = extractHeadersHashes(headersContent);
    expect(diffCspHashes(expected, actual)).toEqual({ missingFromHeaders: [], staleInHeaders: [] });
  });
});
