"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NODES, SUPPLIERS, EDGES } from "@/data/factory";
import { allPartsByRisk, qtyPerProduct } from "@/lib/graph";
import { Tag, Panel, SectionTitle, Figure, eur, num } from "@/components/ui";

type SortKey = "risk" | "id" | "stock" | "lead";

export default function PartsPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("risk");

  const risk = useMemo(() => new Map(allPartsByRisk().map((r) => [r.partId, r.score])), []);

  const rows = useMemo(() => {
    const parts = NODES.filter((n) => n.kind === "part").map((n) => ({
      ...n,
      supplier: SUPPLIERS.find((s) => s.id === n.supplierId)?.name ?? "—",
      score: risk.get(n.id) ?? 0,
      products: Object.keys(qtyPerProduct(n.id)).length,
    }));
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? parts.filter(
          (p) =>
            p.id.toLowerCase().includes(needle) ||
            p.name.toLowerCase().includes(needle) ||
            p.supplier.toLowerCase().includes(needle),
        )
      : parts;
    return filtered.sort((a, b) => {
      if (sort === "id") return a.id.localeCompare(b.id);
      if (sort === "stock") return (a.stockQty ?? 0) - (b.stockQty ?? 0);
      if (sort === "lead") return (b.leadTimeWeeks ?? 0) - (a.leadTimeWeeks ?? 0);
      return b.score - a.score;
    });
  }, [q, sort, risk]);

  const soleSourced = rows.filter((r) => r.altSources === 0).length;
  const nrnd = rows.filter((r) => r.lifecycle === "nrnd").length;
  const inventory = rows.reduce((s, r) => s + (r.stockQty ?? 0) * (r.unitCostEur ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="space-y-7">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Parts</h1>
        <p className="mt-1 text-[13px] text-mid">
          Every component in the bill of materials, scored for obsolescence risk before any
          notice arrives.
        </p>
      </div>

      <Panel>
        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
          <Figure label="Components" value={rows.length} sub={`${EDGES.length} BOM edges`} />
          <Figure label="Sole sourced" value={soleSourced} tone={soleSourced ? "crit" : undefined} sub="no alternative" />
          <Figure label="Not recommended" value={nrnd} tone={nrnd ? "warn" : undefined} sub="for new designs" />
          <Figure label="Inventory value" value={eur(inventory)} sub="at standard cost" />
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search part number, description or supplier"
          className="min-w-64 flex-1 border border-line bg-transparent px-3.5 py-2 text-[13px] outline-none transition-colors placeholder:text-dim focus:border-primary"
        />
        <div className="flex gap-1">
          {(
            [
              ["risk", "Risk"],
              ["id", "Part"],
              ["stock", "Stock"],
              ["lead", "Lead time"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={` border px-2.5 py-1.5 text-[12px] transition-colors ${
                sort === k ? "border-line bg-bg-raised text-fg" : "border-transparent text-dim hover:text-mid"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section>
        <SectionTitle aside={<span className="text-[11px] text-dim">{rows.length} shown</span>}>
          Components
        </SectionTitle>
        {rows.length === 0 ? (
          <Panel className="px-5 py-10 text-center">
            <p className="text-[13px] text-dim">Nothing matches &ldquo;{q}&rdquo;.</p>
          </Panel>
        ) : (
          <div className="stagger space-y-1.5">
            {rows.map((p) => (
              <Link key={p.id} href={`/parts/${encodeURIComponent(p.id)}`} className="block">
                <Panel interactive className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12.5px] text-fg">{p.id}</span>
                        {p.altSources === 0 && <Tag tone="crit">sole source</Tag>}
                        {p.lifecycle === "nrnd" && <Tag tone="warn">NRND</Tag>}
                      </div>
                      <p className="mt-0.5 truncate text-[11.5px] text-dim">
                        {p.name} &middot; {p.supplier}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-[10px] uppercase tracking-wider text-dim">In</div>
                      <div className="text-[12.5px] tabular-nums text-mid">{p.products} products</div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-[10px] uppercase tracking-wider text-dim">Stock</div>
                      <div className="text-[12.5px] tabular-nums text-mid">{num(p.stockQty ?? 0)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-dim">Lead</div>
                      <div className="text-[12.5px] tabular-nums text-mid">{p.leadTimeWeeks} wk</div>
                    </div>
                    <RiskMeter score={p.score} />
                  </div>
                </Panel>
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

function RiskMeter({ score }: { score: number }) {
  const bar = score >= 70 ? "bg-crit" : score >= 45 ? "bg-warn" : "bg-dim";
  const text = score >= 70 ? "text-crit" : score >= 45 ? "text-warn" : "text-dim";
  return (
    <div className="flex w-24 shrink-0 items-center gap-2.5">
      <div className="h-px flex-1 bg-line">
        <div
          className={`h-px origin-left animate-grow ${bar}`}
          style={{ width: `${Math.max(3, score)}%` }}
        />
      </div>
      <span className={`w-6 text-right text-[12px] tabular-nums ${text}`}>{score}</span>
    </div>
  );
}
