"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { NODES, SUPPLIERS, CERTIFICATIONS } from "@/data/factory";
import { impactOf, obsolescenceRisk, qtyPerProduct, pathsToProducts, node } from "@/lib/graph";
import { ImpactPanel } from "@/components/ImpactPanel";
import { Badge, Card, Empty, SectionTitle, Stat, eur, num } from "@/components/ui";

const ASOF = new Date("2026-10-14T00:00:00Z");
/** Hypothetical deadline used to show what a notice on this part would mean. */
const HORIZON = "2027-06-30";

const FEATURE_LABEL: Record<string, string> = {
  supplierEolRate: "Supplier's historical EOL rate",
  soleSourced: "Sole sourced",
  lowAltSources: "Few alternative sources",
  longLeadTime: "Long lead time",
  nrnd: "Not recommended for new designs",
  fanIn: "Used by many assemblies",
  productReach: "Reaches many products",
};

export default function PartDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const partId = decodeURIComponent(id);

  const part = node(partId);
  const risk = useMemo(() => obsolescenceRisk(partId), [partId]);
  const report = useMemo(() => impactOf(partId, HORIZON, ASOF), [partId]);
  const qty = useMemo(() => qtyPerProduct(partId), [partId]);
  const paths = useMemo(() => pathsToProducts(partId), [partId]);

  if (!part || part.kind !== "part") {
    return (
      <Empty
        title="No such part"
        body="That component is not in this bill of materials."
        action={{ href: "/parts", label: "Back to parts" }}
      />
    );
  }

  const supplier = SUPPLIERS.find((s) => s.id === part.supplierId);
  const certs = CERTIFICATIONS.filter((c) => c.criticalPartIds.includes(partId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/parts" className="text-[12px] text-faint transition-colors hover:text-muted">
            &larr; Parts
          </Link>
          <h1 className="mt-1.5 font-mono text-lg font-semibold tracking-tight">{part.id}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {part.name} &middot; {supplier?.name} ({supplier?.country})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {part.altSources === 0 && <Badge tone="crit">sole source</Badge>}
          {part.lifecycle === "nrnd" && <Badge tone="warn">NRND</Badge>}
          {certs.length > 0 && <Badge tone="info">certification critical</Badge>}
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-2 divide-x divide-y divide-hair sm:grid-cols-4 sm:divide-y-0">
          <Stat label="Unit cost" value={eur(part.unitCostEur ?? 0)} />
          <Stat label="Lead time" value={`${part.leadTimeWeeks} wk`} />
          <Stat label="Stock" value={num(part.stockQty ?? 0)} sub={eur((part.stockQty ?? 0) * (part.unitCostEur ?? 0))} />
          <Stat
            label="Alternative sources"
            value={part.altSources ?? 0}
            tone={part.altSources === 0 ? "crit" : undefined}
          />
        </div>
      </Card>

      {risk && (
        <Card className="px-5 py-5">
          <SectionTitle
            aside={
              <span
                className={`text-[13px] tabular-nums ${
                  risk.score >= 70 ? "text-crit" : risk.score >= 45 ? "text-warn" : "text-muted"
                }`}
              >
                {risk.score} / 100
              </span>
            }
          >
            Obsolescence risk, before any notice
          </SectionTitle>
          <div className="space-y-1.5">
            {Object.entries(risk.features)
              .filter(([, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-60 shrink-0 text-[12px] text-muted">
                    {FEATURE_LABEL[k] ?? k}
                  </span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-panel">
                    <div
                      className="h-full origin-left animate-grow rounded-full bg-primary"
                      style={{ width: `${Math.round(Math.min(1, v) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11.5px] tabular-nums text-faint">
                    {v.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
            Computed from this part&rsquo;s position in the graph and its supplier&rsquo;s history,
            not from any announcement. This is the queue to work through before a notice forces
            the issue.
          </p>
        </Card>
      )}

      {Object.keys(qty).length === 0 ? (
        <Empty title="Not used in any product" body="This component appears in no assembly in the current bill of materials." />
      ) : (
        <>
          <Card className="px-5 py-5">
            <SectionTitle>Where it is used</SectionTitle>
            <div className="space-y-1.5">
              {paths.map((p, i) => (
                <div key={i} className="font-mono text-[11px] leading-relaxed text-faint">
                  {p.join("  →  ")}
                </div>
              ))}
            </div>
          </Card>

          {report && (
            <div>
              <SectionTitle>
                If it were discontinued &middot; modelled against {HORIZON}
              </SectionTitle>
              <ImpactPanel report={report} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
