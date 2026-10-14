"use client";

import Link from "next/link";
import type { ImpactReport } from "@/lib/types";
import { Tag, Panel, SectionTitle, Figure, eur, num, verdictTone } from "./ui";
import { PropagationGraph } from "./PropagationGraph";

export function ImpactPanel({ report: r }: { report: ImpactReport }) {
  const underwater = r.coverGapWeeks > 0;

  return (
    <Panel className="overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <Link
            href={`/parts/${encodeURIComponent(r.partId)}`}
            className="font-mono text-[15px] text-fg underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            {r.partId}
          </Link>
          <p className="mt-0.5 text-[12px] text-dim">
            {r.partName} &middot; {r.supplierName}
          </p>
        </div>
        <Tag tone={verdictTone(r.verdict)}>
          {r.verdict} &middot; {r.criticality}
        </Tag>
      </header>

      <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
        <Figure
          label="Last buy in"
          value={`${r.daysToLastBuy} days`}
          sub={r.lastBuyDate}
          tone={r.daysToLastBuy < 60 ? "crit" : undefined}
        />
        <Figure
          label="Stock runway"
          value={`${r.runwayWeeks} wk`}
          sub={`lead time ${r.leadTimeWeeks} wk`}
          tone={underwater ? "crit" : "ok"}
        />
        <Figure label="Must buy" value={num(r.lastBuyQty)} sub={eur(r.lastBuyCostEur)} />
        <Figure label="Revenue at risk" value={eur(r.revenueAtRiskEur)} sub="per year" />
      </div>

      <div className="space-y-6 px-5 py-5">
        {underwater && (
          <div className="animate-fade-in border border-crit/50  px-3.5 py-3">
            <p className="text-[13px] text-crit">
              Already {r.coverGapWeeks} weeks exposed, deadline aside.
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-mid">
              Stock covers {r.runwayWeeks} weeks and replenishment takes {r.leadTimeWeeks}. That
              gap is true today and has nothing to do with the last-buy date.
            </p>
          </div>
        )}

        <div>
          <SectionTitle
            aside={
              <span className="text-[11px] text-dim">
                {r.weeklyConsumption}/week &middot; {num(r.stockQty)} in stock
              </span>
            }
          >
            Affected products &middot; {r.affectedProducts.length}
          </SectionTitle>
          <div className="mb-6 overflow-x-auto border border-line py-4">
            <div className="min-w-[720px]">
              <PropagationGraph partId={r.partId} />
            </div>
          </div>

          <div className="stagger space-y-1.5">
            {r.affectedProducts.map((p) => (
              <div key={p.productId} className="border border-line bg-transparent px-3.5 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px]">
                    <span className="font-mono text-[12px] text-mid">{p.productId}</span>{" "}
                    <span className="text-fg">{p.productName}</span>
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-dim">
                    {p.qtyPerUnit} /unit &middot; {num(p.monthlyDemand)}/mo
                  </span>
                </div>
                {/* Each route is printed so the quantity can be checked by hand. */}
                {p.paths.map((path, i) => (
                  <div key={i} className="mt-1 font-mono text-[10.5px] leading-relaxed text-dim">
                    {path.join("  →  ")}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <SectionTitle>Certifications re-opened</SectionTitle>
            {r.affectedCertifications.length === 0 ? (
              <p className="text-[12px] text-dim">
                None. This part is named critical in no certification clause.
              </p>
            ) : (
              <div className="space-y-1.5">
                {r.affectedCertifications.map((c) => (
                  <div key={c.id} className="border border-line bg-transparent px-3.5 py-2.5">
                    <p className="text-[12.5px] text-fg">{c.name}</p>
                    <p className="mt-0.5 text-[11px] text-dim">{c.clause}</p>
                    <p className="mt-1.5 text-[11.5px] text-warn">
                      {c.requalWeeks} wk requalification &middot; {eur(c.requalCostEur)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle>Customers under contract</SectionTitle>
            <div className="space-y-1">
              {r.affectedCustomers.map((c) => (
                <div key={c.customerId} className="flex justify-between text-[12.5px]">
                  <span className="text-mid">{c.name}</span>
                  <span className="tabular-nums text-dim">{num(c.annualUnits)}/yr</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
