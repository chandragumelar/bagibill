import { useState } from "react";
import { t } from "@/lib/i18n";
import { ListRow, Sheet } from "@/shared/ui";
import { CheckIcon } from "@/shared/system";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/storage/templates";
import formStyles from "./AddExpenseScreen.module.css";

const CATEGORY_LABEL_KEY: Record<CategoryKey, string> = {
  food: "category.food",
  transport: "category.transport",
  stay: "category.stay",
  shopping: "category.shopping",
  fun: "category.fun",
  bills: "category.bills",
  health: "category.health",
  other: "category.other",
};

// The template's own categories first, in its order, then the rest of the
// catalog — every one of the eight stays pickable (a template seeds a
// starting point, it's not a fence), this only orders the list.
function orderedCategories(templateCategories: readonly CategoryKey[]): readonly CategoryKey[] {
  const rest = CATEGORY_KEYS.filter((key) => !templateCategories.includes(key));
  return [...templateCategories, ...rest];
}

export interface CategoryPillProps {
  readonly category: CategoryKey;
  readonly templateCategories: readonly CategoryKey[];
  readonly onSelect: (category: CategoryKey) => void;
}

// Mirrors PayerButton's shape (button -> Sheet -> ListRow list with a
// trailing check on the current pick) — same interaction pattern, no
// mockup-specific look since Tambah_Pengeluaran.html never showed a picker
// for this pill either (F4-06).
export function CategoryPill({ category, templateCategories, onSelect }: CategoryPillProps) {
  const [open, setOpen] = useState(false);
  const categories = orderedCategories(templateCategories);

  function handleSelect(next: CategoryKey): void {
    onSelect(next);
    setOpen(false);
  }

  return (
    <>
      <button type="button" className={`${formStyles.chip} ${formStyles.chipButton}`} onClick={() => setOpen(true)}>
        {t(CATEGORY_LABEL_KEY[category])}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("expense.category.pickerTitle")}>
        <div className={formStyles.participantList}>
          {categories.map((key) => (
            <ListRow key={key} onClick={() => handleSelect(key)} trailing={key === category ? <CheckIcon /> : undefined}>
              <span className={formStyles.memberName}>{t(CATEGORY_LABEL_KEY[key])}</span>
            </ListRow>
          ))}
        </div>
      </Sheet>
    </>
  );
}
