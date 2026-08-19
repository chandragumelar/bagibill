import type { StorageAdapter } from "./adapter";
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

// Takes the storage adapter, clock, and id generator as arguments rather
// than importing singletons (same reasoning as K-53's Clock injection) —
// tests run without leaking state into each other, and every source of
// "now", "new id", or storage stays swappable.
export function createGroupRepository(
  adapter: StorageAdapter,
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
    await adapter.groups.put(group);
    return group;
  }

  async function getGroupBySlug(slug: string): Promise<GroupRecord | undefined> {
    const group = await adapter.groups.get(slug);
    if (group === undefined || group.deletedAt !== undefined) {
      return undefined;
    }
    return group;
  }

  async function listGroups(): Promise<readonly GroupRecord[]> {
    const groups = await adapter.groups.all();
    return groups
      .filter((group) => group.deletedAt === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async function updateGroupSettings(slug: string, patch: Partial<GroupSettings>): Promise<void> {
    const group = await adapter.groups.get(slug);
    if (group === undefined) {
      throw new Error("updateGroupSettings: no group found for the given slug");
    }
    await adapter.groups.put({ ...group, settings: { ...group.settings, ...patch } });
  }

  async function archiveGroup(slug: string): Promise<void> {
    await updateGroupSettings(slug, { archived: true });
  }

  // Soft delete only, matching spec.md 5.2 — nothing at this layer is ever
  // physically removed.
  async function deleteGroup(slug: string): Promise<void> {
    const group = await adapter.groups.get(slug);
    if (group === undefined) {
      throw new Error("deleteGroup: no group found for the given slug");
    }
    await adapter.groups.put({ ...group, deletedAt: clock.now() });
  }

  return { createGroup, getGroupBySlug, listGroups, updateGroupSettings, archiveGroup, deleteGroup };
}
