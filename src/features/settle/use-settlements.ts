import { useEffect, useState } from "react";
import { settlementRepository } from "@/lib/storage/repositories";
import type { SettlementRecord } from "@/lib/storage/records";

export interface CreateSettlementParams {
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly date: number;
  readonly note?: string;
}

export interface UseSettlementsResult {
  /** Visible settlements for the group, newest date first. */
  readonly settlements: readonly SettlementRecord[];
  readonly createSettlement: (params: CreateSettlementParams) => Promise<SettlementRecord>;
  /** Soft-deletes the settlement — this IS the undo action (F0-07's "reversible action" ladder rung), not a separate mechanism. */
  readonly undoSettlement: (settlementId: string) => Promise<void>;
  readonly reload: () => void;
}

interface LoadedState {
  readonly slug: string;
  readonly settlements: readonly SettlementRecord[];
}

// Independent read from use-group-balance.ts's own settlement fetch, same
// reasoning as that file's header comment: each hook owns its own load
// rather than sharing state across a feature boundary. This one exists
// for the history list and the create/undo actions the sheets need; the
// balance calculation has no use for those actions.
export function useSettlements(groupSlug: string): UseSettlementsResult {
  const [loaded, setLoaded] = useState<LoadedState>({ slug: groupSlug, settlements: [] });
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const settlements = await settlementRepository.listSettlementsByGroup(groupSlug);
      if (cancelled) return;
      setLoaded({ slug: groupSlug, settlements });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [groupSlug, reloadToken]);

  async function createSettlement(params: CreateSettlementParams): Promise<SettlementRecord> {
    const created = await settlementRepository.createSettlement({ groupSlug, ...params });
    reload();
    return created;
  }

  async function undoSettlement(settlementId: string): Promise<void> {
    await settlementRepository.softDeleteSettlement(settlementId);
    reload();
  }

  const settlements = loaded.slug === groupSlug ? loaded.settlements : [];
  return { settlements, createSettlement, undoSettlement, reload };
}
