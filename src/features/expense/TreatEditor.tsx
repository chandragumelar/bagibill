import { useId } from "react";
import { t } from "@/lib/i18n";
import { MoneyInput } from "@/shared/ui";
import type { ExpenseDraftMember, TreatDraft, TreatDraftKind } from "./expense-draft";
import styles from "./TreatEditor.module.css";

const MIN_MEMBERS_FOR_TREAT = 2;
const TREAT_KINDS: readonly TreatDraftKind[] = ["person", "partial"];

interface TreatRowProps {
  readonly treat: TreatDraft;
  readonly checkedMembers: readonly ExpenseDraftMember[];
  readonly currency: string;
  readonly onUpdate: (id: string, patch: Partial<TreatDraft>) => void;
  readonly onRemove: (id: string) => void;
}

function TreatRow({ treat, checkedMembers, currency, onUpdate, onRemove }: TreatRowProps) {
  const sponsorSelectId = useId();
  const beneficiarySelectId = useId();

  // Same person can't sponsor and be sponsored on the same row — prevented
  // by excluding each side's current pick from the other's options, not
  // just rejected at save time (plan.md F3-03).
  const sponsorOptions = checkedMembers.filter((member) => member.memberId !== treat.beneficiaryMemberId);
  const beneficiaryOptions = checkedMembers.filter((member) => member.memberId !== treat.sponsorMemberId);

  return (
    <div className={styles.row}>
      <div className={styles.selectField}>
        <label htmlFor={sponsorSelectId} className={styles.label}>
          {t("expense.treat.sponsorLabel")}
        </label>
        <select
          id={sponsorSelectId}
          className={styles.select}
          value={treat.sponsorMemberId}
          onChange={(event) => onUpdate(treat.id, { sponsorMemberId: event.target.value })}
        >
          {sponsorOptions.map((member) => (
            <option key={member.memberId} value={member.memberId}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.selectField}>
        <label htmlFor={beneficiarySelectId} className={styles.label}>
          {t("expense.treat.beneficiaryLabel")}
        </label>
        <select
          id={beneficiarySelectId}
          className={styles.select}
          value={treat.beneficiaryMemberId}
          onChange={(event) => onUpdate(treat.id, { beneficiaryMemberId: event.target.value })}
        >
          {beneficiaryOptions.map((member) => (
            <option key={member.memberId} value={member.memberId}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div
        className={styles.kindGroup}
        role="group"
        aria-label={t("expense.treat.kindGroupLabel")}
      >
        {TREAT_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={treat.kind === kind}
            className={treat.kind === kind ? `${styles.kindButton} ${styles.kindButtonActive}` : styles.kindButton}
            onClick={() => onUpdate(treat.id, { kind })}
          >
            {t(kind === "person" ? "expense.treat.kindPerson" : "expense.treat.kindPartial")}
          </button>
        ))}
      </div>

      {treat.kind === "partial" ? (
        <MoneyInput
          label={t("expense.treat.partialAmountLabel")}
          prefix={currency}
          amountMinor={treat.partialAmountMinor}
          onChange={(partialAmountMinor) => onUpdate(treat.id, { partialAmountMinor })}
        />
      ) : null}

      <button
        type="button"
        className={styles.removeButton}
        onClick={() => onRemove(treat.id)}
        aria-label={t("expense.treat.remove")}
      >
        ✕
      </button>
    </div>
  );
}

export interface TreatEditorProps {
  readonly treats: readonly TreatDraft[];
  readonly checkedMembers: readonly ExpenseDraftMember[];
  readonly currency: string;
  readonly onAdd: () => void;
  readonly onUpdate: (id: string, patch: Partial<TreatDraft>) => void;
  readonly onRemove: (id: string) => void;
}

export function TreatEditor({ treats, checkedMembers, currency, onAdd, onUpdate, onRemove }: TreatEditorProps) {
  const canAddTreat = checkedMembers.length >= MIN_MEMBERS_FOR_TREAT;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionHeading}>{t("expense.treat.heading")}</span>
        <button type="button" className={styles.headerAction} onClick={onAdd} disabled={!canAddTreat}>
          {t("expense.treat.add")}
        </button>
      </div>
      {!canAddTreat ? <p className={styles.hint}>{t("expense.treat.needTwoMembers")}</p> : null}
      {treats.length === 0 ? null : (
        <div className={styles.list}>
          {treats.map((treat) => (
            <TreatRow
              key={treat.id}
              treat={treat}
              checkedMembers={checkedMembers}
              currency={currency}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
