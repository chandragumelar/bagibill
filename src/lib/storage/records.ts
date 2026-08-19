import type {
  ChargeAllocation,
  ExpenseItem,
  ExtraCharge,
  ItemClaim,
  Treat,
} from "@bagibill/split-engine";

// Storage records are derived from the split engine's types via Omit/&,
// never re-typed from scratch. The engine works with participant indices
// (so it can be tested without knowing anyone's identity); storage works
// with memberId (so data still means something after member order
// changes). Both are correct in their own place, so the shapes can't be
// identical — but deriving the record from the engine type means a new
// field added upstream shows up here automatically, and a field removed
// upstream turns into a typecheck error on the Omit, instead of two
// definitions someone has to remember to keep in sync by hand.

export type ItemClaimRecord = Omit<ItemClaim, "participantIndex"> & { readonly memberId: string };

// Field names below follow the engine (unitPriceMinor, quantity), not the
// unitPrice/qty sketch in spec.md 5.1 — the sketch isn't a field-name
// contract, and the derived type is the one that wins (K-52).
export type ExpenseItemRecord = Omit<ExpenseItem, "claims"> & {
  readonly itemId: string;
  readonly name: string;
  readonly claims: readonly ItemClaimRecord[];
};

// ChargeAmount carries no participant index, so it's used as-is. Only
// ChargeAllocation needs deriving: single_payer's participantIndex becomes
// memberId, items' itemIndices becomes a list of itemId.
export type ChargeAllocationRecord =
  | Extract<ChargeAllocation, { mode: "proportional" }>
  | Extract<ChargeAllocation, { mode: "even" }>
  | (Omit<Extract<ChargeAllocation, { mode: "single_payer" }>, "participantIndex"> & { readonly memberId: string })
  | (Omit<Extract<ChargeAllocation, { mode: "items" }>, "itemIndices"> & { readonly itemIds: readonly string[] });

export type ChargeRecord = Omit<ExtraCharge, "allocation"> & { readonly allocation: ChargeAllocationRecord };

// Treat mirrors the same derivation. spec.md 5.1's Item sketch has its own
// sponsorId field for item-level treats, but that's dropped here in favor
// of routing every treat kind (person, partial, item) through this one
// array — one representation for "who sponsors what," not two.
export type TreatRecord =
  | (Omit<Extract<Treat, { kind: "person" }>, "sponsorIndex" | "beneficiaryIndex"> & {
      readonly sponsorMemberId: string;
      readonly beneficiaryMemberId: string;
    })
  | (Omit<Extract<Treat, { kind: "partial" }>, "sponsorIndex" | "beneficiaryIndex"> & {
      readonly sponsorMemberId: string;
      readonly beneficiaryMemberId: string;
    })
  | (Omit<Extract<Treat, { kind: "item" }>, "sponsorIndex" | "itemIndices"> & {
      readonly sponsorMemberId: string;
      readonly itemIds: readonly string[];
    });

// seq is set by the server once sync exists (K-11, TERBUKA) — every record
// carries the field starting now, at 0, so it never needs a schema
// migration later just to add conflict detection. deletedAt is the only
// form of deletion at this layer: nothing is ever physically removed here,
// a record older than 30 days past deletedAt is purged elsewhere (spec.md 5.2).
interface StoredRecord {
  readonly seq: number;
  readonly deletedAt?: number;
}

export interface GroupSettings {
  readonly simplifyDebts: boolean;
  readonly passcodeHash?: string;
  readonly locked: boolean;
  readonly archived: boolean;
}

export interface GroupRecord extends StoredRecord {
  readonly slug: string;
  readonly name: string;
  readonly baseCurrency: string;
  readonly template: string;
  readonly createdAt: number;
  readonly settings: GroupSettings;
}

export interface MemberRecord extends StoredRecord {
  readonly memberId: string;
  readonly groupSlug: string;
  readonly name: string;
  readonly color: string;
  readonly joinedAt: number;
  readonly paymentNote?: string;
  // spec.md 12.2: a member with transactions can only be deactivated, never
  // deleted. Timestamped like deletedAt rather than a boolean flag, so both
  // "gone" states share the same shape (F2-02).
  readonly deactivatedAt?: number;
}

export interface ExpensePayerRecord {
  readonly memberId: string;
  readonly amountMinor: number;
}

// One variant per SplitInput mode, tagged with the same "mode" literals the
// engine uses — memberId replaces participantIndex, same derivation
// principle as the rest of this file. evenly and byItems only need to know
// who's participating (and in what order), so they carry memberIds; the
// other four modes need a per-member number, so they carry entries.
//
// splitMode was dropped as a separate field once splitData became tagged —
// splitData.mode already carries the same fact, and two fields for one
// truth is exactly how the two can drift out of sync (K-62).
export type SplitDataRecord =
  | { readonly mode: "evenly"; readonly memberIds: readonly string[] }
  | {
      readonly mode: "byAmounts";
      readonly entries: readonly { readonly memberId: string; readonly amountMinor: number }[];
    }
  | {
      readonly mode: "byPercentage";
      readonly entries: readonly { readonly memberId: string; readonly percent: number }[];
    }
  | {
      readonly mode: "byWeights";
      readonly entries: readonly { readonly memberId: string; readonly weight: number }[];
    }
  | {
      readonly mode: "byAdjustment";
      readonly entries: readonly { readonly memberId: string; readonly adjustmentMinor: number }[];
    }
  | { readonly mode: "byItems"; readonly memberIds: readonly string[] };

export interface ExpenseRecord extends StoredRecord {
  readonly expenseId: string;
  readonly groupSlug: string;
  readonly title: string;
  readonly category: string;
  readonly date: number;
  readonly notes: string;
  readonly currency: string;
  readonly fxRate: number;
  readonly amountTotalMinor: number;
  readonly payers: readonly ExpensePayerRecord[];
  readonly splitData: SplitDataRecord;
  readonly charges: readonly ChargeRecord[];
  readonly items: readonly ExpenseItemRecord[];
  readonly treats: readonly TreatRecord[];
  readonly attachments: readonly string[];
  readonly createdBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface SettlementRecord extends StoredRecord {
  readonly settlementId: string;
  readonly groupSlug: string;
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly date: number;
  readonly note?: string;
  readonly createdAt: number;
}

export interface ActivityLogRecord extends StoredRecord {
  readonly logId: string;
  readonly groupSlug: string;
  readonly actorMemberId: string;
  readonly action: string;
  readonly targetId: string;
  readonly before?: unknown;
  readonly after?: unknown;
  readonly at: number;
}
