import { useId, useState } from "react";
import { t } from "@/lib/i18n";
import { Button } from "@/shared/ui/Button/Button";
import { Sheet } from "@/shared/ui/Sheet/Sheet";
import type { TransactionFilterState } from "./transaction-filter";
import type { FilterMemberOption } from "./use-group-detail";
import styles from "./FilterBar.module.css";

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Reads a native <input type="date"> value as a *local* midday timestamp,
// not via `new Date(dateString)` — that parses as UTC midnight, which lands
// on the wrong calendar day once shifted back to local time in most
// timezones. Exactly the class of date bug CLAUDE.md calls out by name.
function parseDateInputValue(value: string): number | undefined {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (match === null) return undefined;
  const [, yearText, monthText, dayText] = match;
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText)).getTime();
}

function formatDateForInput(ms: number | undefined): string {
  if (ms === undefined) return "";
  const date = new Date(ms);
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// spec.md 12.5 lists six filters; this task only builds search, person, and
// date range. The other three are rendered disabled (not hidden) so the
// sheet's shape stays complete rather than silently missing pieces.
const DISABLED_FILTER_KEYS = [
  "group.filter.categoryLabel",
  "group.filter.amountRangeLabel",
  "group.filter.currencyLabel",
  "group.filter.hasAttachmentLabel",
] as const;

export interface FilterBarProps {
  readonly filter: TransactionFilterState;
  readonly isActive: boolean;
  readonly members: readonly FilterMemberOption[];
  readonly onSearchTextChange: (searchText: string) => void;
  readonly onMemberIdsChange: (memberIds: readonly string[]) => void;
  readonly onDateRangeChange: (startDate: number | undefined, endDate: number | undefined) => void;
  readonly onClear: () => void;
}

export function FilterBar({
  filter,
  isActive,
  members,
  onSearchTextChange,
  onMemberIdsChange,
  onDateRangeChange,
  onClear,
}: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const dateFromId = useId();
  const dateToId = useId();

  function toggleMember(memberId: string) {
    const next = filter.memberIds.includes(memberId)
      ? filter.memberIds.filter((id) => id !== memberId)
      : [...filter.memberIds, memberId];
    onMemberIdsChange(next);
  }

  const filterButtonLabel = isActive
    ? `${t("group.filter.buttonLabel")} — ${t("group.filter.activeState")}`
    : t("group.filter.buttonLabel");

  return (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        <span aria-hidden="true">🔍</span>
        <input
          type="text"
          className={styles.searchInput}
          value={filter.searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder={t("group.filter.searchLabel")}
          aria-label={t("group.filter.searchLabel")}
        />
      </div>

      <button type="button" className={styles.filterButton} onClick={() => setSheetOpen(true)} aria-label={filterButtonLabel}>
        {isActive ? <span className={styles.dot} aria-hidden="true" /> : null}
        {t("group.filter.buttonLabel")}
      </button>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("group.filter.sheetTitle")}>
        <div className={styles.section}>
          <span className={styles.sectionHeading}>{t("group.filter.peopleHeading")}</span>
          <div className={styles.pillGroup} role="group" aria-label={t("group.filter.peopleGroupLabel")}>
            {members.map((member) => {
              const active = filter.memberIds.includes(member.memberId);
              return (
                <button
                  key={member.memberId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMember(member.memberId)}
                  className={active ? `${styles.pill} ${styles.pillActive}` : styles.pill}
                >
                  {member.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionHeading}>{t("group.filter.dateHeading")}</span>
          <div className={styles.dateRow}>
            <div className={styles.dateField}>
              <label htmlFor={dateFromId} className={styles.dateLabel}>
                {t("group.filter.dateFromLabel")}
              </label>
              <input
                id={dateFromId}
                type="date"
                className={styles.dateInput}
                value={formatDateForInput(filter.startDate)}
                onChange={(event) => onDateRangeChange(parseDateInputValue(event.target.value), filter.endDate)}
              />
            </div>
            <div className={styles.dateField}>
              <label htmlFor={dateToId} className={styles.dateLabel}>
                {t("group.filter.dateToLabel")}
              </label>
              <input
                id={dateToId}
                type="date"
                className={styles.dateInput}
                value={formatDateForInput(filter.endDate)}
                onChange={(event) => onDateRangeChange(filter.startDate, parseDateInputValue(event.target.value))}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionHeading}>{t("group.filter.moreHeading")}</span>
          <div className={styles.pillGroup}>
            {DISABLED_FILTER_KEYS.map((key) => (
              <button key={key} type="button" disabled className={styles.pill}>
                {t(key)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClear}>
            {t("group.filter.clearButton")}
          </Button>
          <Button onClick={() => setSheetOpen(false)}>{t("group.filter.doneButton")}</Button>
        </div>
      </Sheet>
    </div>
  );
}
