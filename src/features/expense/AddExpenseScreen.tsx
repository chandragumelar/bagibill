import { useEffect, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { Screen } from "@/app/layout/Screen/Screen";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { navigate, useRouteParams } from "@/routes/router";
import { systemClock } from "@/lib/storage/clock";
import { groupRepository, memberRepository } from "@/lib/storage/repositories";
import { GROUP_TEMPLATES, type CategoryKey } from "@/lib/storage/templates";
import type { DraftInit } from "./expense-draft";
import { useExpenseDraft } from "./use-expense-draft";
import { ExpenseFormRata } from "./ExpenseFormRata";
import { ExpenseFormPorsi } from "./ExpenseFormPorsi";

function firstCategoryForTemplate(templateKey: string): CategoryKey {
  const template = Object.values(GROUP_TEMPLATES).find((candidate) => candidate.key === templateKey);
  return template?.defaultCategories[0] ?? "other";
}

function topbarHeader(slug: string) {
  return (
    <Topbar
      title={t("route.title.addExpense")}
      leading={<TopbarButton label={t("nav.back")} tone="ghost" onClick={() => navigate(`/g/${slug}`)} />}
    />
  );
}

interface ExpenseFormRouterProps {
  readonly slug: string;
  readonly init: DraftInit;
  readonly header: ReactNode;
}

// One draft, chosen by draft.mode which mode-specific form renders it — the
// hook lives here, not inside either form, so switching modes never
// remounts the draft and never resets title/amount/membership (plan.md F3-02).
function ExpenseFormRouter({ slug, init, header }: ExpenseFormRouterProps) {
  const draftState = useExpenseDraft(init);
  const formProps = { slug, header, ...draftState };
  return draftState.draft.mode === "byWeights" ? (
    <ExpenseFormPorsi {...formProps} />
  ) : (
    <ExpenseFormRata {...formProps} />
  );
}

// Reads group + member data are local IndexedDB, not network — per F0-07,
// local data never gets a spinner or skeleton, so the gap before `init` is
// ready renders no loading chrome at all, just the screen shell.
export function AddExpenseScreen() {
  const { slug = "" } = useRouteParams();
  const [init, setInit] = useState<DraftInit | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const group = await groupRepository.getGroupBySlug(slug);
      if (group === undefined) {
        if (!cancelled) navigate("/app");
        return;
      }
      const members = await memberRepository.listMembers(slug);
      if (cancelled) return;
      const sortedMembers = [...members].sort((a, b) => a.joinedAt - b.joinedAt);
      setInit({
        members: sortedMembers.map((member) => ({
          memberId: member.memberId,
          name: member.name,
          color: member.color,
        })),
        currency: group.baseCurrency,
        category: firstCategoryForTemplate(group.template),
        date: systemClock.now(),
      });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (init === null) {
    return <Screen header={topbarHeader(slug)}>{null}</Screen>;
  }

  return <ExpenseFormRouter slug={slug} init={init} header={topbarHeader(slug)} />;
}
