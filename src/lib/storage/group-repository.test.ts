import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "./schema";
import { createDexieAdapter } from "./adapter";
import { createFixedClock } from "./clock";
import { createSequentialIdGenerator } from "./id";
import { createGroupRepository } from "./group-repository";
import { GROUP_TEMPLATES, type GroupTemplateKey } from "./templates";

const adapter = createDexieAdapter(db);

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

describe("createGroup", () => {
  it("applies each template's settings to the created group", async () => {
    const repository = createGroupRepository(adapter, createFixedClock(1_000), createSequentialIdGenerator());
    const templateKeys = Object.keys(GROUP_TEMPLATES) as GroupTemplateKey[];

    for (const templateKey of templateKeys) {
      const group = await repository.createGroup({
        name: "Test Group",
        baseCurrency: "IDR",
        template: templateKey,
      });
      expect(group.template).toBe(templateKey);
      expect(group.settings.simplifyDebts).toBe(GROUP_TEMPLATES[templateKey].simplifyDebtsDefault);
      expect(group.settings.archived).toBe(false);
      expect(group.settings.locked).toBe(false);
    }
  });

  it("gives two groups different slugs", async () => {
    const repository = createGroupRepository(adapter, createFixedClock(0), createSequentialIdGenerator());
    const groupA = await repository.createGroup({ name: "A", baseCurrency: "IDR", template: "blank" });
    const groupB = await repository.createGroup({ name: "B", baseCurrency: "IDR", template: "blank" });
    expect(groupA.slug).not.toBe(groupB.slug);
  });
});

describe("getGroupBySlug", () => {
  it("returns nothing for a deleted group", async () => {
    const repository = createGroupRepository(adapter, createFixedClock(0), createSequentialIdGenerator());
    const group = await repository.createGroup({ name: "Trip", baseCurrency: "IDR", template: "trip" });
    await repository.deleteGroup(group.slug);
    expect(await repository.getGroupBySlug(group.slug)).toBeUndefined();
  });

  it("soft-deletes every record belonging to the deleted group at one timestamp", async () => {
    const deletedAt = 5_000;
    const repository = createGroupRepository(adapter, createFixedClock(deletedAt), createSequentialIdGenerator());
    const group = await repository.createGroup({ name: "Trip", baseCurrency: "IDR", template: "trip" });
    await adapter.members.put({ memberId: "m1", groupSlug: group.slug, name: "Andi", color: "--m-1", joinedAt: 1, seq: 0 });
    await adapter.expenses.put({
      expenseId: "e1",
      groupSlug: group.slug,
      title: "Makan",
      category: "food",
      date: 1,
      notes: "",
      currency: "IDR",
      fxRate: 1,
      amountTotalMinor: 1_000,
      payers: [],
      splitData: { mode: "evenly", memberIds: [] },
      charges: [],
      items: [],
      treats: [],
      attachments: [],
      createdBy: "m1",
      createdAt: 1,
      updatedAt: 1,
      seq: 0,
    });
    await adapter.settlements.put({
      settlementId: "s1",
      groupSlug: group.slug,
      fromMemberId: "m1",
      toMemberId: "m2",
      amountMinor: 1_000,
      currency: "IDR",
      date: 1,
      createdAt: 1,
      seq: 0,
    });
    await adapter.activityLog.put({
      logId: "l1",
      groupSlug: group.slug,
      actorMemberId: "m1",
      action: "group.created",
      targetId: group.slug,
      at: 1,
      seq: 0,
    });

    await repository.deleteGroup(group.slug);

    await expect(adapter.groups.get(group.slug)).resolves.toMatchObject({ deletedAt });
    await expect(adapter.members.get("m1")).resolves.toMatchObject({ deletedAt });
    await expect(adapter.expenses.get("e1")).resolves.toMatchObject({ deletedAt });
    await expect(adapter.settlements.get("s1")).resolves.toMatchObject({ deletedAt });
    await expect(adapter.activityLog.get("l1")).resolves.toMatchObject({ deletedAt });
  });
});

describe("listGroups", () => {
  it("excludes deleted groups", async () => {
    const repository = createGroupRepository(adapter, createFixedClock(0), createSequentialIdGenerator());
    const keep = await repository.createGroup({ name: "Keep", baseCurrency: "IDR", template: "blank" });
    const gone = await repository.createGroup({ name: "Gone", baseCurrency: "IDR", template: "blank" });
    await repository.deleteGroup(gone.slug);
    const groups = await repository.listGroups();
    expect(groups.map((group) => group.slug)).toEqual([keep.slug]);
  });
});

describe("archiveGroup", () => {
  it("does not remove the group from storage", async () => {
    const repository = createGroupRepository(adapter, createFixedClock(0), createSequentialIdGenerator());
    const group = await repository.createGroup({ name: "Trip", baseCurrency: "IDR", template: "trip" });
    await repository.archiveGroup(group.slug);
    const stored = await repository.getGroupBySlug(group.slug);
    expect(stored?.settings.archived).toBe(true);
  });
});

describe("updateGroupSettings", () => {
  it("patches without dropping other settings fields", async () => {
    const repository = createGroupRepository(adapter, createFixedClock(0), createSequentialIdGenerator());
    const group = await repository.createGroup({ name: "Trip", baseCurrency: "IDR", template: "trip" });
    await repository.updateGroupSettings(group.slug, { locked: true });
    const stored = await repository.getGroupBySlug(group.slug);
    expect(stored?.settings.locked).toBe(true);
    expect(stored?.settings.simplifyDebts).toBe(group.settings.simplifyDebts);
    expect(stored?.settings.archived).toBe(group.settings.archived);
  });
});
