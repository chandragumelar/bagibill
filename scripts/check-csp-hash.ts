import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const INLINE_SCRIPT_REGEX = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const HEADERS_HASH_REGEX = /'sha256-([A-Za-z0-9+/=]+)'/g;

/** Isi mentah tiap `<script>` inline (tanpa `src`) di satu dokumen HTML, urut kemunculan. */
export function extractInlineScripts(html: string): string[] {
  const scripts: string[] = [];
  let match: RegExpExecArray | null;
  INLINE_SCRIPT_REGEX.lastIndex = 0;
  while ((match = INLINE_SCRIPT_REGEX.exec(html)) !== null) {
    const attrs = match[1] ?? "";
    const content = match[2] ?? "";
    const hasSrc = /\bsrc\s*=/i.test(attrs);
    if (!hasSrc && content.trim().length > 0) {
      scripts.push(content);
    }
  }
  return scripts;
}

// CSP hash-source: base64(sha256(isi persis elemen script, byte demi byte)).
// Beda satu spasi pun beda hash — itu justru intinya, biar script inline
// nol bisa diubah diam-diam tanpa CSP ikut nolak dia.
export function sha256CspSource(scriptContent: string): string {
  return `sha256-${createHash("sha256").update(scriptContent, "utf8").digest("base64")}`;
}

/** Hash CSP dari tiap script inline di html, urut kemunculan. */
export function computeExpectedHashes(html: string): string[] {
  return extractInlineScripts(html).map(sha256CspSource);
}

/** Token `'sha256-...'` yang tertulis di isi file `_headers`. */
export function extractHeadersHashes(headersContent: string): string[] {
  const hashes: string[] = [];
  let match: RegExpExecArray | null;
  HEADERS_HASH_REGEX.lastIndex = 0;
  while ((match = HEADERS_HASH_REGEX.exec(headersContent)) !== null) {
    hashes.push(`sha256-${match[1]}`);
  }
  return hashes;
}

export interface CspHashDiff {
  missingFromHeaders: string[];
  staleInHeaders: string[];
}

/** Bandingkan hash yang seharusnya (dari index.html) dengan yang tertulis di _headers. */
export function diffCspHashes(expected: string[], actual: string[]): CspHashDiff {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missingFromHeaders: expected.filter((hash) => !actualSet.has(hash)),
    staleInHeaders: actual.filter((hash) => !expectedSet.has(hash)),
  };
}

function runCheck(): void {
  const rootDir = path.resolve(import.meta.dirname, "..");
  const indexHtml = readFileSync(path.join(rootDir, "index.html"), "utf8");
  const headersContent = readFileSync(path.join(rootDir, "public/_headers"), "utf8");

  const expected = computeExpectedHashes(indexHtml);
  const actual = extractHeadersHashes(headersContent);
  const diff = diffCspHashes(expected, actual);

  if (diff.missingFromHeaders.length === 0 && diff.staleInHeaders.length === 0) {
    console.log(`check-csp-hash: ${expected.length} hash script inline cocok dengan public/_headers.`);
    return;
  }

  console.error("check-csp-hash: hash CSP di public/_headers basi terhadap index.html.");
  if (diff.missingFromHeaders.length > 0) {
    console.error("  Hash yang seharusnya ada tapi belum tertulis di public/_headers:");
    for (const hash of diff.missingFromHeaders) console.error(`    '${hash}'`);
  }
  if (diff.staleInHeaders.length > 0) {
    console.error("  Hash di public/_headers yang sudah tidak cocok script manapun di index.html:");
    for (const hash of diff.staleInHeaders) console.error(`    '${hash}'`);
  }
  console.error("  Perbaiki: tempel hash yang seharusnya ke script-src di public/_headers.");
  process.exit(1);
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) runCheck();
