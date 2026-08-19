import "fake-indexeddb/auto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "./schema";
import { createFixedClock } from "./clock";
import { createSequentialIdGenerator } from "./id";
import { createGroupRepository } from "./group-repository";
import { GROUP_TEMPLATES, type GroupTemplateKey } from "./templates";

beforeAll(async () => {
  await db.open();
});

afterEach(async () => {
  await db.groups.clear();
});

describe("createGroup", () => {
  it("applies each template's settings to the created group", async () => {
    const repository = createGroupRepository(db, createFixedClock(1_000), createSequentialIdGenerator());
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
    const repository = createGroupRepository(db, createFixedClock(0), createSequentialIdGenerator());
    const groupA = await repository.createGroup({ name: "A", baseCurrency: "IDR", template: "blank" });
    const groupB = await repository.createGroup({ name: "B", baseCurrency: "IDR", template: "blank" });
    expect(groupA.slug).not.toBe(groupB.slug);
  });
});

describe("getGroupBySlug", () => {
  it("returns nothing for a deleted group", async () => {
    const repository = createGroupRepository(db, createFixedClock(0), createSequentialIdGenerator());
    const group = await repository.createGroup({ name: "Trip", baseCurrency: "IDR", template: "trip" });
    await repository.deleteGroup(group.slug);
    expect(await repository.getGroupBySlug(group.slug)).toBeUndefined();
  });
});

describe("listGroups", () => {
  it("excludes deleted groups", async () => {
    const repository = createGroupRepository(db, createFixedClock(0), createSequentialIdGenerator());
    const keep = await repository.createGroup({ name: "Keep", baseCurrency: "IDR", template: "blank" });
    const gone = await repository.createGroup({ name: "Gone", baseCurrency: "IDR", template: "blank" });
    await repository.deleteGroup(gone.slug);
    const groups = await repository.listGroups();
    expect(groups.map((group) => group.slug)).toEqual([keep.slug]);
  });
});

describe("archiveGroup", () => {
  it("does not remove the group from storage", async () => {
    const repository = createGroupRepository(db, createFixedClock(0), createSequentialIdGenerator());
    const group = await repository.createGroup({ name: "Trip", baseCurrency: "IDR", template: "trip" });
    await repository.archiveGroup(group.slug);
    const stored = await repository.getGroupBySlug(group.slug);
    expect(stored?.settings.archived).toBe(true);
  });
});

describe("updateGroupSettings", () => {
  it("patches without dropping other settings fields", async () => {
    const repository = createGroupRepository(db, createFixedClock(0), createSequentialIdGenerator());
    const group = await repository.createGroup({ name: "Trip", baseCurrency: "IDR", template: "trip" });
    await repository.updateGroupSettings(group.slug, { locked: true });
    const stored = await repository.getGroupBySlug(group.slug);
    expect(stored?.settings.locked).toBe(true);
    expect(stored?.settings.simplifyDebts).toBe(group.settings.simplifyDebts);
    expect(stored?.settings.archived).toBe(group.settings.archived);
  });
});
