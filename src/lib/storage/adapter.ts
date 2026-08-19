import type { Table } from "dexie";
import type { BagiBillDatabase } from "./schema";
import type {
  ActivityLogRecord,
  ExpenseRecord,
  GroupRecord,
  MemberRecord,
  SettlementRecord,
} from "./records";

// No delete operation anywhere in this interface. Every deletion in this
// app is a soft delete through deletedAt (spec.md 5.2) — offering a real
// delete here would hand every future caller a door to break that rule
// without meaning to. Permanent cleanup 30 days past deletedAt gets its own
// path later, not this one.
export interface TableAdapter<T> {
  get(key: string): Promise<T | undefined>;
  put(record: T): Promise<void>;
  putMany(records: readonly T[]): Promise<void>;
  findBy(index: string, value: string): Promise<readonly T[]>;
  findByRange(index: string, lower: readonly unknown[], upper: readonly unknown[]): Promise<readonly T[]>;
  all(): Promise<readonly T[]>;
}

export interface StorageAdapter {
  readonly groups: TableAdapter<GroupRecord>;
  readonly members: TableAdapter<MemberRecord>;
  readonly expenses: TableAdapter<ExpenseRecord>;
  readonly settlements: TableAdapter<SettlementRecord>;
  readonly activityLog: TableAdapter<ActivityLogRecord>;
  transaction<T>(run: () => Promise<T>): Promise<T>;
}

function createTableAdapter<T>(table: Table<T, string>): TableAdapter<T> {
  return {
    async get(key) {
      return table.get(key);
    },
    async put(record) {
      await table.put(record);
    },
    async putMany(records) {
      await table.bulkPut([...records]);
    },
    async findBy(index, value) {
      return table.where(index).equals(value).toArray();
    },
    async findByRange(index, lower, upper) {
      return table.where(index).between([...lower], [...upper], true, true).toArray();
    },
    async all() {
      return table.toArray();
    },
  };
}

// Only the storage engine is meant to be swappable here, not the way of
// thinking about data — this stays a thin pass-through to Dexie, not an ORM.
export function createDexieAdapter(db: BagiBillDatabase): StorageAdapter {
  return {
    groups: createTableAdapter(db.groups),
    members: createTableAdapter(db.members),
    expenses: createTableAdapter(db.expenses),
    settlements: createTableAdapter(db.settlements),
    activityLog: createTableAdapter(db.activityLog),
    transaction(run) {
      return db.transaction(
        "rw",
        db.groups,
        db.members,
        db.expenses,
        db.settlements,
        db.activityLog,
        run,
      );
    },
  };
}
