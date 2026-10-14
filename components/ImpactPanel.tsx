"use client";

import Link from "next/link";
import type { ImpactReport } from "@/lib/types";
import { Badge, Card, SectionTitle, Stat, eur, num, verdictTone } from "./ui";

export function ImpactPanel({ report: r }: { report: ImpactReport }) {
  const underwater = r.coverGapWeeks > 0;

  return (
    <Card className="overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hair px-5 py-4">
        <div>
          <Link
            href={`/parts/${encodeURIComponent(r.partId)}`}
            className="font-mono text-[15px] text-body underline-offset-4 transition-colors hover:text-primary-soft hover:underline"
          >
            {r.partId}
          </Link>
          <p className="mt-0.5 text-[12px] text-faint">
            {r.partName} &middot; {r.supplierName}
          </p>
        </div>
        <Badge tone={verdictTone(r.verdict)}>
          {r.verdict} &middot; {r.criticality}
        </Badge>
      </header>

      <div className="grid grid-cols-2 divide-x divide-y divide-hair sm:grid-cols-4 sm:divide-y-0">
        <Stat
          label="Last buy in"
          value={`${r.daysToLastBuy} days`}
          sub={r.lastBuyDate}
          tone={r.daysToLastBuy < 60 ? "crit" : undefined}
        />
        <Stat
          label="Stock runway"
          value={`${r.runwayWeeks} wk`}
          sub={`lead time ${r.leadTimeWeeks} wk`}
          tone={underwater ? "crit" : "ok"}
        />
        <Stat label="Must buy" value={num(r.lastBuyQty)} sub={eur(r.lastBuyCostEur)} />
        <Stat label="Revenue at risk" value={eur(r.revenueAtRiskEur)} sub="per year" />
      </div>

      <div className="space-y-6 px-5 py-5">
        {underwater && (
          <div className="animate-fade-in rounded-lg border border-crit/40 bg-crit/5 px-3.5 py-3">
            <p className="text-[13px] text-crit">
              Already {r.coverGapWeeks} weeks exposed, deadline aside.
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Stock covers {r.runwayWeeks} weeks and replenishment takes {r.leadTimeWeeks}. That
              gap is true today and has nothing to do with the last-buy date.
            </p>
          </div>
        )}

        <div>
          <SectionTitle
            aside={
              <span className="text-[11px] text-faint">
                {r.weeklyConsumption}/week &middot; {num(r.stockQty)} in stock
              </span>
            }
          >
            Affected products &middot; {r.affectedProducts.length}
          </SectionTitle>
          <div className="stagger space-y-1.5">
            {r.affectedProducts.map((p) => (
              <div key={p.productId} className="rounded-lg border border-hair bg-panel/40 px-3.5 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px]">
                    <span className="font-mono text-[12px] text-muted">{p.productId}</span>{" "}
                    <span className="text-body">{p.productName}</span>
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-faint">
                    {p.qtyPerUnit} /unit &middot; {num(p.monthlyDemand)}/mo
                  </span>
                </div>
                {/* Each route is printed so the quantity can be checked by hand. */}
                {p.paths.map((path, i) => (
                  <div key={i} className="mt-1 font-mono text-[10.5px] leading-relaxed text-faint/70">
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
              <p className="text-[12px] text-faint">
                None. This part is named critical in no certification clause.
              </p>
            ) : (
              <div className="space-y-1.5">
                {r.affectedCertifications.map((c) => (
                  <div key={c.id} className="rounded-lg border border-hair bg-panel/40 px-3.5 py-2.5">
                    <p className="text-[12.5px] text-body">{c.name}</p>
                    <p className="mt-0.5 text-[11px] text-faint">{c.clause}</p>
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
                  <span className="text-muted">{c.name}</span>
                  <span className="tabular-nums text-faint">{num(c.annualUnits)}/yr</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
