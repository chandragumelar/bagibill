import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { splitByItems } from "@bagibill/split-engine";
import type { ExpenseItem } from "@bagibill/split-engine";
import { db } from "./schema";
import type {
  ActivityLogRecord,
  ExpenseItemRecord,
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

describe("schema", () => {
  it("opens at version 1", () => {
    expect(db.verno).toBe(1);
  });

  it("has every table", () => {
    const tableNames = db.tables.map((table) => table.name).sort();
    expect(tableNames).toEqual(["activityLog", "expenses", "groups", "members", "settlements"]);
  });

  it("indexes members by groupSlug", () => {
    const indexNames = db.members.schema.indexes.map((index) => index.name);
    expect(indexNames).toContain("groupSlug");
  });

  it("indexes expenses by groupSlug and by the compound [groupSlug+date]", () => {
    const indexNames = db.expenses.schema.indexes.map((index) => index.name);
    expect(indexNames).toContain("groupSlug");
    expect(indexNames).toContain("[groupSlug+date]");
  });

  it("indexes settlements and activityLog by groupSlug", () => {
    expect(db.settlements.schema.indexes.map((index) => index.name)).toContain("groupSlug");
    expect(db.activityLog.schema.indexes.map((index) => index.name)).toContain("groupSlug");
  });

  it("writes and reads back a GroupRecord unchanged", async () => {
    const group: GroupRecord = {
      slug: "trip-bali",
      name: "Trip Bali",
      baseCurrency: "IDR",
      template: "trip",
      createdAt: 1_000,
      settings: { simplifyDebts: true, locked: false, archived: false },
      seq: 0,
    };
    await db.groups.put(group);
    const readBack = await db.groups.get("trip-bali");
    expect(readBack).toEqual(group);
  });

  it("writes and reads back a MemberRecord unchanged", async () => {
    const member: MemberRecord = {
      memberId: "m1",
      groupSlug: "trip-bali",
      name: "Dimas",
      color: "--m-1",
      joinedAt: 1_000,
      seq: 0,
    };
    await db.members.put(member);
    const readBack = await db.members.get("m1");
    expect(readBack).toEqual(member);
  });

  it("writes and reads back an ExpenseRecord unchanged, minor-unit amounts intact", async () => {
    const expense: ExpenseRecord = {
      expenseId: "e1",
      groupSlug: "trip-bali",
      title: "Makan malam",
      category: "food",
      date: 1_000,
      notes: "",
      currency: "IDR",
      fxRate: 1,
      amountTotalMinor: 150_000,
      payers: [{ memberId: "m1", amountMinor: 150_000 }],
      splitData: { mode: "evenly", memberIds: ["m1", "m2", "m3"] },
      charges: [],
      items: [],
      treats: [],
      attachments: [],
      createdBy: "device-1",
      createdAt: 1_000,
      updatedAt: 1_000,
      seq: 0,
    };
    await db.expenses.put(expense);
    const readBack = await db.expenses.get("e1");
    expect(readBack).toEqual(expense);
    expect(readBack?.amountTotalMinor).toBe(150_000);
  });

  it("writes and reads back a SettlementRecord unchanged", async () => {
    const settlement: SettlementRecord = {
      settlementId: "s1",
      groupSlug: "trip-bali",
      fromMemberId: "m1",
      toMemberId: "m2",
      amountMinor: 50_000,
      currency: "IDR",
      date: 1_000,
      createdAt: 1_000,
      seq: 0,
    };
    await db.settlements.put(settlement);
    const readBack = await db.settlements.get("s1");
    expect(readBack).toEqual(settlement);
  });

  it("writes and reads back an ActivityLogRecord unchanged", async () => {
    const log: ActivityLogRecord = {
      logId: "l1",
      groupSlug: "trip-bali",
      actorMemberId: "m1",
      action: "expense.created",
      targetId: "e1",
      at: 1_000,
      seq: 0,
    };
    await db.activityLog.put(log);
    const readBack = await db.activityLog.get("l1");
    expect(readBack).toEqual(log);
  });

  it("returns a group's expenses in date order via the [groupSlug+date] index", async () => {
    const baseExpense = {
      groupSlug: "trip-bali",
      title: "x",
      category: "food",
      notes: "",
      currency: "IDR",
      fxRate: 1,
      amountTotalMinor: 10_000,
      payers: [],
      splitData: { mode: "evenly" as const, memberIds: [] },
      charges: [],
      items: [],
      treats: [],
      attachments: [],
      createdBy: "device-1",
      createdAt: 1_000,
      updatedAt: 1_000,
      seq: 0,
    };
    await db.expenses.bulkPut([
      { ...baseExpense, expenseId: "e-mid", date: 2_000 },
      { ...baseExpense, expenseId: "e-first", date: 1_000 },
      { ...baseExpense, expenseId: "e-last", date: 3_000 },
    ]);

    const ordered = await db.expenses.where("[groupSlug+date]").between(["trip-bali", 0], ["trip-bali", Infinity]).toArray();

    expect(ordered.map((expense) => expense.expenseId)).toEqual(["e-first", "e-mid", "e-last"]);
  });

  // Syarat selesai plan.md F2-01: tipe rekaman dan tipe engine satu sumber.
  // Kalau bentuknya pernah menyimpang, mapping di bawah ini yang merah
  // duluan saat typecheck atau saat splitByItems menolak inputnya. Fungsi
  // pemetaan sungguhan (memberId <-> index) belum ditulis di sini — itu
  // tugas repository di F2-03, ini cuma pembuktian inline.
  it("maps ExpenseItemRecord to the engine's ExpenseItem and runs through splitByItems", () => {
    const memberIdsInOrder = ["m1", "m2", "m3"];
    const itemRecords: readonly ExpenseItemRecord[] = [
      {
        itemId: "i1",
        name: "Nasi Goreng",
        unitPriceMinor: 30_000,
        quantity: 1,
        claims: [
          { memberId: "m1", weight: 1 },
          { memberId: "m2", weight: 1 },
        ],
      },
      {
        itemId: "i2",
        name: "Es Teh",
        unitPriceMinor: 10_000,
        quantity: 3,
        claims: [{ memberId: "m3", weight: 1 }],
      },
    ];

    const items: ExpenseItem[] = itemRecords.map((itemRecord) => ({
      unitPriceMinor: itemRecord.unitPriceMinor,
      quantity: itemRecord.quantity,
      claims: itemRecord.claims.map((claim) => ({
        participantIndex: memberIdsInOrder.indexOf(claim.memberId),
        weight: claim.weight,
      })),
    }));

    const result = splitByItems({ participantCount: memberIdsInOrder.length, items });

    expect(result.totalMinor).toBe(60_000);
    expect(result.sharesMinor.length).toBe(3);
  });
});
