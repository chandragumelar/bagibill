import { useState } from "react";
import { t } from "@/lib/i18n";
import { useUndoQueue } from "@/shared/system/undo/useUndoQueue";
import { Button } from "@/shared/ui/Button/Button";
import { Toast } from "@/shared/ui/Toast/Toast";
import { Section, StateCard } from "@/routes/dev/DevUiHelpers";
import styles from "@/routes/dev/sections/UndoSection.module.css";

// Demo hidup, bukan snapshot statis — buktiin queue+cincin+tumpuk+commit
// beneran jalan, bukan cuma lolos test. commitAll() di sini disimulasikan
// lewat tombol, karena /dev/ui bukan rute produk (kontraknya tetap:
// pemanggil nyata wajib panggil commitAll() pas rute berubah).
export function UndoSection() {
  const undo = useUndoQueue<string>();
  const [log, setLog] = useState<string[]>([]);

  function addLog(line: string): void {
    setLog((current) => [line, ...current].slice(0, 5));
  }

  function deleteItem(id: string, message: string): void {
    addLog(`dibuang: ${id}`);
    undo.remove(
      { id, message, data: id },
      (data) => addLog(`dipulihkan: ${data}`),
      () => addLog(`komit: ${id}`),
    );
  }

  const last = undo.items[undo.items.length - 1];

  return (
    <Section title="useUndoQueue + Toast">
      <StateCard label="demo">
        <div className={styles.buttonRow}>
          <Button variant="secondary" onClick={() => deleteItem("a", t("devui.sample.deleteA"))}>
            {t("devui.sample.deleteA")}
          </Button>
          <Button variant="secondary" onClick={() => deleteItem("b", t("devui.sample.deleteB"))}>
            {t("devui.sample.deleteB")}
          </Button>
          <Button variant="ghost" onClick={undo.commitAll}>
            {t("devui.sample.commitAll")}
          </Button>
        </div>
        {last ? (
          <Toast
            message={last.message}
            secondsRemaining={undo.remainingSeconds}
            secondsTotal={undo.totalSeconds}
            count={undo.items.length}
            onUndo={undo.undoLast}
            onUndoAll={undo.items.length > 1 ? undo.undoAll : undefined}
          />
        ) : null}
        <ul className={styles.log}>
          {log.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      </StateCard>
    </Section>
  );
}
