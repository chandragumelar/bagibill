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

// spec.md 12.1 names five templates (Trip, Roommate, Pasangan, Acara sekali
// jalan, Kosong) but doesn't map categories, simplifyDebts, or recurring per
// template — these keys are internal identifiers only, same pattern as K-04
// (adjustment/Selisih). Display names live in the locale files.
//
// defaultCategories below is corrected against docs/mockups/
// Buat_Grup___Kelola_Member.html's "Template dipilih" state (F3-09,
// progress.md Keputusan) — the mockup is the first real reference this
// mapping ever had. Its chips are finer-grained than our 8 CategoryKeys
// (roommate shows "Sewa"/"Listrik"/"Air" as three separate chips, all of
// which fold into "bills" here since there's no sub-category concept in
// gelombang 1) and one is an interpretive call ("Tiket" for trip → "fun",
// the closest of the 8 keys to "tickets/attractions"). Categories the
// mockup didn't display for a template are dropped rather than kept from
// the old guess — the mockup is the source now, not a hint layered on top
// of the guess.
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
    defaultCategories: ["transport", "stay", "food", "fun"],
    simplifyDebtsDefault: true,
    recurringEnabled: false,
  },
  roommate: {
    key: "roommate",
    defaultCategories: ["bills", "shopping"],
    simplifyDebtsDefault: true,
    recurringEnabled: true,
  },
  couple: {
    key: "couple",
    defaultCategories: ["food", "fun", "shopping"],
    // Two people only ever owe in one direction, so Simplify has nothing to
    // simplify — defaulting it on makes the settings toggle look
    // meaningful when it's a no-op for this template. Confirmed against the
    // mockup's "Pasangan" state, which shows the toggle already off.
    simplifyDebtsDefault: false,
    recurringEnabled: false,
  },
  one_off_event: {
    key: "one_off_event",
    defaultCategories: ["food", "transport"],
    simplifyDebtsDefault: true,
    recurringEnabled: false,
  },
  blank: {
    key: "blank",
    // Mockup's "Kosong" state renders "Tanpa kategori bawaan — tambah
    // sendiri nanti." — an explicitly empty set, not every category. Blank
    // makes no assumption about the group at all, including which of the
    // 8 categories apply.
    defaultCategories: [],
    simplifyDebtsDefault: true,
    recurringEnabled: false,
  },
};
