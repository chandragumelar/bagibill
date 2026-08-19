export interface IdGenerator {
  nextId(): string;
  nextSlug(): string;
}

// spec.md 4.1: a group's slug is 22 base62 characters from a CSPRNG (~128
// bit entropy) — not derived from the group name, which collides between
// groups and would make a group guessable/browsable from its neighbor's
// link. base62 (no separators) keeps the whole thing URL-safe with no
// percent-encoding.
const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SLUG_LENGTH = 22;

function randomBase62(length: number): string {
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => BASE62_ALPHABET.charAt(value % BASE62_ALPHABET.length)).join("");
}

export const cryptoIdGenerator: IdGenerator = {
  nextId(): string {
    return crypto.randomUUID();
  },
  nextSlug(): string {
    return randomBase62(SLUG_LENGTH);
  },
};

// For tests: predictable, increasing values instead of random ones. nextId
// and nextSlug count independently so a test asserting on one isn't thrown
// off by calls to the other.
export function createSequentialIdGenerator(prefix = ""): IdGenerator {
  let idCounter = 0;
  let slugCounter = 0;
  return {
    nextId(): string {
      idCounter += 1;
      return `${prefix}${idCounter}`;
    },
    nextSlug(): string {
      slugCounter += 1;
      return `${prefix}slug${slugCounter}`;
    },
  };
}
