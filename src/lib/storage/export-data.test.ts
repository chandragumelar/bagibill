import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "./schema";
import { createDexieAdapter } from "./adapter";
import { createFixedClock } from "./clock";
import { CURRENT_SCHEMA_VERSION } from "./migrations";
import { exportAllData, serializeExport } from "./export-data";
import type {
  ActivityLogRecord,
  ExpenseRecord,
  GroupRecord,
  MemberRecord,
  SettlementRecord,
} from "./records";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([
    db.groups.clear(),
    db.members.clear(),
    db.expenses.clear(),
    db.settlements.clear(),
    db.activityLog.clear(),
  ]);
});

function makeGroup(overrides: Partial<GroupRecord> = {}): GroupRecord {
  return {
    slug: "g1",
    name: "Trip",
    baseCurrency: "IDR",
    template: "trip",
    createdAt: 1_000,
    settings: { simplifyDebts: true, locked: false, archived: false },
    seq: 0,
    ...overrides,
  };
}

function makeMember(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    memberId: "m1",
    groupSlug: "g1",
    name: "Dimas",
    color: "--m-1",
    joinedAt: 1_000,
    seq: 0,
    ...overrides,
  };
}

function makeExpense(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    expenseId: "e1",
    groupSlug: "g1",
    title: "Makan",
    category: "food",
    date: 1_000,
    notes: "",
    currency: "IDR",
    fxRate: 1,
    amountTotalMinor: 10_000,
    payers: [{ memberId: "m1", amountMinor: 10_000 }],
    splitData: { mode: "evenly", memberIds: ["m1"] },
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: "device-1",
    createdAt: 1_000,
    updatedAt: 1_000,
    seq: 0,
    ...overrides,
  };
}

function makeSettlement(overrides: Partial<SettlementRecord> = {}): SettlementRecord {
  return {
    settlementId: "s1",
    groupSlug: "g1",
    fromMemberId: "m1",
    toMemberId: "m2",
    amountMinor: 5_000,
    currency: "IDR",
    date: 1_000,
    createdAt: 1_000,
    seq: 0,
    ...overrides,
  };
}

function makeActivityLog(overrides: Partial<ActivityLogRecord> = {}): ActivityLogRecord {
  return {
    logId: "l1",
    groupSlug: "g1",
    actorMemberId: "m1",
    action: "expense.create",
    targetId: "e1",
    at: 1_000,
    seq: 0,
    ...overrides,
  };
}

describe("exportAllData", () => {
  it("exports every table's full contents unchanged", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.groups.put(makeGroup());
    await adapter.members.put(makeMember());
    await adapter.expenses.put(makeExpense());
    await adapter.settlements.put(makeSettlement());
    await adapter.activityLog.put(makeActivityLog());

    const bundle = await exportAllData(adapter, createFixedClock(5_000));

    expect(bundle.groups).toEqual([makeGroup()]);
    expect(bundle.members).toEqual([makeMember()]);
    expect(bundle.expenses).toEqual([makeExpense()]);
    expect(bundle.settlements).toEqual([makeSettlement()]);
    expect(bundle.activityLog).toEqual([makeActivityLog()]);
  });

  it("includes soft-deleted records instead of filtering them out", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.expenses.put(makeExpense({ deletedAt: 2_000 }));

    const bundle = await exportAllData(adapter, createFixedClock(5_000));

    expect(bundle.expenses).toHaveLength(1);
    expect(bundle.expenses[0]?.deletedAt).toBe(2_000);
  });

  it("returns five empty arrays for an empty database, not an error", async () => {
    const adapter = createDexieAdapter(db);
    const bundle = await exportAllData(adapter, createFixedClock(5_000));

    expect(bundle.groups).toEqual([]);
    expect(bundle.members).toEqual([]);
    expect(bundle.expenses).toEqual([]);
    expect(bundle.settlements).toEqual([]);
    expect(bundle.activityLog).toEqual([]);
  });

  it("stamps schemaVersion with the current schema version", async () => {
    const adapter = createDexieAdapter(db);
    const bundle = await exportAllData(adapter, createFixedClock(5_000));
    expect(bundle.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("stamps exportedAt from the injected clock, not the system clock", async () => {
    const adapter = createDexieAdapter(db);
    const bundle = await exportAllData(adapter, createFixedClock(42_000));
    expect(bundle.exportedAt).toBe(42_000);
  });
});

describe("serializeExport", () => {
  it("round-trips minor-unit money amounts through JSON without turning them into floats", async () => {
    const adapter = createDexieAdapter(db);
    await adapter.expenses.put(makeExpense({ amountTotalMinor: 1_234_567 }));

    const bundle = await exportAllData(adapter, createFixedClock(5_000));
    const roundTripped = JSON.parse(serializeExport(bundle)) as { expenses: ExpenseRecord[] };

    expect(roundTripped.expenses[0]?.amountTotalMinor).toBe(1_234_567);
    expect(Number.isInteger(roundTripped.expenses[0]?.amountTotalMinor)).toBe(true);
  });

  it("indents with two spaces", async () => {
    const adapter = createDexieAdapter(db);
    const bundle = await exportAllData(adapter, createFixedClock(5_000));
    expect(serializeExport(bundle)).toContain('\n  "formatVersion"');
  });
});
