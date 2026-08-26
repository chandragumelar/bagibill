import { useState } from "react";
import { t } from "@/lib/i18n";
import { groupRepository, memberRepository } from "@/lib/storage/repositories";
import type { GroupTemplateKey } from "@/lib/storage/templates";
import { navigate } from "@/routes/router";
import { useMemberNameComposer, type UseMemberNameComposerResult } from "./use-member-name-composer";

// spec.md 12.1: the creator is added like anyone else, just by typing a
// name — there's no login to read a real name from (K-11/K-12, still
// TERBUKA). "Kamu" is a real, renameable member name like any other, not a
// special row: it appears in the draft list from the start (mockup's
// "Kosong" state already counts 1 member before any template or name is
// picked) and, once the group exists, Kelola Member shows it like anyone
// else — no "Kamu"/"Pembuat" special-casing survives past this screen.
const CREATOR_TEMP_ID = "creator";

// Gelombang 1's only real currency: MoneyInput is zero-decimal-only and
// nothing downstream can format a second currency correctly yet (K-75).
// Building a real ISO 4217 picker here would let people choose a currency
// the rest of the app can't render, so the pill is locked instead of wired
// to a picker that has nothing to switch between (K-76 precedent: no dead
// affordances) — noted in progress.md's Keputusan for F3-09.
export const NEW_GROUP_CURRENCY = "IDR";

export interface MemberDraft {
  readonly tempId: string;
  readonly name: string;
  readonly isCreator: boolean;
}

export interface UseNewGroupFormResult {
  readonly name: string;
  readonly setName: (name: string) => void;
  readonly template: GroupTemplateKey | undefined;
  readonly setTemplate: (key: GroupTemplateKey) => void;
  readonly members: readonly MemberDraft[];
  readonly composer: UseMemberNameComposerResult;
  readonly removeMember: (tempId: string) => void;
  readonly canSubmit: boolean;
  readonly submitting: boolean;
  readonly submitError: boolean;
  readonly submit: () => Promise<void>;
}

export function useNewGroupForm(): UseNewGroupFormResult {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<GroupTemplateKey | undefined>(undefined);
  const [members, setMembers] = useState<readonly MemberDraft[]>([
    { tempId: CREATOR_TEMP_ID, name: t("member.creatorDefaultName"), isCreator: true },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const composer = useMemberNameComposer(
    members.map((member) => member.name),
    (committedName) => setMembers((prev) => [...prev, { tempId: crypto.randomUUID(), name: committedName, isCreator: false }]),
  );

  function removeMember(tempId: string): void {
    if (tempId === CREATOR_TEMP_ID) return;
    setMembers((prev) => prev.filter((member) => member.tempId !== tempId));
  }

  async function submit(): Promise<void> {
    if (template === undefined || name.trim() === "") return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const group = await groupRepository.createGroup({ name: name.trim(), baseCurrency: NEW_GROUP_CURRENCY, template });
      // Sequential, not Promise.all: addMember assigns each color from the
      // count of members added so far (K-59) — running these in parallel
      // would race that count and could hand two drafts the same color.
      for (const draft of members) {
        await memberRepository.addMember({ groupSlug: group.slug, name: draft.name });
      }
      navigate(`/g/${group.slug}`);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return {
    name,
    setName,
    template,
    setTemplate,
    members,
    composer,
    removeMember,
    canSubmit: template !== undefined && name.trim() !== "",
    submitting,
    submitError,
    submit,
  };
}
