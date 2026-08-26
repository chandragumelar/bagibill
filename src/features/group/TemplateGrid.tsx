import { t } from "@/lib/i18n";
import { CheckIcon } from "@/shared/system";
import { GROUP_TEMPLATES, type GroupTemplateKey } from "@/lib/storage/templates";
import styles from "./TemplateGrid.module.css";

const TEMPLATE_ORDER: readonly GroupTemplateKey[] = ["trip", "roommate", "couple", "one_off_event", "blank"];

// Decorative only — templates.ts owns the business meaning (categories,
// simplify, recurring), this is purely the icon shown in the picker.
const TEMPLATE_EMOJI: Record<GroupTemplateKey, string> = {
  trip: "✈️",
  roommate: "🏠",
  couple: "❤️",
  one_off_event: "🎟️",
  blank: "⚪",
};

export interface TemplateGridProps {
  readonly selected: GroupTemplateKey | undefined;
  readonly onSelect: (key: GroupTemplateKey) => void;
}

// Mockup's chips ("Sewa"/"Listrik"/"Air"/"Tiket") are colored via a member-
// palette token reused positionally, not the category-identity --cat-*
// tokens. Reusing --m-* here would visually claim a specific person owns
// a category, and --cat-* is restricted to Ringkasan/filter/bagan
// (CLAUDE.md hard rule) — neither fits a template preview, so these
// render as plain neutral pills instead (Keputusan, progress.md).
function CategoryPreview({ template }: { readonly template: GroupTemplateKey }) {
  const categories = GROUP_TEMPLATES[template].defaultCategories;
  const simplify = GROUP_TEMPLATES[template].simplifyDebtsDefault;

  return (
    <div className={styles.preview}>
      <p className={styles.previewHeading}>{t("newGroup.categoriesHeading")}</p>
      {categories.length === 0 ? (
        <p className={styles.previewEmpty}>{t("newGroup.categoriesEmpty")}</p>
      ) : (
        <div className={styles.chipRow}>
          {categories.map((category) => (
            <span key={category} className={styles.chip}>
              {t(`category.${category}`)}
            </span>
          ))}
        </div>
      )}
      <div className={styles.simplifyRow}>
        <span>{t("newGroup.simplifyLabel")}</span>
        <span className={simplify ? styles.simplifyOn : styles.simplifyOff}>
          {simplify ? t("newGroup.simplifyOn") : t("newGroup.simplifyOff")}
        </span>
      </div>
    </div>
  );
}

export function TemplateGrid({ selected, onSelect }: TemplateGridProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>{t("newGroup.templateHeading")}</h2>
      <div className={styles.grid}>
        {TEMPLATE_ORDER.map((key) => {
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              className={isSelected ? `${styles.card} ${styles.cardSelected}` : styles.card}
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
            >
              <span aria-hidden="true" className={styles.emoji}>
                {TEMPLATE_EMOJI[key]}
              </span>
              <span className={styles.label}>{t(`newGroup.template.${key}`)}</span>
              {isSelected ? (
                <span className={styles.check} aria-hidden="true">
                  <CheckIcon />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {selected === undefined ? null : <CategoryPreview template={selected} />}
    </div>
  );
}
