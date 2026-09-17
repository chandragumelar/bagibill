import type { StorageAdapter, TableAdapter } from "./adapter";
import type { Clock } from "./clock";

const RETENTION_DAYS = 30;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
export const DELETED_RECORD_RETENTION_MS =
  RETENTION_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

interface SoftDeletedRecord {
  readonly deletedAt?: number;
}

async function purgeTable<T extends SoftDeletedRecord>(
  table: TableAdapter<T>,
  keyOf: (record: T) => string,
  cutoffMs: number,
): Promise<void> {
  const expiredKeys = (await table.all())
    .filter((record) => record.deletedAt !== undefined && record.deletedAt <= cutoffMs)
    .map(keyOf);
  if (expiredKeys.length > 0) await table.deleteMany(expiredKeys);
}

// Startup cleanup is separate from user actions, so soft-deleted records stay
// exportable for 30 full days.
export async function purgeExpiredDeletedRecords(adapter: StorageAdapter, clock: Clock): Promise<void> {
  const cutoffMs = clock.now() - DELETED_RECORD_RETENTION_MS;
  await adapter.transaction(async () => {
    await Promise.all([
      purgeTable(adapter.groups, (group) => group.slug, cutoffMs),
      purgeTable(adapter.members, (member) => member.memberId, cutoffMs),
      purgeTable(adapter.expenses, (expense) => expense.expenseId, cutoffMs),
      purgeTable(adapter.settlements, (settlement) => settlement.settlementId, cutoffMs),
      purgeTable(adapter.activityLog, (entry) => entry.logId, cutoffMs),
    ]);
  });
}
