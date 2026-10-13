"use client";

import { useMemo, useState } from "react";
import { PCN_INBOX, SUPPLIERS } from "@/data/factory";
import { impactOf, allPartsByRisk } from "@/lib/graph";
import { PcnInbox } from "@/components/PcnInbox";
import { ImpactPanel } from "@/components/ImpactPanel";

const ASOF = new Date("2026-10-14T00:00:00Z");

export default function Page() {
  const [selected, setSelected] = useState(PCN_INBOX[0].id);

  const pcn = PCN_INBOX.find((p) => p.id === selected)!;
  const supplier = SUPPLIERS.find((s) => s.id === pcn.supplierId);

  const reports = useMemo(
    () =>
      pcn.partIds
        .map((id) => impactOf(id, pcn.lastBuyDate, ASOF))
        .filter((r): r is NonNullable<typeof r> => r !== null),
    [pcn],
  );

  const risk = useMemo(() => allPartsByRisk().slice(0, 5), []);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-6">
        <section>
          <h1 className="mb-3 text-xs uppercase tracking-wide text-white/40">
            Supplier notices
          </h1>
          <PcnInbox items={PCN_INBOX} selectedId={selected} onSelect={setSelected} />
        </section>

        <section>
          <h2 className="mb-3 text-xs uppercase tracking-wide text-white/40">
            Obsolescence risk, no notice yet
          </h2>
          <ul className="divide-y divide-edge rounded-lg border border-edge text-sm">
            {risk.map((r) => (
              <li key={r.partId} className="flex items-center justify-between px-3 py-2">
                <span className="truncate pr-2 font-mono text-xs">{r.partId}</span>
                <span
                  className={
                    r.score >= 70 ? "text-crit" : r.score >= 45 ? "text-warn" : "text-white/40"
                  }
                >
                  {r.score}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-white/30">
            Scored from graph structure and supplier history, not from any announcement.
          </p>
        </section>
      </aside>

      <div className="space-y-6">
        <header className="rounded-lg border border-edge px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-mono text-sm">{pcn.id}</h2>
              <p className="mt-1 text-xs text-white/40">
                {supplier?.name} &middot; received {pcn.receivedAt} &middot;{" "}
                {pcn.type === "eol" ? "end of life" : "product change"} &middot; original
                language {pcn.language.toUpperCase()}
              </p>
            </div>
            <span className="shrink-0 rounded border border-edge px-2 py-1 text-xs text-white/50">
              last buy {pcn.lastBuyDate}
            </span>
          </div>
          <pre className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap border-t border-edge pt-3 text-xs leading-relaxed text-white/45">
            {pcn.rawText}
          </pre>
        </header>

        {reports.map((r) => (
          <ImpactPanel key={r.partId} report={r} />
        ))}
      </div>
    </div>
  );
}
