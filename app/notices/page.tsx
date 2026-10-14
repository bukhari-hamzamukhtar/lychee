"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWorkspace } from "@/lib/store";
import { impactOf, allPartsByRisk, productAnnualRevenue } from "@/lib/graph";
import { SUPPLIERS } from "@/data/factory";
import { UploadDropzone } from "@/components/UploadDropzone";
import { PageHead, Tag, Panel, SectionTitle, Figure, SkeletonRows, eur, num, verdictTone } from "@/components/ui";

const ASOF = new Date("2026-10-14T00:00:00Z");

export default function NoticesPage() {
  const { notices, uploaded, approvals, hydrated } = useWorkspace();

  const rows = useMemo(
    () =>
      notices.map((pcn) => {
        const reports = pcn.partIds
          .map((id) => impactOf(id, pcn.lastBuyDate, ASOF))
          .filter((r): r is NonNullable<typeof r> => r !== null);
        const lead = reports.sort((a, b) => b.criticality - a.criticality)[0] ?? null;
        return {
          pcn,
          lead,
          supplier: SUPPLIERS.find((s) => s.id === pcn.supplierId)?.name ?? pcn.supplierId,
          isUpload: uploaded.some((u) => u.id === pcn.id),
        };
      }),
    [notices, uploaded],
  );

  const open = rows.filter((r) => r.lead && !approvals.some((a) => a.pcnId === r.pcn.id));
  // Union, not sum: notices on different parts routinely threaten the same
  // products, and adding their totals would count that revenue more than once.
  const exposed = useMemo(() => {
    const products = new Set<string>();
    for (const r of rows) for (const p of r.lead?.affectedProducts ?? []) products.add(p.productId);
    return [...products].reduce((s, id) => s + productAnnualRevenue(id), 0);
  }, [rows]);
  const soonest = open
    .map((r) => r.lead!.daysToLastBuy)
    .sort((a, b) => a - b)[0];
  const atRisk = useMemo(() => allPartsByRisk().filter((r) => r.score >= 70).length, []);

  return (
    <div className="mx-auto max-w-[1320px] px-8 pb-28 pt-12">
      <div className="space-y-7">
      <PageHead
        title="Notices"
        meta={hydrated ? `${open.length} open · incoming supplier changes and what they break` : undefined}
      />

      <Panel>
        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
          <Figure label="Open notices" value={hydrated ? open.length : "—"} />
          <Figure
            label="Soonest deadline"
            value={hydrated && soonest !== undefined ? `${soonest} days` : "—"}
            tone={soonest !== undefined && soonest < 60 ? "crit" : undefined}
          />
          <Figure label="Revenue exposed" value={hydrated ? eur(exposed) : "—"} sub="per year" />
          <Figure label="Parts at risk" value={atRisk} sub="before any notice" tone={atRisk > 0 ? "warn" : undefined} />
        </div>
      </Panel>

      <UploadDropzone />

      <section>
        <SectionTitle aside={<span className="text-[11px] text-dim">{rows.length} total</span>}>
          Inbox
        </SectionTitle>

        {!hydrated ? (
          <SkeletonRows n={3} />
        ) : (
          <div className="stagger space-y-2">
            {rows.map(({ pcn, lead, supplier, isUpload }) => (
              <Link key={pcn.id} href={`/notices/${pcn.id}`} className="block">
                <Panel interactive className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] text-fg">{pcn.id}</span>
                        <Tag tone="none">{pcn.language.toUpperCase()}</Tag>
                        {isUpload && <Tag tone="accent">uploaded</Tag>}
                        {pcn.type === "change" && <Tag tone="none">change</Tag>}
                      </div>
                      <p className="mt-1 truncate text-[12px] text-dim">
                        {supplier} &middot; {pcn.partIds.join(", ")} &middot; received {pcn.receivedAt}
                      </p>
                    </div>

                    {lead ? (
                      <>
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wider text-dim">Last buy</div>
                          <div
                            className={`text-sm tabular-nums ${
                              lead.daysToLastBuy < 60 ? "text-crit" : "text-fg"
                            }`}
                          >
                            {lead.daysToLastBuy} days
                          </div>
                        </div>
                        <div className="hidden text-right sm:block">
                          <div className="text-[10px] uppercase tracking-wider text-dim">Must buy</div>
                          <div className="text-sm tabular-nums text-fg">{eur(lead.lastBuyCostEur)}</div>
                        </div>
                        <Tag tone={verdictTone(lead.verdict)}>
                          {lead.verdict} &middot; {lead.criticality}
                        </Tag>
                      </>
                    ) : (
                      <Tag tone="none">no BOM match</Tag>
                    )}
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
