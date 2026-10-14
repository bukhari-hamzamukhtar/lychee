"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NODES, SUPPLIERS, EDGES } from "@/data/factory";
import { allPartsByRisk, qtyPerProduct } from "@/lib/graph";
import { Badge, Card, SectionTitle, Stat, eur, num } from "@/components/ui";

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
    <div className="space-y-7">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Parts</h1>
        <p className="mt-1 text-[13px] text-muted">
          Every component in the bill of materials, scored for obsolescence risk before any
          notice arrives.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-2 divide-x divide-y divide-hair sm:grid-cols-4 sm:divide-y-0">
          <Stat label="Components" value={rows.length} sub={`${EDGES.length} BOM edges`} />
          <Stat label="Sole sourced" value={soleSourced} tone={soleSourced ? "crit" : undefined} sub="no alternative" />
          <Stat label="Not recommended" value={nrnd} tone={nrnd ? "warn" : undefined} sub="for new designs" />
          <Stat label="Inventory value" value={eur(inventory)} sub="at standard cost" />
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search part number, description or supplier"
          className="min-w-64 flex-1 rounded-lg border border-edge bg-surface px-3.5 py-2 text-[13px] outline-none transition-colors placeholder:text-faint focus:border-primary"
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
              className={`rounded-md border px-2.5 py-1.5 text-[12px] transition-colors ${
                sort === k ? "border-edge bg-panel text-body" : "border-transparent text-faint hover:text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section>
        <SectionTitle aside={<span className="text-[11px] text-faint">{rows.length} shown</span>}>
          Components
        </SectionTitle>
        {rows.length === 0 ? (
          <Card className="px-5 py-10 text-center">
            <p className="text-[13px] text-faint">Nothing matches &ldquo;{q}&rdquo;.</p>
          </Card>
        ) : (
          <div className="stagger space-y-1.5">
            {rows.map((p) => (
              <Link key={p.id} href={`/parts/${encodeURIComponent(p.id)}`} className="block">
                <Card interactive className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12.5px] text-body">{p.id}</span>
                        {p.altSources === 0 && <Badge tone="crit">sole source</Badge>}
                        {p.lifecycle === "nrnd" && <Badge tone="warn">NRND</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-[11.5px] text-faint">
                        {p.name} &middot; {p.supplier}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-[10px] uppercase tracking-wider text-faint">In</div>
                      <div className="text-[12.5px] tabular-nums text-muted">{p.products} products</div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-[10px] uppercase tracking-wider text-faint">Stock</div>
                      <div className="text-[12.5px] tabular-nums text-muted">{num(p.stockQty ?? 0)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-faint">Lead</div>
                      <div className="text-[12.5px] tabular-nums text-muted">{p.leadTimeWeeks} wk</div>
                    </div>
                    <RiskMeter score={p.score} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RiskMeter({ score }: { score: number }) {
  const tone = score >= 70 ? "bg-crit" : score >= 45 ? "bg-warn" : "bg-ok";
  const text = score >= 70 ? "text-crit" : score >= 45 ? "text-warn" : "text-muted";
  return (
    <div className="flex w-24 shrink-0 items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-panel">
        <div
          className={`h-full origin-left animate-grow rounded-full ${tone}`}
          style={{ width: `${Math.max(4, score)}%` }}
        />
      </div>
      <span className={`w-6 text-right text-[12px] tabular-nums ${text}`}>{score}</span>
    </div>
  );
}
