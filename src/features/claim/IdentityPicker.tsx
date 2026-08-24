import { useState } from "react";
import { t } from "@/lib/i18n";
import { Avatar, Button, TextInput } from "@/shared/ui";
import { InlineFailure } from "@/shared/system";
import type { ClaimParticipant } from "./use-claim";
import styles from "./IdentityPicker.module.css";

export interface IdentityPickerProps {
  readonly expenseTitle: string;
  readonly creatorName: string;
  readonly participants: readonly ClaimParticipant[];
  readonly error: boolean;
  readonly onPick: (memberId: string) => void;
  readonly onAddNew: (name: string) => Promise<void>;
}

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

// Two "Dimas" and "Dina" look identical as bare avatars — a first-initial
// collision is cheap to spot up front and cheap to explain, so the picker
// flags it before anyone picks the wrong circle.
function ambiguousInitials(participants: readonly ClaimParticipant[]): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const participant of participants) {
    const letter = participant.name.trim().charAt(0).toUpperCase();
    if (letter === "") continue;
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count >= 2).map(([letter]) => letter));
}

interface ParticipantRowProps {
  readonly participant: ClaimParticipant;
  readonly flagged: boolean;
  readonly onPick: (memberId: string) => void;
}

function ParticipantRow({ participant, flagged, onPick }: ParticipantRowProps) {
  return (
    <button type="button" className={styles.row} onClick={() => onPick(participant.memberId)}>
      <Avatar initials={initialsFromName(participant.name)} color={`var(${participant.color})`} name={participant.name} />
      <span className={styles.rowName}>{participant.name}</span>
      {flagged ? <span className={styles.badge}>{t("claim.identity.initialBadge", { letter: participant.name.trim().charAt(0).toUpperCase() })}</span> : null}
      <span className={styles.radio} aria-hidden="true" />
    </button>
  );
}

export function IdentityPicker({ expenseTitle, creatorName, participants, error, onPick, onAddNew }: IdentityPickerProps) {
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastAction, setLastAction] = useState<(() => void) | undefined>(undefined);
  const flaggedLetters = ambiguousInitials(participants);
  const trimmedName = newName.trim();
  const hasAmbiguity = flaggedLetters.size > 0;

  async function handleSubmit(): Promise<void> {
    if (trimmedName === "") return;
    setSubmitting(true);
    try {
      await onAddNew(trimmedName);
    } finally {
      setSubmitting(false);
    }
  }

  function handlePick(memberId: string): void {
    setLastAction(() => () => onPick(memberId));
    onPick(memberId);
  }

  function handleSubmitClick(): void {
    setLastAction(() => () => void handleSubmit());
    void handleSubmit();
  }

  return (
    <main className={styles.screen}>
      <p className={styles.eyebrow}>{expenseTitle}</p>
      <h1 className={styles.heading}>{t("claim.identity.heading")}</h1>
      <p className={styles.body}>{t("claim.identity.body", { creatorName })}</p>

      {hasAmbiguity ? (
        <p className={styles.hint}>{t("claim.identity.ambiguousHint", { letters: [...flaggedLetters].join(", ") })}</p>
      ) : null}

      {error ? (
        <InlineFailure
          message={t("common.saveFailed")}
          retryLabel={t("system.retry")}
          onRetry={() => lastAction?.()}
          variant="attached"
        />
      ) : null}

      <h2 className={styles.sectionLabel}>{t("claim.identity.participantsHeading")}</h2>
      <div className={styles.list}>
        {participants.map((participant) => (
          <ParticipantRow
            key={participant.memberId}
            participant={participant}
            flagged={flaggedLetters.has(participant.name.trim().charAt(0).toUpperCase())}
            onPick={handlePick}
          />
        ))}
      </div>

      <div className={styles.newName}>
        <h2 className={styles.sectionLabel}>{t("claim.identity.newNameHeading")}</h2>
        <TextInput
          label={t("claim.identity.newNameLabel")}
          value={newName}
          onChange={setNewName}
          placeholder={t("claim.identity.newNamePlaceholder")}
        />
      </div>

      <Button onClick={handleSubmitClick} disabled={trimmedName === "" || submitting}>
        {trimmedName === "" ? t("claim.identity.pickFirst") : t("claim.identity.continueAs", { name: trimmedName })}
      </Button>
    </main>
  );
}
