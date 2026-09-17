import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDexieAdapter } from "./adapter";
import { createFixedClock } from "./clock";
import { db } from "./schema";
import { DELETED_RECORD_RETENTION_MS, purgeExpiredDeletedRecords } from "./storage-cleanup";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await Promise.all([db.groups.clear(), db.members.clear(), db.expenses.clear(), db.settlements.clear(), db.activityLog.clear()]);
});

describe("purgeExpiredDeletedRecords", () => {
  it("permanently removes deleted records at 30 days and preserves newer records", async () => {
    const nowMs = 100_000 + DELETED_RECORD_RETENTION_MS;
    const adapter = createDexieAdapter(db);
    await adapter.groups.put({
      slug: "expired",
      name: "Expired",
      baseCurrency: "IDR",
      template: "trip",
      createdAt: 1,
      settings: { simplifyDebts: true, locked: false, archived: false },
      seq: 0,
      deletedAt: 100_000,
    });
    await adapter.groups.put({
      slug: "retained",
      name: "Retained",
      baseCurrency: "IDR",
      template: "trip",
      createdAt: 1,
      settings: { simplifyDebts: true, locked: false, archived: false },
      seq: 0,
      deletedAt: 100_001,
    });

    await purgeExpiredDeletedRecords(adapter, createFixedClock(nowMs));

    expect(await adapter.groups.get("expired")).toBeUndefined();
    expect(await adapter.groups.get("retained")).toMatchObject({ deletedAt: 100_001 });
  });
});
