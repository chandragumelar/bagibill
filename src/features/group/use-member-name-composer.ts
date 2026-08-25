import { useState } from "react";
import { t } from "@/lib/i18n";
import { findSimilarDraftNames } from "./group-member-helpers";

// spec.md 12.2: similar-name detection intercepts while typing, not at
// save time. Shared between the create-group draft list and the manage
// screen's "add a member" field — both are "type a name, catch it if it's
// close to one already here" with the same two ways out (spec.md 12.2:
// "satu tap untuk lanjut, satu tap untuk mengubah jadi Dimas P"), so this
// is the one place that logic lives rather than two screens reimplementing
// the same warning flow around findSimilarDraftNames.
export interface UseMemberNameComposerResult {
  readonly nameInput: string;
  readonly setNameInput: (value: string) => void;
  readonly similarMatches: readonly string[];
  readonly suggestedName: string;
  readonly submit: () => void;
  readonly keepAddingAnyway: () => void;
  readonly addAsSuggested: () => void;
}

export function useMemberNameComposer(
  existingNames: readonly string[],
  onCommit: (name: string) => void,
): UseMemberNameComposerResult {
  const [nameInput, setNameInput] = useState("");
  const trimmed = nameInput.trim();
  const similarMatches = trimmed === "" ? [] : findSimilarDraftNames(trimmed, existingNames);
  // Mockup's suggestion is a placeholder starting point ("Dimas B"), not a
  // collision-avoiding generator — the creator is expected to edit it
  // further themselves if "B" is also taken (dev-note, Buat_Grup___
  // Kelola_Member.html).
  const suggestedName = t("member.similarSuggestedName", { name: trimmed });

  function commit(name: string): void {
    onCommit(name);
    setNameInput("");
  }

  function submit(): void {
    if (trimmed === "" || similarMatches.length > 0) return;
    commit(trimmed);
  }

  function keepAddingAnyway(): void {
    if (trimmed === "") return;
    commit(trimmed);
  }

  function addAsSuggested(): void {
    if (trimmed === "") return;
    commit(suggestedName);
  }

  return { nameInput, setNameInput, similarMatches, suggestedName, submit, keepAddingAnyway, addAsSuggested };
}
