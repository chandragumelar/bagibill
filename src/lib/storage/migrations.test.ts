import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { applyMigrations, CURRENT_SCHEMA_VERSION, migrations, type MigrationStep } from "./migrations";
import type {
  ActivityLogRecord,
  ExpenseRecord,
  GroupRecord,
  MemberRecord,
  SettlementRecord,
} from "./records";

interface Dataset {
  readonly groups: readonly GroupRecord[];
  readonly members: readonly MemberRecord[];
  readonly expenses: readonly ExpenseRecord[];
  readonly settlements: readonly SettlementRecord[];
  readonly activityLog: readonly ActivityLogRecord[];
}

function buildDataset(): Dataset {
  const baseExpense = {
    groupSlug: "trip-real",
    title: "Sewa mobil",
    category: "transport",
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 200_000,
    payers: [{ memberId: "m1", amountMinor: 200_000 }],
    splitData: { mode: "evenly" as const, memberIds: ["m1", "m2"] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: "device-1",
    createdAt: 1_000,
    updatedAt: 1_000,
    seq: 0,
  };

  return {
    groups: [
      {
        slug: "trip-real",
        name: "Trip Real",
        baseCurrency: "IDR",
        template: "trip",
        createdAt: 1_000,
        settings: { simplifyDebts: true, locked: false, archived: false },
        seq: 0,
      },
      {
        slug: "trip-real-gone",
        name: "Trip Gone",
        baseCurrency: "IDR",
        template: "trip",
        createdAt: 1_000,
        settings: { simplifyDebts: true, locked: false, archived: false },
        seq: 0,
        deletedAt: 5_000,
      },
    ],
    members: [
      { memberId: "m1", groupSlug: "trip-real", name: "Dimas", color: "--m-1", joinedAt: 1_000, seq: 0 },
      {
        memberId: "m2",
        groupSlug: "trip-real",
        name: "Sri",
        color: "--m-2",
        joinedAt: 1_000,
        seq: 0,
        deletedAt: 5_000,
      },
    ],
    expenses: [
      { ...baseExpense, expenseId: "e1", date: 1_000 },
      { ...baseExpense, expenseId: "e2", date: 2_000, deletedAt: 5_000 },
    ],
    settlements: [
      {
        settlementId: "s1",
        groupSlug: "trip-real",
        fromMemberId: "m2",
        toMemberId: "m1",
        amountMinor: 100_000,
        currency: "IDR",
        date: 1_000,
        createdAt: 1_000,
        seq: 0,
      },
    ],
    activityLog: [
      {
        logId: "l1",
        groupSlug: "trip-real",
        actorMemberId: "m1",
        action: "expense.created",
        targetId: "e1",
        at: 1_000,
        seq: 0,
      },
    ],
  };
}

async function seedDataset(dexie: Dexie, dataset: Dataset): Promise<void> {
  await dexie.table<GroupRecord, string>("groups").bulkPut([...dataset.groups]);
  await dexie.table<MemberRecord, string>("members").bulkPut([...dataset.members]);
  await dexie.table<ExpenseRecord, string>("expenses").bulkPut([...dataset.expenses]);
  await dexie.table<SettlementRecord, string>("settlements").bulkPut([...dataset.settlements]);
  await dexie.table<ActivityLogRecord, string>("activityLog").bulkPut([...dataset.activityLog]);
}

async function seedAndClose(dbName: string, steps: readonly MigrationStep[], dataset: Dataset): Promise<void> {
  const dexie = new Dexie(dbName);
  applyMigrations(dexie, steps);
  await dexie.open();
  await seedDataset(dexie, dataset);
  dexie.close();
}

async function countAll(dexie: Dexie): Promise<Record<string, number>> {
  return {
    groups: await dexie.table("groups").count(),
    members: await dexie.table("members").count(),
    expenses: await dexie.table("expenses").count(),
    settlements: await dexie.table("settlements").count(),
    activityLog: await dexie.table("activityLog").count(),
  };
}

async function expectRowCountsMatch(dexie: Dexie, dataset: Dataset): Promise<void> {
  expect(await countAll(dexie)).toEqual({
    groups: dataset.groups.length,
    members: dataset.members.length,
    expenses: dataset.expenses.length,
    settlements: dataset.settlements.length,
    activityLog: dataset.activityLog.length,
  });
}

describe("applyMigrations against the production migrations list", () => {
  const dbName = "bagibill-migrations-real";

  afterEach(async () => {
    await Dexie.delete(dbName);
  });

  it("reopening data written under the real schema loses no rows and keeps every record identical", async () => {
    const dataset = buildDataset();
    await seedAndClose(dbName, migrations, dataset);

    const reopened = new Dexie(dbName);
    applyMigrations(reopened, migrations);
    await reopened.open();

    await expectRowCountsMatch(reopened, dataset);
    expect(await reopened.table<GroupRecord, string>("groups").toArray()).toEqual(
      expect.arrayContaining([...dataset.groups]),
    );
    expect(await reopened.table<MemberRecord, string>("members").toArray()).toEqual(
      expect.arrayContaining([...dataset.members]),
    );
    expect(await reopened.table<ExpenseRecord, string>("expenses").toArray()).toEqual(
      expect.arrayContaining([...dataset.expenses]),
    );
    expect(await reopened.table<SettlementRecord, string>("settlements").toArray()).toEqual(
      expect.arrayContaining([...dataset.settlements]),
    );
    expect(await reopened.table<ActivityLogRecord, string>("activityLog").toArray()).toEqual(
      expect.arrayContaining([...dataset.activityLog]),
    );

    reopened.close();
  });
});

describe("applyMigrations with a synthetic v1 -> v2 upgrade", () => {
  const dbName = "bagibill-migrations-synthetic";
  const versionOneStep = migrations[0];
  if (!versionOneStep) {
    throw new Error("production migrations list must not be empty");
  }

  type MemberRecordWithReminder = MemberRecord & { remindedAt: number };

  const versionTwoStep: MigrationStep = {
    version: 2,
    stores: {
      groups: "slug",
      // remindedAt is new in this test-only v2 — proves a fresh index
      // survives an upgrade and is queryable afterwards.
      members: "memberId, groupSlug, remindedAt",
      expenses: "expenseId, groupSlug, [groupSlug+date]",
      settlements: "settlementId, groupSlug",
      activityLog: "logId, groupSlug",
    },
    upgrade: async (tx) => {
      await tx
        .table<MemberRecordWithReminder, string>("members")
        .toCollection()
        .modify((member) => {
          member.remindedAt = 0;
        });
    },
  };

  afterEach(async () => {
    await Dexie.delete(dbName);
  });

  it("keeps every row, fills the new field on old rows, keeps soft-deleted rows, and the new index is queryable", async () => {
    const dataset = buildDataset();
    await seedAndClose(dbName, [versionOneStep], dataset);

    const reopened = new Dexie(dbName);
    applyMigrations(reopened, [versionOneStep, versionTwoStep]);
    await reopened.open();

    await expectRowCountsMatch(reopened, dataset);

    const members = await reopened.table<MemberRecordWithReminder, string>("members").toArray();
    expect(members.every((member) => member.remindedAt === 0)).toBe(true);
    expect(members.find((member) => member.memberId === "m2")?.deletedAt).toBe(5_000);

    const remindedRows = await reopened
      .table<MemberRecordWithReminder, string>("members")
      .where("remindedAt")
      .equals(0)
      .toArray();
    expect(remindedRows.length).toBe(dataset.members.length);

    reopened.close();
  });
});

describe("applyMigrations version-order guard", () => {
  const dummyStores = { groups: "slug" };
  const dexie = new Dexie("bagibill-migrations-guard");

  it("rejects a list that doesn't start at version 1", () => {
    expect(() => applyMigrations(dexie, [{ version: 2, stores: dummyStores }])).toThrow(
      "Migration steps must start at version 1",
    );
  });

  it("rejects a list with duplicate versions", () => {
    expect(() =>
      applyMigrations(dexie, [
        { version: 1, stores: dummyStores },
        { version: 1, stores: dummyStores },
      ]),
    ).toThrow(/sequential/);
  });

  it("rejects a list with a version gap", () => {
    expect(() =>
      applyMigrations(dexie, [
        { version: 1, stores: dummyStores },
        { version: 3, stores: dummyStores },
      ]),
    ).toThrow(/sequential/);
  });
});

describe("current schema version", () => {
  it("locks at 1 with exactly one migration step, derived from the migrations list", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(migrations.length).toBe(1);
  });
});
