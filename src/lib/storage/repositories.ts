import { db } from "./schema";
import { createDexieAdapter } from "./adapter";
import { systemClock } from "./clock";
import { cryptoIdGenerator } from "./id";
import { createGroupRepository, type GroupRepository } from "./group-repository";
import { createMemberRepository, type MemberRepository } from "./member-repository";
import { createExpenseRepository, type ExpenseRepository } from "./expense-repository";

// Single composition root: one adapter/clock/id-generator wired once, three
// repositories exported ready to use. The injection built into F2-02/F2-03
// exists so repositories can be tested in isolation, not so every screen
// assembles its own — a screen assembling its own would risk two parts of
// the same screen talking to two different database instances.
const adapter = createDexieAdapter(db);

export const groupRepository: GroupRepository = createGroupRepository(adapter, systemClock, cryptoIdGenerator);
export const memberRepository: MemberRepository = createMemberRepository(adapter, systemClock, cryptoIdGenerator);
export const expenseRepository: ExpenseRepository = createExpenseRepository(adapter, systemClock, cryptoIdGenerator);
