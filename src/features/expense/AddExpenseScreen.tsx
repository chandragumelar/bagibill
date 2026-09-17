import { useEffect, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { Screen } from "@/app/layout/Screen/Screen";
import { Topbar, TopbarButton } from "@/app/layout/Topbar/Topbar";
import { navigate, useRouteParams } from "@/routes/router";
import { systemClock } from "@/lib/storage/clock";
import { expenseRepository, groupRepository, memberRepository } from "@/lib/storage/repositories";
import { GROUP_TEMPLATES } from "@/lib/storage/templates";
import type { DraftInit } from "./expense-draft";
import { useExpenseDraft } from "./use-expense-draft";
import { ExpenseFormRata } from "./ExpenseFormRata";
import { ExpenseFormNominal } from "./ExpenseFormNominal";
import { ExpenseFormPersen } from "./ExpenseFormPersen";
import { ExpenseFormPorsi } from "./ExpenseFormPorsi";
import { ExpenseFormSelisih } from "./ExpenseFormSelisih";

function templateFor(templateKey: string) {
  return Object.values(GROUP_TEMPLATES).find((candidate) => candidate.key === templateKey);
}

function topbarHeader(slug: string, editing: boolean) {
  return (
    <Topbar
      title={t(editing ? "route.title.editExpense" : "route.title.addExpense")}
      leading={<TopbarButton label={t("nav.back")} tone="ghost" onClick={() => navigate(`/g/${slug}`)} />}
    />
  );
}

interface ExpenseFormRouterProps {
  readonly slug: string;
  readonly init: DraftInit;
  readonly header: ReactNode;
  readonly expenseId?: string;
}

// One draft, chosen by draft.mode which mode-specific form renders it — the
// hook lives here, not inside any form, so switching modes never remounts
// the draft and never resets title/amount/membership (plan.md F3-02/F3-04).
function ExpenseFormRouter({ slug, init, header, expenseId }: ExpenseFormRouterProps) {
  const draftState = useExpenseDraft(init);
  const formProps = { slug, header, expenseId, templateCategories: init.templateCategories, ...draftState };
  switch (draftState.draft.mode) {
    case "byAmounts":
      return <ExpenseFormNominal {...formProps} />;
    case "byPercentage":
      return <ExpenseFormPersen {...formProps} />;
    case "byWeights":
      return <ExpenseFormPorsi {...formProps} />;
    case "byAdjustment":
      return <ExpenseFormSelisih {...formProps} />;
    case "evenly":
      return <ExpenseFormRata {...formProps} />;
  }
}

// Reads group + member data are local IndexedDB, not network — per F0-07,
// local data never gets a spinner or skeleton, so the gap before `init` is
// ready renders no loading chrome at all, just the screen shell.
export function AddExpenseScreen() {
  const { slug = "", expenseId } = useRouteParams();
  const [init, setInit] = useState<DraftInit | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const group = await groupRepository.getGroupBySlug(slug);
      if (group === undefined) {
        if (!cancelled) navigate("/app");
        return;
      }
      const [members, expense] = await Promise.all([
        memberRepository.listMembers(slug, { includeInactive: true }),
        expenseId === undefined ? Promise.resolve(undefined) : expenseRepository.getExpense(expenseId),
      ]);
      if (expenseId !== undefined && expense === undefined) {
        if (!cancelled) navigate(`/g/${slug}`);
        return;
      }
      if (cancelled) return;
      const sortedMembers = [...members].sort((a, b) => a.joinedAt - b.joinedAt);
      const template = templateFor(group.template);
      const templateCategories = template?.defaultCategories ?? [];
      setInit({
        members: sortedMembers.map((member) => ({
          memberId: member.memberId,
          name: member.name,
          color: member.color,
        })),
        currency: group.baseCurrency,
        category: templateCategories[0] ?? "other",
        date: systemClock.now(),
        templateCategories,
        expense,
      });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, expenseId]);

  if (init === null) {
    return <Screen header={topbarHeader(slug, expenseId !== undefined)}>{null}</Screen>;
  }

  return <ExpenseFormRouter slug={slug} init={init} header={topbarHeader(slug, expenseId !== undefined)} expenseId={expenseId} />;
}
