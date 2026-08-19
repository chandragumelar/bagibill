import type { BagiBillDatabase } from "./schema";
import type { Clock } from "./clock";
import type { IdGenerator } from "./id";
import { GROUP_TEMPLATES, type GroupTemplateKey } from "./templates";
import type { GroupRecord, GroupSettings } from "./records";

export interface CreateGroupInput {
  readonly name: string;
  readonly baseCurrency: string;
  readonly template: GroupTemplateKey;
}

export interface GroupRepository {
  createGroup(input: CreateGroupInput): Promise<GroupRecord>;
  getGroupBySlug(slug: string): Promise<GroupRecord | undefined>;
  listGroups(): Promise<readonly GroupRecord[]>;
  updateGroupSettings(slug: string, patch: Partial<GroupSettings>): Promise<void>;
  archiveGroup(slug: string): Promise<void>;
  deleteGroup(slug: string): Promise<void>;
}

// Takes the database, clock, and id generator as arguments rather than
// importing singletons (same reasoning as K-53's Clock injection) — tests
// run without leaking state into each other, and every source of "now" or
// "new id" stays swappable. F2-03 is where a real storage adapter
// generalizes this; injecting the database instance is enough for this
// layer to be swappable without guessing that adapter's shape from one
// consumer.
export function createGroupRepository(
  db: BagiBillDatabase,
  clock: Clock,
  idGenerator: IdGenerator,
): GroupRepository {
  async function createGroup(input: CreateGroupInput): Promise<GroupRecord> {
    const template = GROUP_TEMPLATES[input.template];
    const group: GroupRecord = {
      slug: idGenerator.nextSlug(),
      name: input.name,
      baseCurrency: input.baseCurrency,
      template: input.template,
      createdAt: clock.now(),
      settings: {
        simplifyDebts: template.simplifyDebtsDefault,
        locked: false,
        archived: false,
      },
      seq: 0,
    };
    await db.groups.add(group);
    return group;
  }

  async function getGroupBySlug(slug: string): Promise<GroupRecord | undefined> {
    const group = await db.groups.get(slug);
    if (group === undefined || group.deletedAt !== undefined) {
      return undefined;
    }
    return group;
  }

  async function listGroups(): Promise<readonly GroupRecord[]> {
    const groups = await db.groups.toArray();
    return groups
      .filter((group) => group.deletedAt === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async function updateGroupSettings(slug: string, patch: Partial<GroupSettings>): Promise<void> {
    const group = await db.groups.get(slug);
    if (group === undefined) {
      throw new Error("updateGroupSettings: no group found for the given slug");
    }
    await db.groups.update(slug, { settings: { ...group.settings, ...patch } });
  }

  async function archiveGroup(slug: string): Promise<void> {
    await updateGroupSettings(slug, { archived: true });
  }

  // Soft delete only, matching spec.md 5.2 — nothing at this layer is ever
  // physically removed.
  async function deleteGroup(slug: string): Promise<void> {
    await db.groups.update(slug, { deletedAt: clock.now() });
  }

  return { createGroup, getGroupBySlug, listGroups, updateGroupSettings, archiveGroup, deleteGroup };
}
