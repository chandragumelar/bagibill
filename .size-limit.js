import { readFileSync } from "node:fs";

// F4-02: dist/.vite/manifest.json only exists after `pnpm build` (build.manifest
// is turned on in vite.config.ts) — package.json's "size" script and CI both run
// `pnpm build` before `pnpm size`, so this file is read synchronously here.
const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));

// src/App.tsx lazy-loads every route, AppRoutes included — nothing under it is
// a static import of the entry. So index.html's *static* import graph (this
// function, entry plus every "imports" edge followed recursively) already is
// the first-load set: what has to download before any Suspense boundary can
// resolve. dynamicImports are deliberately never followed — that's what made
// the old dist/assets/*.js glob count every lazy route (including /dev/ui and
// /dev/data, and every in-app screen) as "first load" when none of them are
// (see progress.md Blocker, F4-02).
function staticClosureJsFiles(entryKey) {
  const seen = new Set();
  const files = new Set();

  function visit(key) {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (chunk === undefined) {
      throw new Error(`.size-limit.js: manifest has no entry for "${key}" — rebuild with pnpm build`);
    }
    if (typeof chunk.file === "string" && chunk.file.endsWith(".js")) files.add(chunk.file);
    for (const importedKey of chunk.imports ?? []) visit(importedKey);
  }

  visit(entryKey);
  return [...files].map((file) => `dist/${file}`);
}

const firstLoadFiles = staticClosureJsFiles("index.html");

export default [
  {
    name: "Bundle awal (first-load)",
    path: firstLoadFiles,
    limit: "120 KB",
    brotli: true,
  },
  {
    // Ratchet, not the CLAUDE.md-mandated budget: total JS across every
    // chunk, first-load and lazy alike. Without this, first-load having
    // headroom again (see entry above) would let the lazy chunks grow
    // unnoticed. Limit is this PR's measured total (138.19 KB, after the
    // /dev/* gating below) rounded up to 139 KB plus ~5 KB headroom (F4-02).
    name: "Total seluruh chunk JS",
    path: "dist/assets/*.js",
    limit: "145 KB",
    brotli: true,
  },
  {
    // Ratchet closing the gap open since F0-03 (progress.md Catatan lepas):
    // CSS was never tracked by pnpm size at all. Limit is this PR's
    // measured total (14.32 KB) rounded up to 15 KB plus ~5 KB headroom
    // (F4-02).
    name: "CSS",
    path: "dist/assets/*.css",
    limit: "20 KB",
    brotli: true,
  },
];
