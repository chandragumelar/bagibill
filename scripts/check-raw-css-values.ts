import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface RawCssValueMatch {
  line: number;
  value: string;
  kind: string;
}

export interface RawCssValueViolation extends RawCssValueMatch {
  file: string;
}

interface ValuePattern {
  kind: string;
  regex: RegExp;
  isAllowed: (value: string, line: string) => boolean;
}

// Nol angka mentah: 0, 1px khusus border, dan 100% adalah satu-satunya
// nilai yang boleh lolos tanpa token. Selain itu wajib lewat var(--...).
function isZeroValue(value: string): boolean {
  return /^0(?:\.0+)?(?:px|m?s|%)?$/.test(value);
}

export const RAW_CSS_VALUE_PATTERNS: ValuePattern[] = [
  {
    kind: "hex-color",
    regex: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
    isAllowed: () => false,
  },
  {
    kind: "color-function",
    regex: /\b(?:rgb|rgba|hsl|hsla)\(/g,
    isAllowed: () => false,
  },
  {
    kind: "px",
    regex: /\b\d+(?:\.\d+)?px\b/g,
    isAllowed: (value, line) => isZeroValue(value) || (value === "1px" && /border/i.test(line)),
  },
  {
    kind: "duration",
    regex: /\b\d+(?:\.\d+)?m?s\b/g,
    // 1ms lolos: idiom teknis buat prefers-reduced-motion (bukan 0, karena
    // beberapa browser tidak menembakkan event transitionend/animationend
    // untuk durasi persis nol). Nilai tetap, bukan pilihan desain.
    isAllowed: (value) => isZeroValue(value) || value === "1ms",
  },
  {
    kind: "percent",
    regex: /\b\d+(?:\.\d+)?%/g,
    isAllowed: (value) => isZeroValue(value) || value === "100%",
  },
];

/** Cari nilai CSS mentah (bukan lewat var(--...)) di satu blok teks CSS. */
export function scanCssText(text: string): RawCssValueMatch[] {
  const matches: RawCssValueMatch[] = [];
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    for (const pattern of RAW_CSS_VALUE_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        const value = match[0];
        if (!pattern.isAllowed(value, line)) {
          matches.push({ line: index + 1, value, kind: pattern.kind });
        }
      }
    }
  });
  return matches;
}

function collectCssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) return collectCssFiles(full);
    return full.endsWith(".css") ? [full] : [];
  });
}

/** Sisir seluruh `.css` di bawah rootDir, kembalikan tiap nilai mentah yang ketemu. */
export function findRawCssValueViolations(rootDir: string): RawCssValueViolation[] {
  return collectCssFiles(rootDir).flatMap((file) =>
    scanCssText(readFileSync(file, "utf8")).map((match) => ({ file, ...match })),
  );
}

function runCheck(): void {
  const srcDir = path.resolve(import.meta.dirname, "../src");
  const violations = findRawCssValueViolations(srcDir);
  if (violations.length === 0) {
    console.log("check-raw-css-values: nol nilai mentah di src/.");
    return;
  }
  console.error(`check-raw-css-values: ${violations.length} nilai mentah ketemu di src/.`);
  for (const violation of violations) {
    const relativeFile = path.relative(srcDir, violation.file);
    console.error(`  src/${relativeFile}:${violation.line} — ${violation.kind} "${violation.value}"`);
  }
  process.exit(1);
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) runCheck();
