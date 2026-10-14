"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/store";
import { PageHead, Tag, Panel, Empty, SectionTitle, Figure, SkeletonRows, eur, num } from "@/components/ui";

/** QP-014 §4. Who may commit what. */
const AUTHORITY = [
  { ceiling: 50_000, who: "Supply chain manager" },
  { ceiling: 500_000, who: "Operations director" },
  { ceiling: Infinity, who: "Board, with written business case" },
];

function approver(costEur: number) {
  return AUTHORITY.find((a) => costEur <= a.ceiling)!.who;
}

export default function ApprovalsPage() {
  const { approvals, hydrated } = useWorkspace();

  const committed = approvals.reduce((s, a) => s + a.costEur, 0);
  const boardLevel = approvals.filter((a) => a.costEur > 500_000).length;

  return (
    <div className="mx-auto max-w-[1320px] px-8 py-12">
      <div className="space-y-7">
      <PageHead
        title="Approvals"
        meta={hydrated ? `${approvals.length} committed` : undefined}
      />

      <Panel>
        <div className="grid grid-cols-3 divide-x divide-line">
          <Figure label="Approved orders" value={hydrated ? approvals.length : "—"} />
          <Figure label="Committed" value={hydrated ? eur(committed) : "—"} />
          <Figure
            label="Board level"
            value={hydrated ? boardLevel : "—"}
            sub="above EUR 500,000"
            tone={boardLevel > 0 ? "warn" : undefined}
          />
        </div>
      </Panel>

      <section>
        <SectionTitle>Committed</SectionTitle>
        {!hydrated ? (
          <SkeletonRows n={2} />
        ) : approvals.length === 0 ? (
          <Empty
            title="Nothing approved yet"
            body="Assess a notice and approve its last-time-buy, and the order will be recorded here with its approver and authority level."
            action={{ href: "/", label: "Go to notices" }}
          />
        ) : (
          <div className="stagger space-y-2">
            {approvals.map((a) => (
              <Panel key={a.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] text-fg">{a.id}</span>
                      <Tag tone="ok">approved</Tag>
                      {a.costEur > 500_000 && <Tag tone="warn">board</Tag>}
                    </div>
                    <p className="mt-1 truncate text-[12px] text-dim">
                      <Link
                        href={`/parts/${encodeURIComponent(a.partId)}`}
                        className="underline-offset-2 transition-colors hover:text-mid hover:underline"
                      >
                        {a.partId}
                      </Link>{" "}
                      &middot; {a.supplier} &middot; from{" "}
                      <Link
                        href={`/notices/${encodeURIComponent(a.pcnId)}`}
                        className="underline-offset-2 transition-colors hover:text-mid hover:underline"
                      >
                        {a.pcnId}
                      </Link>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-dim">Quantity</div>
                    <div className="text-[13px] tabular-nums text-fg">{num(a.qty)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-dim">Value</div>
                    <div className="text-[13px] tabular-nums text-fg">{eur(a.costEur)}</div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-[10px] uppercase tracking-wider text-dim">Order by</div>
                    <div className="text-[13px] tabular-nums text-mid">{a.lastBuyDate}</div>
                  </div>
                </div>

                <p className="mt-2.5 border-t border-line pt-2.5 text-[11.5px] text-dim">
                  Authority: {approver(a.costEur)} &middot; approved by {a.approvedBy} on{" "}
                  {new Date(a.approvedAt).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
    </div>
  );
}
