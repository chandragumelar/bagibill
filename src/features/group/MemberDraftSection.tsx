import { t } from "@/lib/i18n";
import { Avatar } from "@/shared/ui";
import { initialsFromTwoWords } from "./group-member-helpers";
import { SimilarNameWarning } from "./SimilarNameWarning";
import type { UseMemberNameComposerResult } from "./use-member-name-composer";
import type { MemberDraft } from "./use-new-group-form";
import styles from "./MemberDraftSection.module.css";

export interface MemberDraftSectionProps {
  readonly members: readonly MemberDraft[];
  readonly composer: UseMemberNameComposerResult;
  readonly onRemove: (tempId: string) => void;
}

// Draft rows render a neutral avatar, not a palette color — colors are
// assigned by addMember at real creation time (K-59), and this list is
// pre-creation. Duplicating the palette-cycling formula here just to show
// a preview color would mean the screen computing a color itself, which
// the task explicitly rules out.
function DraftRow({ member, onRemove }: { readonly member: MemberDraft; readonly onRemove: (tempId: string) => void }) {
  return (
    <div className={styles.row}>
      <Avatar initials={initialsFromTwoWords(member.name)} color="var(--n-5)" name={member.name} />
      <span className={styles.name}>{member.name}</span>
      {member.isCreator ? (
        <span className={styles.roleLabel}>{t("newGroup.creatorRoleLabel")}</span>
      ) : (
        <button type="button" className={styles.remove} onClick={() => onRemove(member.tempId)} aria-label={t("newGroup.removeMemberAria", { name: member.name })}>
          ×
        </button>
      )}
    </div>
  );
}

export function MemberDraftSection({ members, composer, onRemove }: MemberDraftSectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>{t("newGroup.membersHeading", { count: members.length })}</h2>
      <div className={styles.composerRow}>
        <input
          type="text"
          className={styles.input}
          value={composer.nameInput}
          onChange={(event) => composer.setNameInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") composer.submit();
          }}
          placeholder={t("newGroup.memberInputPlaceholder")}
          aria-label={t("newGroup.memberInputPlaceholder")}
        />
        <button
          type="button"
          className={styles.addButton}
          onClick={composer.submit}
          disabled={composer.nameInput.trim() === "" || composer.similarMatches.length > 0}
        >
          {t("newGroup.addButton")}
        </button>
      </div>
      {composer.similarMatches.length > 0 ? (
        <SimilarNameWarning
          matchedName={composer.similarMatches[0] ?? ""}
          suggestedName={composer.suggestedName}
          onKeepAdding={composer.keepAddingAnyway}
          onAddSuggested={composer.addAsSuggested}
        />
      ) : null}
      <div className={styles.list}>
        {members.map((member) => (
          <DraftRow key={member.tempId} member={member} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
