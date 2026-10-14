"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SUPPLIERS, NODES } from "@/data/factory";
import { allPartsByRisk, qtyPerProduct } from "@/lib/graph";
import { PageHead, Eyebrow, Figure, Meter, SectionTitle, Tag, eur, num } from "@/components/ui";

export default function SuppliersPage() {
  const risk = useMemo(() => new Map(allPartsByRisk().map((r) => [r.partId, r.score])), []);

  const rows = useMemo(
    () =>
      SUPPLIERS.map((s) => {
        const parts = NODES.filter((n) => n.kind === "part" && n.supplierId === s.id);
        const atRisk = parts.filter((p) => (risk.get(p.id) ?? 0) >= 70);
        const sole = parts.filter((p) => p.altSources === 0);
        const inventory = parts.reduce((t, p) => t + (p.stockQty ?? 0) * (p.unitCostEur ?? 0), 0);
        const products = new Set(parts.flatMap((p) => Object.keys(qtyPerProduct(p.id))));
        const worstLead = Math.max(0, ...parts.map((p) => p.leadTimeWeeks ?? 0));
        return { s, parts, atRisk, sole, inventory, products: products.size, worstLead };
      }).sort((a, b) => b.s.eolRate - a.s.eolRate),
    [risk],
  );

  const totalInventory = rows.reduce((t, r) => t + r.inventory, 0);
  const soleSourcedTotal = rows.reduce((t, r) => t + r.sole.length, 0);

  return (
    <div className="mx-auto max-w-[1320px] px-8 pb-28 pt-12">
      <PageHead title="Suppliers" meta={`${rows.length} suppliers · ranked by how often they discontinue parts`} />

      <div>
        <div className="mt-12 grid gap-px border border-line sm:grid-cols-3">
          <div className="border border-line p-6">
            <Figure label="Suppliers" value={rows.length} sub={`${NODES.filter((n) => n.kind === "part").length} components`} />
          </div>
          <div className="border border-line p-6">
            <Figure
              label="Sole sourced"
              value={soleSourcedTotal}
              tone={soleSourcedTotal ? "crit" : "none"}
              sub="no qualified alternative"
            />
          </div>
          <div className="border border-line p-6">
            <Figure label="Inventory held" value={eur(totalInventory)} sub="at standard cost" />
          </div>
        </div>
      </div>

      <div className="mt-14">
        <SectionTitle aside={<span className="text-[12px] text-dim">by historical EOL rate</span>}>
          Suppliers
        </SectionTitle>

        <div className="space-y-px">
          {rows.map(({ s, parts, atRisk, sole, inventory, products, worstLead }) => (
            <div key={s.id} className="border border-line p-6 transition-colors duration-200 hover:border-line-bright">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-[17px] font-medium">{s.name}</span>
                      <span className="font-mono text-[12px] text-dim">{s.country}</span>
                      {sole.length > 0 && <Tag tone="crit">{sole.length} sole sourced</Tag>}
                      {atRisk.length > 0 && <Tag tone="warn">{atRisk.length} at risk</Tag>}
                    </div>
                    <p className="mt-2 text-[13px] text-dim">
                      {parts.length} components &middot; reaching {products} product
                      {products === 1 ? "" : "s"} &middot; longest lead time {worstLead} wk
                    </p>
                    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11.5px] text-dim">
                      {parts.slice(0, 6).map((p) => (
                        <Link
                          key={p.id}
                          href={`/parts/${encodeURIComponent(p.id)}`}
                          className="underline-offset-2 hover:text-fg hover:underline"
                        >
                          {p.id}
                        </Link>
                      ))}
                      {parts.length > 6 && <span>+{parts.length - 6} more</span>}
                    </p>
                  </div>

                  <div className="flex items-start gap-10">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                        Inventory
                      </div>
                      <div className="mt-1.5 text-[15px] tabular-nums">{eur(inventory)}</div>
                    </div>
                    <div className="w-36">
                      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                        Discontinuation rate
                      </div>
                      <div className="mt-2.5">
                        <Meter
                          value={s.eolRate * 100 * 6}
                          tone={s.eolRate >= 0.09 ? "crit" : s.eolRate >= 0.06 ? "warn" : "none"}
                        />
                      </div>
                      <div className="mt-1.5 text-[11.5px] tabular-nums text-dim">
                        {(s.eolRate * 100).toFixed(1)}% of catalogue per year
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
