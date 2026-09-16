import { t } from "@/lib/i18n/translate";
import { formatDate } from "@/lib/i18n/format-date";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Today/yesterday humanized, short date otherwise. Shared by TransactionList's
// day grouping and the add-expense date pill so the same day always reads
// the same label wherever it's shown (CLAUDE.md: two screens rendering the
// same thing render from the same structure).
export function dayLabel(dayStartMs: number, nowMs: number): string {
  const diffDays = Math.round((startOfDay(nowMs) - dayStartMs) / MS_PER_DAY);
  if (diffDays === 0) return t("group.transaction.dayToday");
  if (diffDays === 1) return t("group.transaction.dayYesterday");
  return formatDate(new Date(dayStartMs), { day: "numeric", month: "short" });
}
