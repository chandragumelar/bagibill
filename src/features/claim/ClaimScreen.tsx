import { useState } from "react";
import { t } from "@/lib/i18n";
import { LoadFailure } from "@/shared/system";
import { useRouteParams } from "@/routes/router";
import { computeMyShare, resolveTapEffect } from "./claim-actions";
import { ClaimItemList } from "./ClaimItemList";
import { ClaimSummary } from "./ClaimSummary";
import { IdentityPicker } from "./IdentityPicker";
import { ShareConfirmSheet } from "./ShareConfirmSheet";
import { useClaim, type ClaimState } from "./use-claim";
import styles from "./ClaimScreen.module.css";

function InvalidScreen() {
  return (
    <main className={styles.invalid}>
      <h1 className={styles.invalidHeading}>{t("claim.invalid.heading")}</h1>
      <p className={styles.invalidBody}>{t("claim.invalid.body")}</p>
    </main>
  );
}

interface PendingShare {
  readonly itemId: string;
  readonly claimantMemberId: string;
}

type View = "list" | "summary";

interface ReadyBodyProps {
  readonly state: Extract<ClaimState, { status: "ready" }>;
  readonly currentMemberId: string;
  readonly claim: (itemId: string) => Promise<void>;
  readonly unclaim: (itemId: string) => Promise<void>;
  readonly retrySave: () => void;
}

function ReadyBody({ state, currentMemberId, claim, unclaim, retrySave }: ReadyBodyProps) {
  const [view, setView] = useState<View>("list");
  const [pendingShare, setPendingShare] = useState<PendingShare | undefined>(undefined);

  function handleTapItem(itemId: string): void {
    const item = state.expense.items.find((candidate) => candidate.itemId === itemId);
    if (item === undefined) return;
    const effect = resolveTapEffect(item, currentMemberId);
    if (effect.kind === "released") {
      void unclaim(itemId);
      return;
    }
    if (effect.kind === "confirmShare") {
      setPendingShare({ itemId, claimantMemberId: effect.currentClaimantMemberId });
      return;
    }
    void claim(itemId);
  }

  function handleConfirmShare(): void {
    if (pendingShare !== undefined) void claim(pendingShare.itemId);
    setPendingShare(undefined);
  }

  const creator = state.participants.find((participant) => participant.memberId === state.expense.createdBy);
  const share = computeMyShare(state.expense, currentMemberId);
  const pendingItem = state.expense.items.find((item) => item.itemId === pendingShare?.itemId);
  const pendingClaimant = state.participants.find((participant) => participant.memberId === pendingShare?.claimantMemberId);

  if (view === "summary") {
    return (
      <ClaimSummary
        expenseTitle={state.expense.title}
        currency={state.expense.currency}
        totalMinor={share?.totalMinor ?? 0}
        items={share?.items ?? []}
        onBack={() => setView("list")}
      />
    );
  }

  return (
    <>
      <ClaimItemList
        expenseTitle={state.expense.title}
        creatorName={creator?.name ?? ""}
        creatorColor={creator?.color ?? "--n-5"}
        totalMinor={state.expense.amountTotalMinor}
        currency={state.expense.currency}
        participants={state.participants}
        items={state.expense.items}
        currentMemberId={currentMemberId}
        myTotalMinor={share?.totalMinor ?? 0}
        myItemCount={share?.items.length ?? 0}
        saveError={state.saveError}
        onTapItem={handleTapItem}
        onRetrySave={retrySave}
        onViewSummary={() => setView("summary")}
      />
      <ShareConfirmSheet
        open={pendingShare !== undefined}
        item={pendingItem}
        currentClaimant={pendingClaimant}
        currency={state.expense.currency}
        onConfirm={handleConfirmShare}
        onClose={() => setPendingShare(undefined)}
      />
    </>
  );
}

export function ClaimScreen() {
  const { slug = "", expenseId = "" } = useRouteParams();
  const { state, pickIdentity, addIdentity, claim, unclaim, retrySave } = useClaim(slug, expenseId);

  if (state.status === "loading") return null;
  if (state.status === "invalid") return <InvalidScreen />;
  if (state.status === "error") {
    return (
      <LoadFailure heading={t("claim.error.heading")} message={t("claim.error.message")} retryLabel={t("system.retry")} onRetry={state.retry} />
    );
  }

  if (state.currentMemberId === undefined) {
    const creator = state.participants.find((participant) => participant.memberId === state.expense.createdBy);
    return (
      <IdentityPicker
        expenseTitle={state.expense.title}
        creatorName={creator?.name ?? ""}
        participants={state.participants}
        error={state.identityError}
        onPick={pickIdentity}
        onAddNew={addIdentity}
      />
    );
  }

  return <ReadyBody state={state} currentMemberId={state.currentMemberId} claim={claim} unclaim={unclaim} retrySave={retrySave} />;
}
