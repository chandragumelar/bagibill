const STORAGE_KEY_PREFIX = "bagibill:claim-identity:";

function storageKey(groupSlug: string): string {
  return `${STORAGE_KEY_PREFIX}${groupSlug}`;
}

// Who's claiming from this device, keyed by group slug in localStorage —
// a fact about the device, not the group. Two people opening the same
// link on two phones are two different claimants; storing this on the
// group record would let whoever picks second silently overwrite the
// first (K-decision, progress.md).
export function getClaimIdentity(groupSlug: string): string | undefined {
  try {
    return localStorage.getItem(storageKey(groupSlug)) ?? undefined;
  } catch {
    return undefined;
  }
}

// Private-browsing modes in some browsers throw on write, not just read —
// callers treat a `false` return as "ask the person to pick again," never
// as a crash.
export function saveClaimIdentity(groupSlug: string, memberId: string): boolean {
  try {
    localStorage.setItem(storageKey(groupSlug), memberId);
    return true;
  } catch {
    return false;
  }
}
