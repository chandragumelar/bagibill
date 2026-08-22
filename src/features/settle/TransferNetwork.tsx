import { formatMoney, t } from "@/lib/i18n";
import type { Transfer } from "@bagibill/split-engine";
import { initialsFromName } from "./BalanceList";
import type { BalanceMemberRow, SettlementMode } from "./use-group-balance";
import styles from "./TransferNetwork.module.css";

// Above this many participants the network stops being legible at the
// 480px width the mockup locks it to — spec.md/plan.md leave the exact
// number to the implementation; this matches the mockup's own stated
// capacity ("sampai dua belas member").
export const MAX_NETWORK_MEMBERS = 12;

const VIEWBOX_SIZE = 300;
const CENTER = VIEWBOX_SIZE / 2;
const NODE_RADIUS = 19;
const ARROW_LENGTH = 9;
const EDGE_GAP = 24;
const MIN_STROKE_WIDTH = 2.5;
const MAX_STROKE_WIDTH = 8;

export interface TransferNetworkProps {
  readonly rows: readonly BalanceMemberRow[];
  /** The mode currently on display — Ringkas's simplified list or Langsung's pairwise list. Picking which array this is IS the mode switch; nothing here ever recomputes it. */
  readonly transfers: readonly Transfer[];
  /** Always the pairwise list, regardless of `mode` — used only to detect which `transfers` edges are "routed" (K-46). */
  readonly directTransfers: readonly Transfer[];
  readonly mode: SettlementMode;
  readonly currency: string;
}

interface NodePosition {
  readonly x: number;
  readonly y: number;
}

function layoutNodes(count: number): readonly NodePosition[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: CENTER, y: CENTER }];
  const orbit = CENTER - NODE_RADIUS - 34;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
    return { x: CENTER + orbit * Math.cos(angle), y: CENTER + orbit * Math.sin(angle) };
  });
}

// A simplified-mode transfer that has no matching pairwise entry didn't come
// from a direct debt — it was routed through someone else during
// simplification. Direct mode never has this (its own transfers list IS the
// pairwise list), so callers only check this for "simplified".
export function isRoutedTransfer(transfer: Transfer, directTransfers: readonly Transfer[]): boolean {
  return !directTransfers.some(
    (direct) => direct.fromIndex === transfer.fromIndex && direct.toIndex === transfer.toIndex,
  );
}

function strokeWidthFor(amountMinor: number, maxAmountMinor: number): number {
  if (maxAmountMinor <= 0) return MIN_STROKE_WIDTH;
  return MIN_STROKE_WIDTH + (amountMinor / maxAmountMinor) * (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH);
}

interface EdgeGeometry {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly arrowPoints: string;
}

function edgeGeometry(from: NodePosition, to: NodePosition): EdgeGeometry {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const x2 = to.x - ux * EDGE_GAP;
  const y2 = to.y - uy * EDGE_GAP;
  const wing = ARROW_LENGTH * 0.6;
  const p2 = `${x2 - ux * ARROW_LENGTH - uy * wing},${y2 - uy * ARROW_LENGTH + ux * wing}`;
  const p3 = `${x2 - ux * ARROW_LENGTH + uy * wing},${y2 - uy * ARROW_LENGTH - ux * wing}`;
  return { x1: from.x + ux * EDGE_GAP, y1: from.y + uy * EDGE_GAP, x2, y2, arrowPoints: `${x2},${y2} ${p2} ${p3}` };
}

interface EdgesProps {
  readonly transfers: readonly Transfer[];
  readonly rows: readonly BalanceMemberRow[];
  readonly positions: readonly NodePosition[];
  readonly mode: SettlementMode;
  readonly directTransfers: readonly Transfer[];
}

function Edges({ transfers, rows, positions, mode, directTransfers }: EdgesProps) {
  const maxAmountMinor = transfers.reduce((max, transfer) => Math.max(max, transfer.amountMinor), 0);
  return (
    <>
      {transfers.map((transfer, index) => {
        const from = positions[transfer.fromIndex];
        const to = positions[transfer.toIndex];
        const fromRow = rows[transfer.fromIndex];
        if (from === undefined || to === undefined || fromRow === undefined) return null;
        const geometry = edgeGeometry(from, to);
        const routed = mode === "simplified" && isRoutedTransfer(transfer, directTransfers);
        const color = `var(${fromRow.color})`;
        return (
          <g key={`${transfer.fromIndex}-${transfer.toIndex}-${index}`}>
            <line
              x1={geometry.x1}
              y1={geometry.y1}
              x2={geometry.x2}
              y2={geometry.y2}
              stroke={color}
              strokeWidth={strokeWidthFor(transfer.amountMinor, maxAmountMinor)}
              strokeLinecap="round"
              strokeDasharray={routed ? "1 7" : undefined}
              className={styles.edge}
            />
            <polygon points={geometry.arrowPoints} fill={color} />
          </g>
        );
      })}
    </>
  );
}

interface NodesProps {
  readonly rows: readonly BalanceMemberRow[];
  readonly positions: readonly NodePosition[];
}

function Nodes({ rows, positions }: NodesProps) {
  return (
    <>
      {rows.map((row, index) => {
        const position = positions[index];
        if (position === undefined) return null;
        const labelBelow = position.y > CENTER + 40;
        const labelY = labelBelow ? position.y + NODE_RADIUS + 15 : position.y - NODE_RADIUS - 8;
        const label = row.isCurrentMember ? t("group.balance.youShort") : row.name;
        return (
          <g key={row.memberId}>
            <circle cx={position.x} cy={position.y} r={NODE_RADIUS} fill={`var(${row.color})`} />
            <circle
              cx={position.x}
              cy={position.y}
              r={NODE_RADIUS}
              fill="none"
              className={row.isCurrentMember ? styles.nodeRingMe : styles.nodeRing}
            />
            <text x={position.x} y={position.y + 4} className={styles.nodeInitials}>
              {initialsFromName(row.name)}
            </text>
            <text x={position.x} y={labelY} className={styles.nodeLabel}>
              {label}
            </text>
          </g>
        );
      })}
    </>
  );
}

interface TransferSummaryProps {
  readonly transfers: readonly Transfer[];
  readonly rows: readonly BalanceMemberRow[];
  readonly currency: string;
}

// Screen-reader-only equivalent of the diagram — the SVG's own aria-label
// only names what it is, not what it shows, so a reader needs this list to
// get the same information a sighted reader gets from the lines.
function TransferSummary({ transfers, rows, currency }: TransferSummaryProps) {
  return (
    <ul className={styles.srOnly}>
      {transfers.map((transfer, index) => {
        const fromRow = rows[transfer.fromIndex];
        const toRow = rows[transfer.toIndex];
        return (
          <li key={`${transfer.fromIndex}-${transfer.toIndex}-${index}`}>
            {t("group.balance.transferSentence", {
              from: fromRow?.name ?? "",
              to: toRow?.name ?? "",
              amount: formatMoney(transfer.amountMinor, currency),
            })}
          </li>
        );
      })}
    </ul>
  );
}

export function TransferNetwork({ rows, transfers, directTransfers, mode, currency }: TransferNetworkProps) {
  if (rows.length > MAX_NETWORK_MEMBERS) {
    return (
      <div className={styles.card}>
        <p className={styles.tooLarge}>
          {t("group.balance.networkTooLarge", { count: rows.length, max: MAX_NETWORK_MEMBERS })}
        </p>
      </div>
    );
  }

  const positions = layoutNodes(rows.length);

  return (
    <div className={styles.card}>
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        role="img"
        aria-label={t("group.balance.networkAriaLabel")}
        className={styles.svg}
      >
        <Edges transfers={transfers} rows={rows} positions={positions} mode={mode} directTransfers={directTransfers} />
        <Nodes rows={rows} positions={positions} />
      </svg>
      <p className={styles.caption}>
        {mode === "simplified" ? t("group.balance.networkCaptionSimplified") : t("group.balance.networkCaptionDirect")}
      </p>
      <TransferSummary transfers={transfers} rows={rows} currency={currency} />
    </div>
  );
}
