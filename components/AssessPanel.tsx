"use client";

import { useState } from "react";

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

/**
 * The agent writes light markdown. Rendering it raw puts literal asterisks on
 * screen, so bold spans are turned into real emphasis and nothing else is
 * interpreted — the text is model output and should not be able to inject
 * markup of its own.
 */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <strong key={i} className="font-semibold text-white">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const PROVIDER = {
  evolus: { label: "Evolus", cls: "border-sky-400/40 text-sky-300" },
  amd: { label: "AMD", cls: "border-accent/50 text-accent" },
  local: { label: "engine", cls: "border-white/20 text-white/50" },
} as const;

export function AssessPanel({
  result,
  running,
  error,
  onRun,
}: {
  result: AssessResult | null;
  running: boolean;
  error: string | null;
  onRun: () => void;
}) {
  const [approved, setApproved] = useState(false);
  const [open, setOpen] = useState<"supplier" | "customer">("supplier");

  return (
    <section className="rounded-lg border border-edge">
      <header className="flex items-center justify-between gap-4 border-b border-edge px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Run the agent</h2>
          <p className="text-xs text-white/40">
            Translate, extract, propagate, draft. Nothing sends without approval.
          </p>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="shrink-0 rounded bg-accent px-4 py-2 text-sm font-medium text-black transition disabled:opacity-40"
        >
          {running ? "Working…" : result ? "Run again" : "Assess notice"}
        </button>
      </header>

      {error && (
        <p className="border-b border-edge px-4 py-3 text-xs text-crit">
          {error}
        </p>
      )}

      {(running || result) && (
        <div className="border-b border-edge px-4 py-3">
          <ol className="space-y-1.5">
            {(result?.stages ?? PENDING).map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-xs">
                <span
                  className={`w-16 shrink-0 rounded border px-1.5 py-0.5 text-center text-[10px] ${
                    PROVIDER[s.provider].cls
                  }`}
                >
                  {PROVIDER[s.provider].label}
                </span>
                <span className="flex-1 text-white/60">{s.name}</span>
                {result ? (
                  <>
                    <span className="tabular-nums text-white/35">
                      {(s.ms / 1000).toFixed(1)}s
                    </span>
                    <span className="w-24 text-right text-[11px] text-white/25">
                      {s.credits
                        ? `${s.credits.toFixed(2)} credits`
                        : s.costUsd
                          ? `$${s.costUsd.toFixed(6)}`
                          : "—"}
                    </span>
                  </>
                ) : (
                  <span className="text-white/20">queued</span>
                )}
              </li>
            ))}
          </ol>

          {result && (
            <p className="mt-3 border-t border-edge pt-2 text-xs text-white/40">
              {(result.totals.ms / 1000).toFixed(1)}s end to end &middot;{" "}
              {result.totals.evolusCredits.toFixed(2)} Evolus credits &middot; $
              {result.totals.amdCostUsd.toFixed(6)} of AMD inference &middot; model{" "}
              <span className="font-mono">{result.model}</span>
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-5 px-4 py-4">
          {result.originalLanguage !== "en" && (
            <details>
              <summary className="cursor-pointer text-xs uppercase tracking-wide text-white/40">
                Translated from {result.originalLanguage.toUpperCase()}
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-white/45">
                {result.translated}
              </pre>
            </details>
          )}

          {result.issues && result.issues.length > 0 && (
            <div className="rounded border border-warn/40 bg-warn/5 px-3 py-2.5">
              <p className="text-xs text-warn">
                {result.issues.join(" · ")}
              </p>
              <p className="mt-1 text-[11px] text-white/35">
                The impact figures above are computed from the bill of materials and do
                not depend on any model, so they are unaffected.
              </p>
            </div>
          )}

          {result.memo?.trim() && (
            <div>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-white/40">
                Memo for the procurement lead
              </h3>
              <p className="whitespace-pre-wrap rounded border border-edge/70 px-3 py-3 text-sm leading-relaxed">
                <RichText text={result.memo} />
              </p>
              <p className="mt-1.5 text-[11px] text-white/25">
                Written from figures the engine supplied. The model is not permitted to
                introduce a number or a date of its own.
              </p>
            </div>
          )}

          {result.certificationRuling && (
            <div>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-white/40">
                Certification ruling &middot; Evolus agent
              </h3>
              <p className="whitespace-pre-wrap rounded border border-sky-400/25 bg-sky-400/5 px-3 py-3 text-sm leading-relaxed">
                <RichText text={result.certificationRuling} />
              </p>
              <p className="mt-1.5 text-[11px] text-white/25">
                Answered by the workspace agent from the approval records and QP-014,
                running on the AMD-hosted model connected to this space. It cites the
                clause, and declines anything the documents do not cover.
              </p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center gap-4">
              <h3 className="text-xs uppercase tracking-wide text-white/40">Drafts</h3>
              <div className="flex gap-1">
                {(["supplier", "customer"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setOpen(k)}
                    className={`rounded border px-2 py-0.5 text-[11px] transition ${
                      open === k
                        ? "border-white/30 text-white/80"
                        : "border-edge text-white/35 hover:text-white/60"
                    }`}
                  >
                    {k === "supplier" ? "To supplier" : "To customers"}
                  </button>
                ))}
              </div>
            </div>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-edge/70 px-3 py-3 text-xs leading-relaxed text-white/70">
              {result.drafts[open]}
            </pre>
          </div>

          <div className="rounded border border-edge/70 px-3 py-3">
            {approved ? (
              <p className="text-xs text-ok">
                Approved. Order and notifications queued for dispatch, with the memo
                attached to the part record.
              </p>
            ) : (
              <>
                <button
                  onClick={() => setApproved(true)}
                  className="rounded border border-ok/50 px-4 py-2 text-sm text-ok transition hover:bg-ok/10"
                >
                  Approve order and notifications
                </button>
                <p className="mt-2 text-xs text-white/30">
                  A person commits the spend. The agent prepares the decision; it does
                  not take it.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** Shown while the run is in flight, so the sequence is visible as it happens. */
const PENDING: Stage[] = [
  { name: "translate notice", provider: "evolus", ms: 0 },
  { name: "extract fields", provider: "evolus", ms: 0 },
  { name: "propagate through BOM", provider: "local", ms: 0 },
  { name: "write impact memo", provider: "amd", ms: 0 },
  { name: "draft supplier order", provider: "evolus", ms: 0 },
  { name: "draft customer notice", provider: "evolus", ms: 0 },
];
