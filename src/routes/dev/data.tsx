import { useState } from "react";
import { createDexieAdapter } from "@/lib/storage/adapter";
import { systemClock } from "@/lib/storage/clock";
import { db } from "@/lib/storage/schema";
import { exportAllData, serializeExport, type ExportBundle } from "@/lib/storage/export-data";

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
export function DevDataPage() {
  const [rowCounts, setRowCounts] = useState<RowCounts | null>(null);

  async function handleExport(): Promise<void> {
    const adapter = createDexieAdapter(db);
    const bundle = await exportAllData(adapter, systemClock);
    downloadExportFile(bundle);
    setRowCounts(countRows(bundle));
  }

  return (
    <main>
      <h1>Export all local data</h1>
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
