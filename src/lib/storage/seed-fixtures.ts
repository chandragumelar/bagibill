import type { CreateExpenseInput } from "./expense-repository";
import type { ExpenseItemRecord, MemberRecord } from "./records";
import type { SeedDeps } from "./seed-data";
import type { CreateSettlementInput } from "./settlement-repository";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEED_DEVICE = "seed-device";

export interface GroupSeedResult {
  readonly group: { readonly slug: string; readonly name: string };
  readonly memberCount: number;
  readonly expenseCount: number;
  readonly settlementCount: number;
}

// `const Names` preserves the tuple shape so call sites can destructure
// `[dimas, sari, ...]` by position instead of looking each one up by name.
async function addMembersInOrder<const Names extends readonly string[]>(
  deps: SeedDeps,
  groupSlug: string,
  names: Names,
): Promise<{ [K in keyof Names]: MemberRecord }> {
  const members: MemberRecord[] = [];
  for (const name of names) {
    // Sequential, not Promise.all: addMember derives the next color from how
    // many members already exist (K-07) — concurrent calls would race it.
    members.push(await deps.memberRepository.addMember({ groupSlug, name }));
  }
  return members as { [K in keyof Names]: MemberRecord };
}

type ExpenseSeed = Pick<
  CreateExpenseInput,
  "groupSlug" | "title" | "category" | "date" | "amountTotalMinor" | "payers" | "splitData"
> &
  Partial<Pick<CreateExpenseInput, "notes" | "currency" | "fxRate" | "charges" | "items" | "treats" | "attachments">>;

function seedExpense(deps: SeedDeps, seed: ExpenseSeed) {
  return deps.expenseRepository.createExpense({
    notes: "",
    currency: "IDR",
    fxRate: 1,
    charges: [],
    items: [],
    treats: [],
    attachments: [],
    createdBy: SEED_DEVICE,
    ...seed,
  });
}

function seedSettlement(deps: SeedDeps, seed: Omit<CreateSettlementInput, "currency">) {
  return deps.settlementRepository.createSettlement({ currency: "IDR", ...seed });
}

export async function buildTripBromo(deps: SeedDeps, nowMs: number): Promise<GroupSeedResult> {
  const group = await deps.groupRepository.createGroup({ name: "Trip Bromo", baseCurrency: "IDR", template: "trip" });
  const [dimas, sari, bagas, nadia, rio] = await addMembersInOrder(deps, group.slug, ["Dimas", "Sari", "Bagas", "Nadia", "Rio"]);
  const memberIds = [dimas.memberId, sari.memberId, bagas.memberId, nadia.memberId, rio.memberId];
  const yesterday = nowMs - ONE_DAY_MS;
  const threeDaysAgo = nowMs - 3 * ONE_DAY_MS;
  const twelveDaysAgo = nowMs - 12 * ONE_DAY_MS;

  await seedExpense(deps, {
    groupSlug: group.slug,
    title: "Sewa jeep",
    category: "transport",
    date: nowMs,
    amountTotalMinor: 1_000_000,
    payers: [{ memberId: dimas.memberId, amountMinor: 600_000 }, { memberId: sari.memberId, amountMinor: 400_000 }],
    splitData: { mode: "evenly", memberIds },
  });
  await seedExpense(deps, {
    groupSlug: group.slug,
    title: "Nasi goreng patungan",
    category: "food",
    date: nowMs,
    amountTotalMinor: 100_000,
    payers: [{ memberId: bagas.memberId, amountMinor: 100_000 }],
    splitData: { mode: "evenly", memberIds: [dimas.memberId, sari.memberId, bagas.memberId] },
  });
  // Rio's weight-0 entry is the point of this fixture: he must still show up
  // in the result with a zero share, never disappear from it.
  await seedExpense(deps, {
    groupSlug: group.slug,
    title: "Tiket masuk kawah",
    category: "fun",
    date: yesterday,
    amountTotalMinor: 400_000,
    payers: [{ memberId: nadia.memberId, amountMinor: 400_000 }],
    splitData: {
      mode: "byWeights",
      entries: [
        { memberId: dimas.memberId, weight: 1 },
        { memberId: sari.memberId, weight: 1 },
        { memberId: bagas.memberId, weight: 1 },
        { memberId: nadia.memberId, weight: 1 },
        { memberId: rio.memberId, weight: 0 },
      ],
    },
  });
  await seedExpense(deps, {
    groupSlug: group.slug,
    title: "Kopi di Cemoro",
    category: "food",
    date: yesterday,
    amountTotalMinor: 150_000,
    payers: [{ memberId: dimas.memberId, amountMinor: 150_000 }],
    splitData: { mode: "evenly", memberIds: [dimas.memberId, nadia.memberId, rio.memberId] },
    treats: [{ kind: "person", sponsorMemberId: dimas.memberId, beneficiaryMemberId: nadia.memberId }],
  });
  // amountTotalMinor is the subtotal (200_000); charges below land on 231_000.
  await seedExpense(deps, {
    groupSlug: group.slug,
    title: "Makan malam di resto",
    category: "food",
    date: threeDaysAgo,
    amountTotalMinor: 200_000,
    payers: [{ memberId: sari.memberId, amountMinor: 231_000 }],
    splitData: { mode: "evenly", memberIds: [dimas.memberId, sari.memberId, bagas.memberId, nadia.memberId] },
    charges: [
      { amount: { kind: "percent", percent: 5, basis: "subtotal" }, allocation: { mode: "proportional" } },
      // Indonesia preset (K-10): PB1 on subtotal + service, not subtotal alone.
      { amount: { kind: "percent", percent: 10, basis: "running_total" }, allocation: { mode: "proportional" } },
    ],
  });
  await seedExpense(deps, {
    groupSlug: group.slug,
    title: "Oleh-oleh",
    category: "shopping",
    date: threeDaysAgo,
    amountTotalMinor: 250_000,
    payers: [{ memberId: rio.memberId, amountMinor: 250_000 }],
    splitData: { mode: "evenly", memberIds: [sari.memberId, rio.memberId] },
    attachments: ["seed-receipt-oleh-oleh"],
  });
  // amountTotalMinor stays in the group's base currency (IDR), not the
  // expense's own "USD" — toCalculationInput/TransactionRow both read it
  // straight through with no conversion, so this was ambiguous enough to
  // write up rather than guess silently (progress.md Catatan lepas).
  const SIM_CARD_AMOUNT_MINOR = 150_000;
  await seedExpense(deps, {
    groupSlug: group.slug,
    title: "Beli SIM card",
    category: "other",
    date: twelveDaysAgo,
    currency: "USD",
    fxRate: 15_800,
    amountTotalMinor: SIM_CARD_AMOUNT_MINOR,
    payers: [{ memberId: bagas.memberId, amountMinor: SIM_CARD_AMOUNT_MINOR }],
    splitData: { mode: "evenly", memberIds: [bagas.memberId, nadia.memberId] },
  });
  await seedSettlement(deps, {
    groupSlug: group.slug,
    fromMemberId: rio.memberId,
    toMemberId: dimas.memberId,
    amountMinor: 50_000,
    date: yesterday,
    note: "cicil dulu ya",
  });

  return { group: { slug: group.slug, name: group.name }, memberCount: 5, expenseCount: 7, settlementCount: 1 };
}

export async function buildKosBareng(deps: SeedDeps, nowMs: number): Promise<GroupSeedResult> {
  const group = await deps.groupRepository.createGroup({ name: "Kos Bareng", baseCurrency: "IDR", template: "roommate" });
  const [andi, budi, citra, eka] = await addMembersInOrder(deps, group.slug, ["Andi", "Budi", "Citra", "Eka"]);
  await deps.memberRepository.deactivateMember(eka.memberId);
  const twoDaysAgo = nowMs - 2 * ONE_DAY_MS;

  await seedExpense(deps, {
    groupSlug: group.slug,
    title: "Listrik bulan ini",
    category: "bills",
    date: nowMs,
    amountTotalMinor: 300_000,
    payers: [{ memberId: andi.memberId, amountMinor: 300_000 }],
    splitData: { mode: "evenly", memberIds: [andi.memberId, budi.memberId, citra.memberId] },
  });
  await seedSettlement(deps, {
    groupSlug: group.slug,
    fromMemberId: budi.memberId,
    toMemberId: andi.memberId,
    amountMinor: 100_000,
    date: twoDaysAgo,
  });
  await seedSettlement(deps, {
    groupSlug: group.slug,
    fromMemberId: citra.memberId,
    toMemberId: andi.memberId,
    amountMinor: 100_000,
    date: twoDaysAgo,
  });

  return { group: { slug: group.slug, name: group.name }, memberCount: 4, expenseCount: 1, settlementCount: 2 };
}

export async function buildNobarFinal(deps: SeedDeps): Promise<GroupSeedResult> {
  const group = await deps.groupRepository.createGroup({ name: "Nobar Final", baseCurrency: "IDR", template: "one_off_event" });
  await addMembersInOrder(deps, group.slug, ["Fajar", "Gita", "Hani"]);
  return { group: { slug: group.slug, name: group.name }, memberCount: 3, expenseCount: 0, settlementCount: 0 };
}

export async function buildSushiBerempat(deps: SeedDeps, nowMs: number): Promise<GroupSeedResult> {
  const group = await deps.groupRepository.createGroup({ name: "Sushi Berempat", baseCurrency: "IDR", template: "blank" });
  const [intan, joko, kirana, lukman] = await addMembersInOrder(deps, group.slug, ["Intan", "Joko", "Kirana", "Lukman"]);
  // sb-5 and sb-6 are left unclaimed on purpose (K-122): createExpense must
  // still succeed, with an unbalanced_payments warning instead of a thrown
  // error, so the balance screen's PendingClaimNotice has real seed data.
  const items: readonly ExpenseItemRecord[] = [
    {
      itemId: "sb-1",
      name: "Sushi Salmon Roll",
      unitPriceMinor: 45_000,
      quantity: 2,
      claims: [{ memberId: intan.memberId, weight: 1 }, { memberId: joko.memberId, weight: 1 }],
    },
    { itemId: "sb-2", name: "Tempura Udang", unitPriceMinor: 55_000, quantity: 1, claims: [{ memberId: kirana.memberId, weight: 1 }] },
    {
      itemId: "sb-3",
      name: "Ramen Miso",
      unitPriceMinor: 60_000,
      quantity: 2,
      claims: [{ memberId: lukman.memberId, weight: 1 }, { memberId: intan.memberId, weight: 1 }],
    },
    {
      itemId: "sb-4",
      name: "Gyoza",
      unitPriceMinor: 25_000,
      quantity: 3,
      claims: [{ memberId: joko.memberId, weight: 1 }, { memberId: kirana.memberId, weight: 1 }, { memberId: lukman.memberId, weight: 1 }],
    },
    { itemId: "sb-5", name: "Edamame", unitPriceMinor: 20_000, quantity: 2, claims: [] },
    { itemId: "sb-6", name: "Es Teh Jepang", unitPriceMinor: 15_000, quantity: 4, claims: [] },
  ];
  const itemsTotalMinor = items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
  await seedExpense(deps, {
    groupSlug: group.slug,
    title: "Makan sushi",
    category: "food",
    date: nowMs,
    amountTotalMinor: itemsTotalMinor,
    payers: [{ memberId: intan.memberId, amountMinor: itemsTotalMinor }],
    splitData: { mode: "byItems", memberIds: [intan.memberId, joko.memberId, kirana.memberId, lukman.memberId] },
    items,
  });

  return { group: { slug: group.slug, name: group.name }, memberCount: 4, expenseCount: 1, settlementCount: 0 };
}
