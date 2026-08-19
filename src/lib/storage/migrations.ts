import type Dexie from "dexie";
import type { Transaction } from "dexie";

// Rules for adding a new version, read this before touching the list below:
//
// 1. Never edit a released version block, only append a new one below it.
//    A device already has the old block's stores committed to its local
//    IndexedDB — changing what that block says would make that device's
//    upgrade path diverge from the one it actually ran, and the only way
//    that difference ever shows up is as missing data, not an error.
// 2. An upgrade function never deletes rows, including rows whose
//    deletedAt is already set. Soft-deleted rows are still reversible by
//    spec.md 5.2, and permanent cleanup has its own path (30 days past
//    deletedAt) that isn't a schema migration.
// 3. A field nobody reads anymore stays on old rows, it is not scrubbed
//    out during an upgrade, unless there's a strong reason to.
//
// Example of what a new version block looks like (kept as a comment, not
// live code, since this repo doesn't have a real version 2 yet):
//
// {
//   version: 2,
//   stores: {
//     groups: "slug",
//     members: "memberId, groupSlug",
//     expenses: "expenseId, groupSlug, [groupSlug+date]",
//     settlements: "settlementId, groupSlug",
//     activityLog: "logId, groupSlug",
//     // new in v2: paymentNote is indexed so a "who still owes me" query
//     // can filter by it without a full table scan
//   },
//   upgrade: async (tx) => {
//     await tx.table("members").toCollection().modify((member) => {
//       member.remindedAt = null;
//     });
//   },
// },

export interface MigrationStep {
  readonly version: number;
  readonly stores: Readonly<Record<string, string>>;
  readonly upgrade?: (tx: Transaction) => Promise<void>;
}

export const migrations: readonly MigrationStep[] = [
  {
    version: 1,
    stores: {
      groups: "slug",
      members: "memberId, groupSlug",
      // [groupSlug+date] is a compound index — F2-03 needs a group's
      // expenses back in date order without pulling in the whole table.
      expenses: "expenseId, groupSlug, [groupSlug+date]",
      settlements: "settlementId, groupSlug",
      activityLog: "logId, groupSlug",
    },
    // deletedAt is deliberately not indexed: filtering soft-deleted rows is
    // repository work (F2-03), and an index nobody queries yet is only a
    // write-cost with no read benefit.
  },
];

function getHighestVersion(steps: readonly MigrationStep[]): number {
  const lastStep = steps[steps.length - 1];
  if (!lastStep) {
    throw new Error("Migration steps must not be empty");
  }
  return lastStep.version;
}

// Derived from migrations, never hand-maintained — a literal here would be
// a second source for the same fact, exactly what K-62 already ruled out
// for splitMode. Whoever adds a version and forgets to look here still
// gets the right value automatically.
export const CURRENT_SCHEMA_VERSION = getHighestVersion(migrations);

function assertWellFormed(steps: readonly MigrationStep[]): void {
  const firstStep = steps[0];
  if (!firstStep || firstStep.version !== 1) {
    throw new Error("Migration steps must start at version 1");
  }

  for (const [index, step] of steps.entries()) {
    const expectedVersion = index + 1;
    if (step.version !== expectedVersion) {
      throw new Error(
        `Migration steps must be sequential with no gaps or duplicates: expected version ${expectedVersion} at position ${index}, got ${step.version}`,
      );
    }
  }
}

export function applyMigrations(dexie: Dexie, steps: readonly MigrationStep[]): void {
  assertWellFormed(steps);

  for (const step of steps) {
    const versionSchema = dexie.version(step.version).stores(step.stores);
    if (step.upgrade) {
      versionSchema.upgrade(step.upgrade);
    }
  }
}
