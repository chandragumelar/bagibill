import { pathToFileURL } from "node:url";
import { en } from "../src/locales/en.ts";
import { id } from "../src/locales/id.ts";

export interface LocaleKeyDiff {
  onlyInA: string[];
  onlyInB: string[];
}

/** Kunci yang cuma ada di salah satu sisi. Kosong berarti sinkron. */
export function findMissingLocaleKeys(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): LocaleKeyDiff {
  const keysA = new Set(Object.keys(a));
  const keysB = new Set(Object.keys(b));
  return {
    onlyInA: [...keysA].filter((key) => !keysB.has(key)),
    onlyInB: [...keysB].filter((key) => !keysA.has(key)),
  };
}

function runCheck(): void {
  const diff = findMissingLocaleKeys(id, en);
  if (diff.onlyInA.length === 0 && diff.onlyInB.length === 0) {
    console.log(`check-locale-keys: id.ts dan en.ts sinkron (${Object.keys(id).length} kunci).`);
    return;
  }
  console.error("check-locale-keys: kunci id.ts dan en.ts tidak sinkron.");
  if (diff.onlyInA.length > 0) {
    console.error(`  Cuma ada di id.ts: ${diff.onlyInA.join(", ")}`);
  }
  if (diff.onlyInB.length > 0) {
    console.error(`  Cuma ada di en.ts: ${diff.onlyInB.join(", ")}`);
  }
  process.exit(1);
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) runCheck();
