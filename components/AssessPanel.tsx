"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/store";
import type { ImpactReport } from "@/lib/types";
import { Badge, Button, Card, SectionTitle, eur, num } from "./ui";

export interface Stage {
  order?: number;
  name: string;
  provider: "evolus" | "amd" | "local";
  ms: number;
  credits?: number;
  costUsd?: number;
}

export interface AssessResult {
  pcnId: string;
  originalLanguage: string;
  translated: string;
  memo: string;
  certificationRuling?: string | null;
  agentModel?: string | null;
  drafts: { supplier: string; customer: string };
  stages: Stage[];
  totals: { ms: number; evolusCredits: number; amdCostUsd: number };
  model: string;
  issues?: string[];
}

const PROVIDER = {
  evolus: { label: "Evolus", cls: "border-primary/40 text-primary-soft" },
  amd: { label: "AMD", cls: "border-warn/40 text-warn" },
  local: { label: "engine", cls: "border-edge text-faint" },
} as const;

/**
 * The models write light markdown. Only bold is interpreted — the text is model
 * output and should not be able to introduce markup of its own.
 */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <strong key={i} className="font-semibold text-body">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const PENDING: Stage[] = [
  { name: "translate notice", provider: "evolus", ms: 0 },
  { name: "extract fields", provider: "evolus", ms: 0 },
  { name: "propagate through BOM", provider: "local", ms: 0 },
  { name: "write impact memo", provider: "amd", ms: 0 },
  { name: "draft supplier order", provider: "evolus", ms: 0 },
  { name: "draft customer notice", provider: "evolus", ms: 0 },
  { name: "rule on certification impact", provider: "evolus", ms: 0 },
];

export function AssessPanel({
  pcnId,
  report,
  supplierName,
  result,
  running,
  error,
  onRun,
}: {
  pcnId: string;
  report: ImpactReport | null;
  supplierName: string;
  result: AssessResult | null;
  running: boolean;
  error: string | null;
  onRun: () => void;
}) {
  const { approve, isApproved } = useWorkspace();
  const [tab, setTab] = useState<"supplier" | "customer">("supplier");
  const approved = report ? isApproved(pcnId, report.partId) : false;

  return (
    <Card className="overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-5 py-4">
        <div>
          <h2 className="text-[14px] font-medium">Run the agent</h2>
          <p className="mt-0.5 text-[12px] text-faint">
            Translate, extract, propagate, rule, draft. Nothing sends without approval.
          </p>
        </div>
        <Button onClick={onRun} disabled={running}>
          {running ? "Working…" : result ? "Run again" : "Assess notice"}
        </Button>
      </header>

      {error && (
        <p className="animate-fade-in border-b border-hair bg-crit/5 px-5 py-3 text-[12px] text-crit">
          {error}
        </p>
      )}

      {(running || result) && (
        <div className="border-b border-hair px-5 py-4">
          <ol className="space-y-1.5">
            {(result?.stages ?? PENDING).map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-[12px]">
                <span
                  className={`w-16 shrink-0 rounded border px-1.5 py-0.5 text-center text-[10px] font-medium uppercase ${PROVIDER[s.provider].cls}`}
                >
                  {PROVIDER[s.provider].label}
                </span>
                <span className="flex-1 text-muted">{s.name}</span>
                {result ? (
                  <>
                    <span className="tabular-nums text-faint">{(s.ms / 1000).toFixed(1)}s</span>
                    <span className="w-24 text-right text-[11px] text-faint/70">
                      {s.credits
                        ? `${s.credits.toFixed(2)} credits`
                        : s.costUsd
                          ? `$${s.costUsd.toFixed(6)}`
                          : "—"}
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 text-faint">
                    <span className="h-1 w-1 animate-pulse-ring rounded-full bg-primary" />
                    queued
                  </span>
                )}
              </li>
            ))}
          </ol>

          {result && (
            <p className="mt-3 border-t border-hair pt-2.5 text-[11.5px] text-faint">
              {(result.totals.ms / 1000).toFixed(1)}s end to end &middot;{" "}
              {result.totals.evolusCredits.toFixed(2)} Evolus credits &middot; $
              {result.totals.amdCostUsd.toFixed(6)} of AMD inference &middot;{" "}
              <span className="font-mono">{result.model}</span>
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-6 px-5 py-5">
          {result.issues && result.issues.length > 0 && (
            <div className="rounded-lg border border-warn/40 bg-warn/5 px-3.5 py-3">
              <p className="text-[12px] text-warn">{result.issues.join(" · ")}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                The impact figures are computed from the bill of materials and depend on no
                model, so they are unaffected.
              </p>
            </div>
          )}

          {result.originalLanguage !== "en" && (
            <details className="group">
              <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wider text-faint transition-colors hover:text-muted">
                Translated from {result.originalLanguage.toUpperCase()}
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-hair bg-panel/40 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
                {result.translated}
              </pre>
            </details>
          )}

          {result.memo?.trim() && (
            <div>
              <SectionTitle>Memo for the procurement lead</SectionTitle>
              <p className="whitespace-pre-wrap rounded-lg border border-hair bg-panel/40 px-3.5 py-3.5 text-[13px] leading-relaxed">
                <RichText text={result.memo} />
              </p>
              <p className="mt-1.5 text-[11px] text-faint">
                Written from figures the engine supplied. The model may not introduce a number
                or a date of its own.
              </p>
            </div>
          )}

          {result.certificationRuling && (
            <div>
              <SectionTitle aside={<Badge tone="info">Evolus agent on AMD</Badge>}>
                Certification ruling
              </SectionTitle>
              <p className="whitespace-pre-wrap rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-3.5 text-[13px] leading-relaxed">
                <RichText text={result.certificationRuling} />
              </p>
              <p className="mt-1.5 text-[11px] text-faint">
                Answered from the approval records and QP-014, citing the clause. It declines
                anything the documents do not cover.
              </p>
            </div>
          )}

          <div>
            <SectionTitle
              aside={
                <div className="flex gap-1">
                  {(["supplier", "customer"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setTab(k)}
                      className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                        tab === k
                          ? "border-edge bg-panel text-body"
                          : "border-transparent text-faint hover:text-muted"
                      }`}
                    >
                      {k === "supplier" ? "To supplier" : "To customers"}
                    </button>
                  ))}
                </div>
              }
            >
              Drafts
            </SectionTitle>
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-hair bg-panel/40 px-3.5 py-3.5 text-[12px] leading-relaxed text-muted">
              {result.drafts[tab]}
            </pre>
          </div>

          <div className="rounded-lg border border-hair bg-panel/40 px-3.5 py-3.5">
            {approved ? (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                <p className="text-[13px] text-ok">
                  Approved. Queued for dispatch and recorded against the part.
                </p>
              </div>
            ) : report ? (
              <>
                <Button
                  variant="ok"
                  onClick={() =>
                    approve({
                      pcnId,
                      partId: report.partId,
                      qty: report.lastBuyQty,
                      costEur: report.lastBuyCostEur,
                      supplier: supplierName,
                      lastBuyDate: report.lastBuyDate,
                      approvedBy: "Procurement lead",
                    })
                  }
                >
                  Approve {num(report.lastBuyQty)} pcs &middot; {eur(report.lastBuyCostEur)}
                </Button>
                <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                  QP-014 §4 puts a commitment of this size with the board. A person commits the
                  spend; the agent prepares the decision, it does not take it.
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}
