import { useState } from "react";
import { t } from "@/lib/i18n";
import { memberRepository } from "@/lib/storage/repositories";
import { useUndoQueue } from "@/shared/system";
import type { MemberRow } from "./use-group-members";
import { useMemberNameComposer, type UseMemberNameComposerResult } from "./use-member-name-composer";

export interface LockedTarget {
  readonly memberId: string;
  readonly name: string;
  readonly transactionCount: number;
}

export interface DangerTarget {
  readonly memberId: string;
  readonly name: string;
}

export interface UseMemberActionsResult {
  readonly addComposer: UseMemberNameComposerResult;
  readonly addError: boolean;
  readonly editingMemberId: string | undefined;
  readonly startEdit: (memberId: string) => void;
  readonly cancelEdit: () => void;
  readonly saveEdit: (memberId: string, name: string, active: boolean) => Promise<void>;
  readonly saveError: boolean;
  readonly requestDelete: (memberId: string, name: string, transactionCount: number) => void;
  readonly lockedTarget: LockedTarget | undefined;
  readonly closeLocked: () => void;
  readonly confirmDeactivateFromLocked: () => Promise<void>;
  readonly dangerTarget: DangerTarget | undefined;
  readonly closeDanger: () => void;
  readonly confirmDelete: () => Promise<void>;
  readonly deleteError: boolean;
  readonly toast: ReturnType<typeof useUndoQueue<string>>;
}

// Deactivate is reversible (reactivateMember), so it goes through the
// undo toast like any other F3 destructive-but-recoverable action. Delete
// is not reversible — member-repository.ts exposes no "undelete", which is
// exactly why HoldToDeleteButton's hold gesture exists instead of a toast
// (DangerSheet, F0-07): friction replaces undo when there's nothing to
// undo to.
export function useMemberActions(slug: string, rows: readonly MemberRow[], reload: () => void): UseMemberActionsResult {
  const toast = useUndoQueue<string>();
  const [editingMemberId, setEditingMemberId] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState(false);
  const [addError, setAddError] = useState(false);
  const [lockedTarget, setLockedTarget] = useState<LockedTarget | undefined>(undefined);
  const [dangerTarget, setDangerTarget] = useState<DangerTarget | undefined>(undefined);
  const [deleteError, setDeleteError] = useState(false);

  function queueDeactivateUndo(memberId: string, name: string): void {
    toast.remove(
      { id: memberId, message: t("member.toast.deactivated", { name }), data: memberId },
      (id) => {
        void memberRepository.reactivateMember(id).then(reload);
      },
      () => {},
    );
  }

  const addComposer = useMemberNameComposer(
    rows.map((row) => row.name),
    (name) => {
      setAddError(false);
      void memberRepository
        .addMember({ groupSlug: slug, name })
        .then(reload)
        .catch(() => setAddError(true));
    },
  );

  function startEdit(memberId: string): void {
    setSaveError(false);
    setEditingMemberId(memberId);
  }

  function cancelEdit(): void {
    setEditingMemberId(undefined);
  }

  async function saveEdit(memberId: string, name: string, active: boolean): Promise<void> {
    const row = rows.find((candidate) => candidate.memberId === memberId);
    const wasActive = row?.active ?? true;
    setSaveError(false);
    try {
      await memberRepository.renameMember(memberId, name);
      if (active) {
        await memberRepository.reactivateMember(memberId);
      } else {
        await memberRepository.deactivateMember(memberId);
        if (wasActive) queueDeactivateUndo(memberId, name);
      }
      reload();
      cancelEdit();
    } catch {
      setSaveError(true);
    }
  }

  function requestDelete(memberId: string, name: string, transactionCount: number): void {
    if (transactionCount > 0) {
      setLockedTarget({ memberId, name, transactionCount });
    } else {
      setDeleteError(false);
      setDangerTarget({ memberId, name });
    }
  }

  function closeLocked(): void {
    setLockedTarget(undefined);
  }

  function closeDanger(): void {
    setDangerTarget(undefined);
    setDeleteError(false);
  }

  async function confirmDeactivateFromLocked(): Promise<void> {
    if (lockedTarget === undefined) return;
    await memberRepository.deactivateMember(lockedTarget.memberId);
    queueDeactivateUndo(lockedTarget.memberId, lockedTarget.name);
    reload();
    closeLocked();
    cancelEdit();
  }

  async function confirmDelete(): Promise<void> {
    if (dangerTarget === undefined) return;
    try {
      await memberRepository.deleteMember(dangerTarget.memberId);
      reload();
      closeDanger();
      cancelEdit();
    } catch {
      setDeleteError(true);
    }
  }

  return {
    addComposer,
    addError,
    editingMemberId,
    startEdit,
    cancelEdit,
    saveEdit,
    saveError,
    requestDelete,
    lockedTarget,
    closeLocked,
    confirmDeactivateFromLocked,
    dangerTarget,
    closeDanger,
    confirmDelete,
    deleteError,
    toast,
  };
}
