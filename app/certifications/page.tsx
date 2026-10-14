"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CERTIFICATIONS, NODES } from "@/data/factory";
import { allPartsByRisk, node } from "@/lib/graph";
import { PageHead, Eyebrow, Figure, SectionTitle, Tag, eur } from "@/components/ui";
import { Reveal } from "@/components/Reveal";

export default function CertificationsPage() {
  const risk = useMemo(() => new Map(allPartsByRisk().map((r) => [r.partId, r.score])), []);

  const rows = useMemo(
    () =>
      CERTIFICATIONS.map((c) => {
        const critical = c.criticalPartIds.map((id) => ({
          id,
          name: node(id)?.name ?? id,
          score: risk.get(id) ?? 0,
          sole: NODES.find((n) => n.id === id)?.altSources === 0,
        }));
        const exposed = critical.filter((p) => p.score >= 70);
        // Requalification is incurred per affected product, not once.
        const worstCase = c.requalCostEur * c.productIds.length;
        return { c, critical, exposed, worstCase };
      }).sort((a, b) => b.exposed.length - a.exposed.length || b.worstCase - a.worstCase),
    [risk],
  );

  const exposedCerts = rows.filter((r) => r.exposed.length > 0).length;
  const totalWorstCase = rows.reduce((t, r) => t + (r.exposed.length ? r.worstCase : 0), 0);
  const longestRequal = Math.max(...rows.map((r) => r.c.requalWeeks));

  return (
    <div className="mx-auto max-w-[1320px] px-8 py-14">
      <PageHead title="Certifications" meta={`${rows.length} certificates`} />

      <Reveal delay={1}>
        <div className="mt-12 grid gap-px border border-line sm:grid-cols-3">
          <div className="border border-line p-6">
            <Figure
              label="Certificates exposed"
              value={`${exposedCerts} of ${rows.length}`}
              tone={exposedCerts ? "crit" : "ok"}
              sub="a critical part is at risk"
            />
          </div>
          <div className="border border-line p-6">
            <Figure
              label="If those were substituted"
              value={eur(totalWorstCase)}
              sub="requalification, per affected product"
            />
          </div>
          <div className="border border-line p-6">
            <Figure label="Longest requalification" value={`${longestRequal} wk`} sub="before you could ship" />
          </div>
        </div>
      </Reveal>

      <div className="mt-14">
        <SectionTitle>Certificates</SectionTitle>

        <div className="space-y-px">
          {rows.map(({ c, critical, exposed, worstCase }, i) => (
            <Reveal key={c.id} delay={(i % 3) as 0 | 1 | 2}>
              <div className="border border-line p-6 transition-colors duration-200 hover:border-line-bright">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[12.5px] text-dim">{c.id}</span>
                      <span className="text-[17px] font-medium">{c.name}</span>
                      {exposed.length > 0 ? (
                        <Tag tone="crit">{exposed.length} critical part at risk</Tag>
                      ) : (
                        <Tag tone="ok">stable</Tag>
                      )}
                    </div>
                    <p className="mt-2 text-[13px] text-dim">{c.clause}</p>
                    <p className="mt-2 text-[13px] text-dim">
                      Covers {c.productIds.join(", ")}
                    </p>
                  </div>

                  <div className="flex items-start gap-10">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                        Requalify
                      </div>
                      <div className="mt-1.5 text-[15px] tabular-nums">{c.requalWeeks} wk</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                        Cost
                      </div>
                      <div className="mt-1.5 text-[15px] tabular-nums">{eur(c.requalCostEur)}</div>
                      <div className="mt-1 text-[11px] text-dim">
                        {eur(worstCase)} across {c.productIds.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                    Components named critical
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2.5">
                    {critical.map((p) => (
                      <Link
                        key={p.id}
                        href={`/parts/${encodeURIComponent(p.id)}`}
                        className="group flex items-baseline gap-2.5"
                      >
                        <span
                          className={`h-1 w-1 translate-y-[-2px] rounded-full ${
                            p.score >= 70 ? "bg-crit" : p.score >= 45 ? "bg-warn" : "bg-dim"
                          }`}
                        />
                        <span className="font-mono text-[12.5px] underline-offset-2 group-hover:underline">
                          {p.id}
                        </span>
                        <span className="text-[11.5px] tabular-nums text-dim">{p.score}</span>
                        {p.sole && <span className="text-[11px] text-dim">sole source</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
