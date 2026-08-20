import type { StorageAdapter } from "./adapter";
import type { Clock } from "./clock";
import { CURRENT_SCHEMA_VERSION } from "./migrations";
import type {
  ActivityLogRecord,
  ExpenseRecord,
  GroupRecord,
  MemberRecord,
  SettlementRecord,
} from "./records";

// Starts at 1 and only this module bumps it. schemaVersion (from
// migrations.ts) and formatVersion track two different things that can
// each change on their own: schemaVersion is which shape the five tables
// were in when read, formatVersion is the shape of this bundle itself.
const EXPORT_FORMAT_VERSION = 1;
const JSON_INDENT_SPACES = 2;

export interface ExportBundle {
  readonly formatVersion: number;
  readonly schemaVersion: number;
  readonly exportedAt: number;
  readonly groups: readonly GroupRecord[];
  readonly members: readonly MemberRecord[];
  readonly expenses: readonly ExpenseRecord[];
  readonly settlements: readonly SettlementRecord[];
  readonly activityLog: readonly ActivityLogRecord[];
}

// Records with deletedAt set are included, not filtered out. A safety net
// that quietly drops rows isn't a safety net — the row someone deleted by
// accident is exactly the one they're most likely to come here looking for
// (F2-05 decision, progress.md).
export async function exportAllData(adapter: StorageAdapter, clock: Clock): Promise<ExportBundle> {
  const [groups, members, expenses, settlements, activityLog] = await Promise.all([
    adapter.groups.all(),
    adapter.members.all(),
    adapter.expenses.all(),
    adapter.settlements.all(),
    adapter.activityLog.all(),
  ]);

  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: clock.now(),
    groups,
    members,
    expenses,
    settlements,
    activityLog,
  };
}

export function serializeExport(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, JSON_INDENT_SPACES);
}
