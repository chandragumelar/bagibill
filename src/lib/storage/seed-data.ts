import type { Clock } from "./clock";
import type { ExpenseRepository } from "./expense-repository";
import type { GroupRepository } from "./group-repository";
import type { MemberRepository } from "./member-repository";
import { buildKosBareng, buildNobarFinal, buildSushiBerempat, buildTripBromo } from "./seed-fixtures";
import type { GroupSeedResult } from "./seed-fixtures";
import type { SettlementRepository } from "./settlement-repository";

export interface SeedDeps {
  readonly groupRepository: GroupRepository;
  readonly memberRepository: MemberRepository;
  readonly expenseRepository: ExpenseRepository;
  readonly settlementRepository: SettlementRepository;
  readonly clock: Clock;
}

export interface SeededGroup {
  readonly slug: string;
  readonly name: string;
}

export interface SeedSummary {
  readonly groups: readonly SeededGroup[];
  readonly memberCount: number;
  readonly expenseCount: number;
  readonly settlementCount: number;
}

function sumBy(results: readonly GroupSeedResult[], pick: (result: GroupSeedResult) => number): number {
  return results.reduce((sum, result) => sum + pick(result), 0);
}

// Every call creates four brand-new groups rather than resetting anything —
// there is no clear-all-data button in this task, so seeding has to be safe
// to click repeatedly on a real device without touching what's already there.
export async function seedSampleData(deps: SeedDeps): Promise<SeedSummary> {
  const nowMs = deps.clock.now();

  const results: readonly GroupSeedResult[] = [
    await buildTripBromo(deps, nowMs),
    await buildKosBareng(deps, nowMs),
    await buildNobarFinal(deps),
    await buildSushiBerempat(deps, nowMs),
  ];

  return {
    groups: results.map((result) => result.group),
    memberCount: sumBy(results, (result) => result.memberCount),
    expenseCount: sumBy(results, (result) => result.expenseCount),
    settlementCount: sumBy(results, (result) => result.settlementCount),
  };
}
