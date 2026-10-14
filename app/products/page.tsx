"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CUSTOMERS, CERTIFICATIONS } from "@/data/factory";
import {
  allProducts,
  partsUnder,
  rolledUpCost,
  annualMaterialCost,
  allPartsByRisk,
  productAnnualRevenue,
} from "@/lib/graph";
import { PageHead, Eyebrow, Figure, Meter, SectionTitle, Tag, eur, num } from "@/components/ui";

export default function ProductsPage() {
  const risk = useMemo(() => new Map(allPartsByRisk().map((r) => [r.partId, r.score])), []);

  const rows = useMemo(
    () =>
      allProducts()
        .map((p) => {
          const parts = partsUnder(p.id);
          const atRisk = parts.filter((x) => (risk.get(x.partId) ?? 0) >= 70);
          const soleSourced = parts.filter((x) => (risk.get(x.partId) ?? 0) >= 45);
          const customers = CUSTOMERS.filter((c) => c.productIds.includes(p.id));
          const certs = CERTIFICATIONS.filter((c) => c.productIds.includes(p.id));
          // Worst component risk is the product's own exposure: a line stops for
          // the one part it cannot get, not for the average of its parts.
          const worst = Math.max(0, ...parts.map((x) => risk.get(x.partId) ?? 0));
          return { p, parts, atRisk, soleSourced, customers, certs, worst };
        })
        .sort((a, b) => b.worst - a.worst),
    [risk],
  );

  const totalRevenue = rows.reduce((s, r) => s + productAnnualRevenue(r.p.id), 0);
  const exposedLines = rows.filter((r) => r.atRisk.length > 0).length;

  return (
    <div className="mx-auto max-w-[1320px] px-8 pb-28 pt-12">
      <PageHead title="Products" meta={`${rows.length} lines · each carrying the risk of its most exposed component`} />

      <div>
        <div className="mt-12 grid gap-px border border-line sm:grid-cols-3">
          <div className="border border-line">
            <Figure label="Product lines" value={rows.length} />
          </div>
          <div className="border border-line">
            <Figure
              label="With a part at risk"
              value={exposedLines}
              tone={exposedLines ? "crit" : "none"}
              sub="risk score 70 or above"
            />
          </div>
          <div className="border border-line">
            <Figure label="Annual revenue" value={eur(totalRevenue)} sub="all lines, at standard margin" />
          </div>
        </div>
      </div>

      <div className="mt-14">
        <SectionTitle aside={<span className="text-[12px] text-dim">{rows.length} lines</span>}>
          Lines
        </SectionTitle>

        <div className="space-y-px">
          {rows.map(({ p, parts, atRisk, customers, certs, worst }) => (
            <div key={p.id} className="border border-line p-6 transition-colors duration-200 hover:border-line-bright">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] text-dim">{p.id}</span>
                      <span className="text-[17px] font-medium">{p.name}</span>
                      {atRisk.length > 0 && <Tag tone="crit">{atRisk.length} at risk</Tag>}
                    </div>
                    <p className="mt-2 text-[12.5px] text-dim">
                      {num(p.monthlyDemand ?? 0)}/month &middot; {parts.length} distinct components
                      &middot; {eur(rolledUpCost(p.id))} material per unit
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-10">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                        Annual build
                      </div>
                      <div className="mt-1.5 text-[15px] tabular-nums">
                        {eur(annualMaterialCost(p.id))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                        Under contract
                      </div>
                      <div className="mt-1.5 text-[15px] tabular-nums">{customers.length}</div>
                    </div>
                    <div className="w-32">
                      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                        Worst component
                      </div>
                      <div className="mt-2.5">
                        <Meter value={worst} tone={worst >= 70 ? "crit" : worst >= 45 ? "warn" : "none"} />
                      </div>
                      <div className="mt-1.5 text-[11.5px] tabular-nums text-dim">{worst} / 100</div>
                    </div>
                  </div>
                </div>

                {(atRisk.length > 0 || certs.length > 0) && (
                  <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4 text-[12px]">
                    {atRisk.length > 0 && (
                      <span className="text-dim">
                        Exposed:{" "}
                        {atRisk.slice(0, 4).map((x, j) => (
                          <span key={x.partId}>
                            {j > 0 && ", "}
                            <Link
                              href={`/parts/${encodeURIComponent(x.partId)}`}
                              className="font-mono text-crit underline-offset-2 hover:underline"
                            >
                              {x.partId}
                            </Link>
                          </span>
                        ))}
                      </span>
                    )}
                    {certs.length > 0 && (
                      <span className="text-dim">
                        Certified to: {certs.map((c) => c.id).join(", ")}
                      </span>
                    )}
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
