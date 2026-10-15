"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pathsToProducts, qtyPerProduct, node, withDataset, type Dataset } from "@/lib/graph";

/**
 * The bill of materials, drawn, with the change propagating through it.
 *
 * Columns come from the real graph: a node sits in the column matching its
 * longest distance from the discontinued part, so an assembly that is both a
 * direct parent and a grandparent is drawn once, at its deepest position, and
 * no edge ever points backwards.
 *
 * The animation is the argument. You watch one component reach five finished
 * products through routes nobody holds in their head.
 */

interface Laid {
  id: string;
  label: string;
  col: number;
  row: number;
  kind: "part" | "assembly" | "product";
  qty?: number;
}

interface Edge {
  from: Laid;
  to: Laid;
  step: number;
}

const COL_W = 196;
const ROW_H = 54;
const PAD_X = 16;
const PAD_Y = 28;

function layout(partId: string) {
  const paths = pathsToProducts(partId);
  // A part that reaches nothing — or that is not in the loaded bill of materials
  // at all — comes back as a single hop to itself. One lone box is not a
  // propagation diagram, so there is nothing worth drawing.
  if (paths.length === 0 || paths.every((p) => p.length < 2)) return null;

  // Deepest column wins, so edges always run left to right.
  const col = new Map<string, number>();
  for (const path of paths) {
    path.forEach((id, i) => col.set(id, Math.max(col.get(id) ?? 0, i)));
  }

  // Products are reached in different numbers of hops — HMI-7 hangs straight off
  // a board while MD-7500 is three deep — but they are all finished goods and
  // belong in one final column, or the picture reads as if some are sub-parts.
  const maxCol = Math.max(...col.values());
  for (const [id] of col) {
    if (node(id)?.kind === "product") col.set(id, maxCol);
  }

  const byCol = new Map<number, string[]>();
  for (const [id, c] of col) {
    if (!byCol.has(c)) byCol.set(c, []);
    byCol.get(c)!.push(id);
  }
  for (const list of byCol.values()) list.sort();

  const qty = qtyPerProduct(partId);
  const nodes = new Map<string, Laid>();
  for (const [c, ids] of byCol) {
    ids.forEach((id, r) => {
      const n = node(id);
      nodes.set(id, {
        id,
        label: id,
        col: c,
        row: r,
        kind: (n?.kind as Laid["kind"]) ?? "assembly",
        qty: qty[id],
      });
    });
  }

  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const key = `${path[i]}>${path[i + 1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const from = nodes.get(path[i])!;
      const to = nodes.get(path[i + 1])!;
      if (from && to && to.col > from.col) edges.push({ from, to, step: from.col });
    }
  }

  const cols = Math.max(...col.values()) + 1;
  const rows = Math.max(...[...byCol.values()].map((v) => v.length));
  return {
    nodes: [...nodes.values()],
    edges,
    width: cols * COL_W + PAD_X * 2,
    height: rows * ROW_H + PAD_Y * 2,
    cols,
  };
}

const x = (n: Laid) => PAD_X + n.col * COL_W;
const y = (n: Laid, rows: number) => PAD_Y + n.row * ROW_H + (rows - 1 - 0) * 0 + 10;

export function PropagationGraph({
  partId,
  autoPlay = true,
  loop = false,
  className = "",
  dataset,
}: {
  partId: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  /** Draw against this bill of materials instead of the loaded one. */
  dataset?: Dataset;
}) {
  const data = useMemo(
    () => (dataset ? withDataset(dataset, () => layout(partId)) : layout(partId)),
    [partId, dataset],
  );
  const [step, setStep] = useState(autoPlay ? -1 : 99);
  const host = useRef<HTMLDivElement>(null);

  // Advance one column at a time, starting when the graph is actually on screen.
  useEffect(() => {
    if (!autoPlay || !data || !host.current) return;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.forEach(clearTimeout);
      timers = [];
      setStep(-1);
      for (let i = 0; i <= data.cols; i++) {
        timers.push(setTimeout(() => setStep(i), 260 + i * 520));
      }
      if (loop) timers.push(setTimeout(run, 260 + (data.cols + 2) * 520 + 2400));
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.3 },
    );
    io.observe(host.current);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [data, autoPlay, loop]);

  if (!data) return null;

  const rowsPerCol = new Map<number, number>();
  data.nodes.forEach((n) => rowsPerCol.set(n.col, Math.max(rowsPerCol.get(n.col) ?? 0, n.row + 1)));

  // Centre each column vertically so the fan reads as a fan.
  const yOf = (n: Laid) => {
    const rows = rowsPerCol.get(n.col) ?? 1;
    const block = rows * ROW_H;
    return (data.height - block) / 2 + n.row * ROW_H + ROW_H / 2;
  };

  return (
    <div ref={host} className={className}>
      <svg
        viewBox={`0 0 ${data.width} ${data.height}`}
        className="w-full"
        role="img"
        aria-label={`How ${partId} reaches each finished product through the bill of materials`}
      >
        {data.edges.map((e, i) => {
          const x1 = x(e.from) + 128;
          const y1 = yOf(e.from);
          const x2 = x(e.to);
          const y2 = yOf(e.to);
          const mx = (x1 + x2) / 2;
          const on = step > e.step;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={on ? "#FF4D2E" : "#1C1F24"}
              strokeWidth={on ? 1.25 : 1}
              opacity={on ? 0.75 : 1}
              style={{ transition: "stroke 520ms ease, opacity 520ms ease, stroke-width 520ms ease" }}
            />
          );
        })}

        {data.nodes.map((n) => {
          const on = step >= n.col;
          const isPart = n.kind === "part";
          const isProduct = n.kind === "product";
          return (
            <g
              key={n.id}
              style={{
                opacity: on ? 1 : 0.22,
                transition: "opacity 520ms ease",
              }}
            >
              <line
                x1={x(n)}
                y1={yOf(n) - 15}
                x2={x(n)}
                y2={yOf(n) + 15}
                stroke={on ? (isPart ? "#FF4D2E" : isProduct ? "#F2F4F7" : "#9BA3AE") : "#32373F"}
                strokeWidth={isPart || isProduct ? 2 : 1}
                style={{ transition: "stroke 520ms ease" }}
              />
              {/* Edges pass behind labels; a knockout in the page colour keeps
                  the text readable without introducing a visible box. */}
              <rect
                x={x(n) + 6}
                y={yOf(n) - 14}
                width={124}
                height={28}
                fill="#08090B"
              />
              <text
                x={x(n) + 10}
                y={yOf(n) - 2}
                fontSize={11}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill={on ? (isPart ? "#FF4D2E" : "#F2F4F7") : "#6B7280"}
                style={{ transition: "fill 520ms ease" }}
              >
                {n.label}
              </text>
              <text
                x={x(n) + 10}
                y={yOf(n) + 12}
                fontSize={10}
                fill="#6B7280"
              >
                {isProduct && n.qty !== undefined
                  ? `${n.qty} per unit`
                  : isPart
                    ? "discontinued"
                    : node(n.id)?.name?.slice(0, 22) ?? ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
