// Category keys follow spec.md 12.3's eight defaults. English keys only —
// the id/en display text lives in the locale files, never here.
export type CategoryKey =
  | "food"
  | "transport"
  | "stay"
  | "shopping"
  | "fun"
  | "bills"
  | "health"
  | "other";

const ALL_CATEGORY_KEYS: readonly CategoryKey[] = [
  "food",
  "transport",
  "stay",
  "shopping",
  "fun",
  "bills",
  "health",
  "other",
];

// spec.md 12.1 names five templates (Trip, Roommate, Pasangan, Acara sekali
// jalan, Kosong) but doesn't map categories, simplifyDebts, or recurring per
// template — these keys are internal identifiers only, same pattern as K-04
// (adjustment/Selisih). Display names live in the locale files.
export type GroupTemplateKey = "trip" | "roommate" | "couple" | "one_off_event" | "blank";

export interface GroupTemplate {
  readonly key: GroupTemplateKey;
  readonly defaultCategories: readonly CategoryKey[];
  readonly simplifyDebtsDefault: boolean;
  readonly recurringEnabled: boolean;
}

// Per-template category/simplify/recurring values are NOT in spec.md 12.3 —
// this mapping is a guess, called out in the F2-02 report for correction.
export const GROUP_TEMPLATES: Readonly<Record<GroupTemplateKey, GroupTemplate>> = {
  trip: {
    key: "trip",
    defaultCategories: ["transport", "stay", "food", "fun", "shopping", "other"],
    simplifyDebtsDefault: true,
    recurringEnabled: false,
  },
  roommate: {
    key: "roommate",
    defaultCategories: ["bills", "food", "shopping", "other"],
    simplifyDebtsDefault: true,
    recurringEnabled: true,
  },
  couple: {
    key: "couple",
    defaultCategories: ["food", "fun", "shopping", "transport", "other"],
    simplifyDebtsDefault: true,
    recurringEnabled: false,
  },
  one_off_event: {
    key: "one_off_event",
    defaultCategories: ["food", "shopping", "fun", "other"],
    simplifyDebtsDefault: true,
    recurringEnabled: false,
  },
  blank: {
    key: "blank",
    // Blank makes no assumption about what the group is for, so it gets
    // every default category instead of a curated subset.
    defaultCategories: ALL_CATEGORY_KEYS,
    simplifyDebtsDefault: true,
    recurringEnabled: false,
  },
};
