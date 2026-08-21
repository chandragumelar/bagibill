import { calculateExpense } from "@bagibill/split-engine";
import type { ChargeAllocation, ChargeAmount, ExpenseCalculation } from "@bagibill/split-engine";
import type { ChargeRecord, ExpenseRecord } from "@/lib/storage/records";
import { resolveMemberOrder, toCalculationInput } from "@/lib/storage/expense-mapping";

// The one shape both an unsaved draft (add-expense screen, F3-01..04) and a
// saved ExpenseRecord (group detail transaction list, F3-05) end up
// rendering from. Neither door imports the other's types here — a draft's
// ChargeDraft and a stored ChargeRecord both translate into ExpenseChargeMeta
// before reaching buildExpenseSummary, so this module never needs to know
// about either.

export interface ExpenseMemberInfo {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
}

export interface ExpenseChargeMeta {
  /** Undefined for a saved charge — ChargeRecord carries no display name (K-91, TERBUKA). */
  readonly name?: string;
  readonly amount: ChargeAmount;
  readonly allocationMode: ChargeAllocation["mode"];
  readonly sponsorMemberId?: string;
}

export interface ExpenseMemberShare {
  readonly memberId: string;
  readonly name: string;
  readonly color: string;
  readonly shareMinor: number;
  readonly netMinor: number;
}

export interface ExpenseChargeSummary {
  readonly name?: string;
  readonly amount: ChargeAmount;
  readonly allocationMode: ChargeAllocation["mode"];
  readonly sponsorName?: string;
  readonly totalMinor: number;
}

export interface ExpenseTreatSentence {
  readonly sponsorMemberId: string;
  readonly sponsorName: string;
  readonly beneficiaryMemberId: string;
  readonly beneficiaryName: string;
  readonly amountMinor: number;
}

export interface ExpenseSummary {
  /** Sum of every member's shareMinor — derived, never a second input that could drift from the breakdown. */
  readonly totalMinor: number;
  readonly members: readonly ExpenseMemberShare[];
  readonly charges: readonly ExpenseChargeSummary[];
  readonly treats: readonly ExpenseTreatSentence[];
  readonly warnings: ExpenseCalculation["warnings"];
}

export interface BuildExpenseSummaryInput {
  readonly memberOrder: readonly string[];
  readonly memberInfo: ReadonlyMap<string, ExpenseMemberInfo>;
  readonly chargeMeta: readonly ExpenseChargeMeta[];
  readonly calculation: ExpenseCalculation;
}

function requireMemberInfo(memberInfo: ReadonlyMap<string, ExpenseMemberInfo>, memberId: string): ExpenseMemberInfo {
  const info = memberInfo.get(memberId);
  if (info === undefined) {
    throw new Error(`buildExpenseSummary: no member info for memberId "${memberId}"`);
  }
  return info;
}

function requireIndexed(values: readonly number[], index: number, label: string): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`buildExpenseSummary: missing ${label} at index ${index}`);
  }
  return value;
}

function buildMembers(
  memberOrder: readonly string[],
  memberInfo: ReadonlyMap<string, ExpenseMemberInfo>,
  calculation: ExpenseCalculation,
): readonly ExpenseMemberShare[] {
  return memberOrder.map((memberId, index) => {
    const info = requireMemberInfo(memberInfo, memberId);
    return {
      memberId,
      name: info.name,
      color: info.color,
      shareMinor: requireIndexed(calculation.sharesMinor, index, "sharesMinor"),
      netMinor: requireIndexed(calculation.netMinor, index, "netMinor"),
    };
  });
}

function buildCharges(
  chargeMeta: readonly ExpenseChargeMeta[],
  memberInfo: ReadonlyMap<string, ExpenseMemberInfo>,
  calculation: ExpenseCalculation,
): readonly ExpenseChargeSummary[] {
  return chargeMeta.map((meta, index) => {
    const breakdown = calculation.perCharge.at(index);
    return {
      name: meta.name,
      amount: meta.amount,
      allocationMode: meta.allocationMode,
      sponsorName: meta.sponsorMemberId === undefined ? undefined : memberInfo.get(meta.sponsorMemberId)?.name,
      totalMinor: breakdown === undefined ? 0 : breakdown.chargeTotalMinor,
    };
  });
}

function buildTreats(
  memberOrder: readonly string[],
  memberInfo: ReadonlyMap<string, ExpenseMemberInfo>,
  calculation: ExpenseCalculation,
): readonly ExpenseTreatSentence[] {
  return calculation.treatTransfers.map((transfer) => {
    const sponsorMemberId = memberOrder[transfer.sponsorIndex];
    const beneficiaryMemberId = memberOrder[transfer.beneficiaryIndex];
    if (sponsorMemberId === undefined || beneficiaryMemberId === undefined) {
      throw new Error("buildExpenseSummary: treat transfer references a participant index out of range");
    }
    return {
      sponsorMemberId,
      sponsorName: requireMemberInfo(memberInfo, sponsorMemberId).name,
      beneficiaryMemberId,
      beneficiaryName: requireMemberInfo(memberInfo, beneficiaryMemberId).name,
      amountMinor: transfer.amountMinor,
    };
  });
}

// The single shaping step both entry points below call. Pure: no React, no
// storage access, no engine invocation — the calculation is always given,
// never recomputed here.
export function buildExpenseSummary(input: BuildExpenseSummaryInput): ExpenseSummary {
  const { memberOrder, memberInfo, chargeMeta, calculation } = input;
  const members = buildMembers(memberOrder, memberInfo, calculation);
  return {
    totalMinor: members.reduce((sum, member) => sum + member.shareMinor, 0),
    members,
    charges: buildCharges(chargeMeta, memberInfo, calculation),
    treats: buildTreats(memberOrder, memberInfo, calculation),
    warnings: calculation.warnings,
  };
}

function chargeMetaFromRecord(charge: ChargeRecord): ExpenseChargeMeta {
  return {
    amount: charge.amount,
    allocationMode: charge.allocation.mode,
    sponsorMemberId: charge.allocation.mode === "single_payer" ? charge.allocation.memberId : undefined,
  };
}

// The saved-record entry point: translate through the same
// toCalculationInput/calculateExpense gate the repository itself uses at
// save time (K-64), then shape with the exact function the draft path calls.
// Throws whenever calculateExpense or toCalculationInput does (e.g. a
// corrupt stored record) — callers that list many expenses at once are
// responsible for isolating one bad record from the rest.
export function summarizeExpenseRecord(
  expense: ExpenseRecord,
  memberInfo: ReadonlyMap<string, ExpenseMemberInfo>,
): ExpenseSummary {
  const memberOrder = resolveMemberOrder(expense.splitData);
  const calculation = calculateExpense(toCalculationInput(expense));
  return buildExpenseSummary({
    memberOrder,
    memberInfo,
    chargeMeta: expense.charges.map(chargeMetaFromRecord),
    calculation,
  });
}
