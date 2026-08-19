import Dexie, { type Table } from "dexie";
import { applyMigrations, migrations } from "./migrations";
import type {
  ActivityLogRecord,
  ExpenseRecord,
  GroupRecord,
  MemberRecord,
  SettlementRecord,
} from "./records";

// Item stays nested inside ExpenseRecord.items (spec.md 5.1: `items: [Item]`
// under Expense, no expenseId back-reference of its own) — no separate Item
// table. The claim screen always loads one whole Expense at a time, so
// there's no query that needs an item detached from its parent, and a
// separate table would mean inventing a back-reference field spec.md 5.1
// doesn't have plus two writes to keep consistent on every save.
export interface BagiBillTables {
  readonly groups: Table<GroupRecord, string>;
  readonly members: Table<MemberRecord, string>;
  readonly expenses: Table<ExpenseRecord, string>;
  readonly settlements: Table<SettlementRecord, string>;
  readonly activityLog: Table<ActivityLogRecord, string>;
}

export type BagiBillDatabase = Dexie & BagiBillTables;

function openDatabase(): BagiBillDatabase {
  const dexie = new Dexie("bagibill");

  applyMigrations(dexie, migrations);

  // Dexie attaches groups/members/... onto the instance at runtime inside
  // .stores() above, in a way TypeScript can't see statically — this cast
  // is how every Dexie+TypeScript setup bridges that gap.
  return dexie as BagiBillDatabase;
}

export const db = openDatabase();
