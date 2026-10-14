"use client";

import type { ImpactReport } from "@/lib/types";

const eur = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const num = (n: number) => new Intl.NumberFormat("en-GB").format(n);

const TONE = {
  critical: "border-crit/50 text-crit",
  high: "border-warn/50 text-warn",
  watch: "border-edge text-white/50",
} as const;

export function ImpactPanel({ report: r }: { report: ImpactReport }) {
  const underwater = r.coverGapWeeks > 0;

  return (
    <section className="rounded-lg border border-edge">
      <header className="flex items-start justify-between gap-4 border-b border-edge px-4 py-3">
        <div>
          <h2 className="font-mono text-sm">{r.partId}</h2>
          <p className="text-xs text-white/40">
            {r.partName} &middot; {r.supplierName}
          </p>
        </div>
        <span className={`shrink-0 rounded border px-2 py-1 text-xs uppercase ${TONE[r.verdict]}`}>
          {r.verdict} &middot; {r.criticality}
        </span>
      </header>

      {/* the four numbers that drive the decision */}
      <div className="grid grid-cols-2 divide-x divide-y divide-edge border-b border-edge sm:grid-cols-4 sm:divide-y-0">
        <Stat label="Last buy in" value={`${r.daysToLastBuy} days`} tone={r.daysToLastBuy < 60 ? "crit" : "none"} />
        <Stat
          label="Stock runway"
          value={`${r.runwayWeeks} wk`}
          sub={`lead time ${r.leadTimeWeeks} wk`}
          tone={underwater ? "crit" : "none"}
        />
        <Stat label="Must buy" value={num(r.lastBuyQty)} sub={eur(r.lastBuyCostEur)} />
        <Stat label="Revenue at risk" value={eur(r.revenueAtRiskEur)} sub="per year" />
      </div>

      <div className="space-y-5 px-4 py-4">
        {underwater && (
          <p className="rounded border border-crit/40 bg-crit/5 px-3 py-2 text-xs text-crit">
            Stock covers {r.runwayWeeks} weeks but replenishment takes {r.leadTimeWeeks}.
            Production is already {r.coverGapWeeks} weeks exposed, independently of the
            last-buy deadline.
          </p>
        )}

        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-white/40">
            Affected products &middot; {r.affectedProducts.length}
          </h3>
          <ul className="space-y-2">
            {r.affectedProducts.map((p) => (
              <li key={p.productId} className="rounded border border-edge/70 px-3 py-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span>
                    <span className="font-mono text-xs text-white/70">{p.productId}</span>{" "}
                    {p.productName}
                  </span>
                  <span className="text-xs text-white/40">
                    {p.qtyPerUnit} pcs/unit &middot; {num(p.monthlyDemand)}/mo
                  </span>
                </div>
                {/* every path is shown so the number can be audited by hand */}
                {p.paths.map((path, i) => (
                  <div key={i} className="mt-1 font-mono text-[11px] text-white/25">
                    {path.join(" → ")}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs uppercase tracking-wide text-white/40">
              Certifications re-opened
            </h3>
            {r.affectedCertifications.length === 0 ? (
              <p className="text-xs text-white/30">None.</p>
            ) : (
              <ul className="space-y-2">
                {r.affectedCertifications.map((c) => (
                  <li key={c.id} className="rounded border border-edge/70 px-3 py-2 text-xs">
                    <span className="text-white/70">{c.name}</span>
                    <span className="mt-0.5 block text-white/35">{c.clause}</span>
                    <span className="mt-1 block text-white/50">
                      {c.requalWeeks} wk requalification &middot; {eur(c.requalCostEur)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs uppercase tracking-wide text-white/40">
              Customers under contract
            </h3>
            <ul className="space-y-1 text-xs">
              {r.affectedCustomers.map((c) => (
                <li key={c.customerId} className="flex justify-between">
                  <span className="text-white/60">{c.name}</span>
                  <span className="text-white/35">{num(c.annualUnits)}/yr</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <footer className="border-t border-edge px-4 py-3">
        <p className="text-xs text-white/30">
          Figures computed by graph traversal, not generated. The memo and the draft
          emails are written by an open model on AMD, and nothing is sent until a person
          approves.
        </p>
      </footer>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "none",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "crit" | "none";
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-white/35">{label}</div>
      <div className={`mt-0.5 text-lg tabular-nums ${tone === "crit" ? "text-crit" : ""}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-white/30">{sub}</div>}
    </div>
  );
}
