import { useState } from "react";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { systemClock } from "@/lib/storage/clock";
import { db } from "@/lib/storage/schema";
import { exportAllData, serializeExport, type ExportBundle } from "@/lib/storage/export-data";
import {
  expenseRepository,
  groupRepository,
  memberRepository,
  settlementRepository,
} from "@/lib/storage/repositories";
import { seedSampleData, type SeedSummary } from "@/lib/storage/seed-data";
import { Link } from "@/routes/router";

const FILENAME_DATE_LENGTH = 10;

interface RowCounts {
  readonly groups: number;
  readonly members: number;
  readonly expenses: number;
  readonly settlements: number;
  readonly activityLog: number;
}

function countRows(bundle: ExportBundle): RowCounts {
  return {
    groups: bundle.groups.length,
    members: bundle.members.length,
    expenses: bundle.expenses.length,
    settlements: bundle.settlements.length,
    activityLog: bundle.activityLog.length,
  };
}

function exportFileName(exportedAt: number): string {
  const isoDate = new Date(exportedAt).toISOString().slice(0, FILENAME_DATE_LENGTH);
  return `bagibill-export-${isoDate}.json`;
}

function downloadExportFile(bundle: ExportBundle): void {
  const blob = new Blob([serializeExport(bundle)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFileName(bundle.exportedAt);
  anchor.click();
  URL.revokeObjectURL(url);
}

// This page ships in the production bundle rather than being gated behind
// import.meta.env.DEV — CLAUDE.md's promise that user data is never held
// hostage needs an escape hatch that still exists once the app is in
// someone's hands, not just on a developer's machine. What keeps this from
// counting as a user feature is that no in-app UI links here, not that it's
// absent from production. Cost stays low because the route is lazy and
// only loads if someone types the URL (F2-05 decision, progress.md).
//
// Text on this page is written in English inline, not through the i18n
// string files — the only reader is a developer, and adding translation
// keys for an internal tool would just clutter the files real screens use
// (F2-05 decision, progress.md).
type SeedState =
  | { readonly status: "idle" }
  | { readonly status: "running" }
  | { readonly status: "done"; readonly summary: SeedSummary }
  | { readonly status: "error"; readonly message: string };

export function DevDataPage() {
  const [rowCounts, setRowCounts] = useState<RowCounts | null>(null);
  const [seedState, setSeedState] = useState<SeedState>({ status: "idle" });

  async function handleExport(): Promise<void> {
    const adapter = createDexieAdapter(db);
    const bundle = await exportAllData(adapter, systemClock);
    downloadExportFile(bundle);
    setRowCounts(countRows(bundle));
  }

  async function handleSeed(): Promise<void> {
    setSeedState({ status: "running" });
    try {
      const summary = await seedSampleData({
        groupRepository,
        memberRepository,
        expenseRepository,
        settlementRepository,
        clock: systemClock,
      });
      setSeedState({ status: "done", summary });
    } catch (error) {
      setSeedState({ status: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <main>
      <h1>Seed sample data</h1>
      <p>Every click is additive: it creates four new sample groups and never resets or overwrites what's already there.</p>
      <button type="button" onClick={() => void handleSeed()} disabled={seedState.status === "running"}>
        Seed sample data
      </button>
      {seedState.status === "done" && (
        <ul>
          <li>groups: {seedState.summary.groups.length}</li>
          <li>members: {seedState.summary.memberCount}</li>
          <li>expenses: {seedState.summary.expenseCount}</li>
          <li>settlements: {seedState.summary.settlementCount}</li>
          {seedState.summary.groups.map((group) => (
            <li key={group.slug}>
              <Link to={`/g/${group.slug}`}>{group.name}</Link>
            </li>
          ))}
        </ul>
      )}
      {seedState.status === "error" && <p role="alert">{seedState.message}</p>}

      <h2>Export all local data</h2>
      <p>Downloads every row from every table as one JSON file. Deleted rows are included.</p>
      <button type="button" onClick={() => void handleExport()}>
        Export data
      </button>
      {rowCounts && (
        <ul>
          <li>groups: {rowCounts.groups}</li>
          <li>members: {rowCounts.members}</li>
          <li>expenses: {rowCounts.expenses}</li>
          <li>settlements: {rowCounts.settlements}</li>
          <li>activityLog: {rowCounts.activityLog}</li>
        </ul>
      )}
    </main>
  );
}
