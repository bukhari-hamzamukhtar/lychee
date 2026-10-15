"use client";

/**
 * Ask — the agent with the whole workspace in front of it.
 *
 * Vigil floats on every other screen answering about what is on that screen.
 * Here the relationship is the other way round: you bring documents to Vigil,
 * as many as you like at once, and ask across all of them and the bill of
 * materials together.
 *
 * The context gauge is not decoration. A reader should be able to see what the
 * agent is actually being given, how much room is left, and what happens when
 * it runs out — which is that the transcript is distilled into assertions and
 * then discarded, so what survives is the claims and their provenance rather
 * than a paragraph of summary nobody can check.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "@/lib/store";
import { buildPortfolioFacts } from "@/lib/screen-context";
import { fileToBase64, MAX_UPLOAD_BYTES } from "@/lib/ingest-client";
import {
  assertion,
  measureContext,
  renderAssertion,
  selectAssertions,
  STANDING_LABEL,
  estimateTokens,
  type Assertion,
  type Source,
  type Standing,
} from "@/lib/context-graph";
import { Button, Eyebrow, PageHead, SectionTitle, Tag, num } from "@/components/ui";

interface Turn {
  role: "user" | "assistant";
  content: string;
  ms?: number;
  costUsd?: number;
}

const OCR_TYPES = /\.(pdf|png|jpe?g|webp)$/i;
const TEXT_TYPES = /\.(csv|tsv|txt|md|json)$/i;
/** Two at a time: the AMD key is shared and rate-limited per team. */
const CONCURRENCY = 2;

let sourceSeq = 0;
const newId = () => `S${Date.now().toString(36)}${(sourceSeq += 1).toString(36)}`;

export default function AskPage() {
  const {
    notices,
    bom,
    hydrated,
    sources,
    assertions,
    addSource,
    updateSource,
    removeSource,
    addAssertions,
    clearKnowledge,
  } = useWorkspace();

  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compacting, setCompacting] = useState(false);
  const [lastCompaction, setLastCompaction] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  /* ----------------------------------------------------------- the context */

  const facts = useMemo(
    () => (hydrated ? buildPortfolioFacts({ notices, bomName: bom?.name ?? null }) : ""),
    [hydrated, notices, bom],
  );

  const ready = sources.filter((s) => s.status === "ready");

  const sourceText = useMemo(
    () => ready.map((s) => `--- ${s.filename} ---\n${s.text}`).join("\n\n"),
    [ready],
  );

  const chosenAssertions = useMemo(() => selectAssertions(assertions, 1800), [assertions]);
  const assertionText = useMemo(
    () => chosenAssertions.map(renderAssertion).join("\n"),
    [chosenAssertions],
  );
  const historyText = useMemo(() => turns.map((t) => t.content).join("\n"), [turns]);

  const use = useMemo(
    () =>
      measureContext({
        // The brief is a fixed cost the server adds; counted so the gauge is honest.
        brief: "x".repeat(4600),
        facts,
        sources: sourceText,
        assertions: assertionText,
        history: historyText,
      }),
    [facts, sourceText, assertionText, historyText],
  );

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, asking]);

  /* ------------------------------------------------------------- documents */

  const readOne = useCallback(
    async (file: File, id: string) => {
      updateSource(id, { status: "reading" });

      if (TEXT_TYPES.test(file.name)) {
        // A spreadsheet or a text file needs no OCR; the browser can read it.
        try {
          const text = await file.text();
          updateSource(id, { status: "ready", text: text.slice(0, 20000), ms: 0 });
        } catch {
          updateSource(id, { status: "error", error: "that file could not be read as text" });
        }
        return;
      }

      try {
        const data = await fileToBase64(file);
        const res = await fetch("/api/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, mime: file.type || "application/pdf", data }),
        });
        if (!res.ok || !res.body) {
          let message = `could not be read (${res.status})`;
          try {
            const b = await res.json();
            if (b?.error) message = String(b.error);
          } catch {
            /* status is explanation enough */
          }
          updateSource(id, { status: "error", error: message });
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const handle = (line: string) => {
          if (!line.trim()) return;
          let e: Record<string, unknown>;
          try {
            e = JSON.parse(line);
          } catch {
            return;
          }
          if (e.t === "done") {
            updateSource(id, {
              status: "ready",
              text: String(e.text ?? ""),
              pageCount: Number(e.pageCount ?? 0),
              ms: Number(e.ms ?? 0),
            });
          } else if (e.t === "error") {
            updateSource(id, { status: "error", error: String(e.error ?? "could not be read") });
          }
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            handle(buffer.slice(0, nl));
            buffer = buffer.slice(nl + 1);
          }
        }
        handle(buffer);
      } catch (e) {
        updateSource(id, {
          status: "error",
          error: e instanceof Error ? e.message : "could not be read",
        });
      }
    },
    [updateSource],
  );

  const take = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);

      const queued: { file: File; id: string }[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(`${file.name} is larger than 8 MB and was skipped.`);
          continue;
        }
        if (!OCR_TYPES.test(file.name) && !TEXT_TYPES.test(file.name)) {
          setError(`${file.name} is not a kind of file this can read, and was skipped.`);
          continue;
        }
        const id = newId();
        const source: Source = {
          id,
          filename: file.name,
          mime: file.type || "application/octet-stream",
          bytes: file.size,
          status: "queued",
          text: "",
          addedAt: new Date().toISOString(),
        };
        addSource(source);
        queued.push({ file, id });
      }

      // A small pool rather than all at once: the AMD key is shared per team
      // and twenty requests a minute is not many when each one is a scan.
      let cursor = 0;
      const worker = async () => {
        for (;;) {
          const next = queued[cursor++];
          if (!next) return;
          await readOne(next.file, next.id);
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    },
    [addSource, readOne],
  );

  /* ------------------------------------------------------------ compaction */

  const compact = useCallback(async () => {
    if (!turns.length || compacting) return;
    setCompacting(true);
    setError(null);
    try {
      const res = await fetch("/api/distil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: turns.map((t) => ({ role: t.role, content: t.content })) }),
      });
      const json = await res.json();
      const raw = Array.isArray(json.assertions) ? json.assertions : [];
      const made: Assertion[] = raw.map((a: Record<string, string>) =>
        assertion(a.subject, a.claim, (a.standing as Standing) ?? "inferred", {
          kind: a.ref === "engine" ? "engine" : a.ref === "conversation" ? "conversation" : "document",
          ref: a.ref || "conversation",
          by: String(json.model ?? "the model"),
        }),
      );
      addAssertions(made);
      setTurns([]);
      setLastCompaction(
        made.length
          ? `${made.length} claim${made.length === 1 ? "" : "s"} kept, transcript discarded.`
          : "Nothing in that conversation was worth keeping; transcript discarded.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "the conversation could not be distilled");
    } finally {
      setCompacting(false);
    }
  }, [turns, compacting, addAssertions]);

  /* ----------------------------------------------------------------- asking */

  const ask = useCallback(async () => {
    const q = question.trim();
    if (!q || asking) return;
    setQuestion("");
    setError(null);
    setAsking(true);
    const asked: Turn = { role: "user", content: q };
    setTurns((t) => [...t, asked]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          facts,
          assertions: chosenAssertions.map(renderAssertion),
          sources: ready.map((s) => ({ filename: s.filename, text: s.text })),
          history: turns.slice(-8).map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `the agent failed (${res.status})`);
      setTurns((t) => [
        ...t,
        { role: "assistant", content: String(json.answer), ms: json.ms, costUsd: json.costUsd },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "the agent could not answer");
    } finally {
      setAsking(false);
    }
  }, [question, asking, facts, chosenAssertions, ready, turns]);

  /* ------------------------------------------------------------------ view */

  return (
    <div className="mx-auto max-w-[1320px] px-8 pb-28 pt-12">
      <PageHead
        title="Ask"
        meta="Bring documents to Vigil and ask across all of them and your bill of materials at once."
        actions={
          assertions.length > 0 || sources.length > 0 ? (
            <Button tone="quiet" onClick={clearKnowledge}>
              Forget everything
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ----------------------------------------------------- conversation */}
        <div className="min-w-0">
          <div
            ref={scroller}
            className="max-h-[52vh] min-h-[220px] overflow-y-auto border border-line px-6 py-5"
          >
            {turns.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[15px] text-mid">
                  {ready.length
                    ? `${ready.length} document${ready.length === 1 ? "" : "s"} loaded. Ask something.`
                    : "Drop some documents in, then ask."}
                </p>
                <ul className="mx-auto mt-5 max-w-[46ch] space-y-1.5 text-left text-[13.5px] text-dim">
                  <li>&middot; Which of my products is most exposed, and why?</li>
                  <li>&middot; Does anything in these notices affect a certified assembly?</li>
                  <li>&middot; What does this datasheet say about the replacement part?</li>
                </ul>
              </div>
            ) : (
              <ol className="space-y-6">
                {turns.map((t, i) => (
                  <li key={i}>
                    <Eyebrow>{t.role === "user" ? "You" : "Vigil"}</Eyebrow>
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-fg">
                      {t.content}
                    </p>
                    {t.ms !== undefined && (
                      <p className="mt-1.5 text-[11.5px] text-dim">
                        {(t.ms / 1000).toFixed(1)}s
                        {t.costUsd ? ` · $${t.costUsd.toFixed(6)}` : ""}
                      </p>
                    )}
                  </li>
                ))}
                {asking && (
                  <li>
                    <Eyebrow>Vigil</Eyebrow>
                    <p className="mt-2 flex items-center gap-2.5 text-[15px] text-dim">
                      <span className="h-3 w-3 animate-spin rounded-full border border-line border-t-accent" />
                      thinking
                    </p>
                  </li>
                )}
              </ol>
            )}
          </div>

          {lastCompaction && (
            <p className="mt-3 text-[12.5px] text-dim">{lastCompaction}</p>
          )}
          {error && (
            <p className="mt-3 border border-crit/50 px-4 py-3 text-[13px] text-crit">{error}</p>
          )}

          <div className="mt-5 flex items-end gap-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask();
                }
              }}
              rows={2}
              placeholder="Ask about your parts, your products, or anything you have dropped in"
              className="min-h-[52px] flex-1 resize-y border border-line bg-transparent px-4 py-3 text-[14.5px] leading-relaxed outline-none transition-colors placeholder:text-dim focus:border-line-bright"
            />
            <Button tone="accent" onClick={() => void ask()} disabled={asking || !question.trim()}>
              {asking ? "Asking" : "Ask"}
            </Button>
          </div>
          <p className="mt-2 text-[11.5px] text-dim">
            Enter to send, Shift+Enter for a new line.
          </p>
        </div>

        {/* ---------------------------------------------------------- sidebar */}
        <div className="space-y-10">
          <section>
            <SectionTitle aside={<span className="text-[12px] text-dim">{num(sources.length)}</span>}>
              Documents
            </SectionTitle>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                void take(e.dataTransfer.files);
              }}
              className={`border border-dashed border-line px-5 py-6 text-center transition-colors ${
                over ? "bg-bg-raised" : ""
              }`}
            >
              <input
                ref={input}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.tsv,.txt,.md,.json"
                className="hidden"
                onChange={(e) => {
                  void take(e.target.files);
                  e.target.value = "";
                }}
              />
              <p className="text-[13.5px] text-mid">Drop as many as you like</p>
              <div className="mt-3">
                <Button onClick={() => input.current?.click()}>Choose files</Button>
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-dim">
                PDF, images, CSV or text. Scans go through MinerU on AMD; spreadsheets
                are read here without a round trip.
              </p>
            </div>

            {sources.length > 0 && (
              <ul className="mt-4 divide-y divide-line border border-line">
                {sources.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[12.5px] text-fg">
                        {s.filename}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-dim">
                        {s.status === "ready" ? (
                          <>
                            {num(estimateTokens(s.text))} tokens
                            {s.pageCount ? ` · ${s.pageCount} page${s.pageCount === 1 ? "" : "s"}` : ""}
                            {s.ms ? ` · ${(s.ms / 1000).toFixed(1)}s` : ""}
                          </>
                        ) : s.status === "error" ? (
                          <span className="text-crit">{s.error}</span>
                        ) : s.status === "reading" ? (
                          "reading"
                        ) : (
                          "queued"
                        )}
                      </span>
                    </span>
                    {s.status === "reading" && (
                      <span className="mt-1 h-3 w-3 shrink-0 animate-spin rounded-full border border-line border-t-accent" />
                    )}
                    <button
                      onClick={() => removeSource(s.id)}
                      className="shrink-0 text-[11.5px] text-dim transition-colors hover:text-crit"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ContextGauge
            use={use}
            onCompact={() => void compact()}
            compacting={compacting}
            canCompact={turns.length > 0}
          />

          <section>
            <SectionTitle
              aside={<span className="text-[12px] text-dim">{num(assertions.length)}</span>}
            >
              What has been established
            </SectionTitle>
            {assertions.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-dim">
                Nothing yet. When this conversation fills the window it is distilled into
                claims, each one carrying where it came from, and the transcript is thrown
                away. The claims are what the agent keeps.
              </p>
            ) : (
              <ul className="space-y-3">
                {assertions.slice(0, 14).map((a) => (
                  <li key={a.id} className="border-l border-line pl-3.5">
                    <p className="text-[13px] leading-relaxed text-fg">
                      <span className="font-mono text-mid">{a.subject}</span> — {a.claim}
                    </p>
                    <p className="mt-1 text-[11.5px] text-dim">
                      {STANDING_LABEL[a.standing]} &middot; {a.provenance.ref}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * What the agent is being given, and how much room is left.
 *
 * Split by where it came from rather than shown as one bar, because the parts
 * behave differently: documents and established claims survive a compaction and
 * the transcript does not, and that is the thing worth understanding before you
 * press the button.
 */
function ContextGauge({
  use,
  onCompact,
  compacting,
  canCompact,
}: {
  use: ReturnType<typeof measureContext>;
  onCompact: () => void;
  compacting: boolean;
  canCompact: boolean;
}) {
  const pct = Math.min(100, Math.round(use.ratio * 100));
  return (
    <section>
      <SectionTitle aside={<span className="tabular-nums text-[12px] text-dim">{pct}%</span>}>
        Context window
      </SectionTitle>

      <div className="flex h-2 w-full overflow-hidden border border-line">
        {use.slices.map((s) => (
          <span
            key={s.label}
            title={`${s.label}: ~${s.tokens} tokens`}
            style={{ width: `${Math.min(100, (s.tokens / use.budget) * 100)}%` }}
            className={s.durable ? "bg-mid" : "bg-accent"}
          />
        ))}
      </div>

      <dl className="mt-3.5 space-y-1.5">
        {use.slices.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-4 text-[12.5px]">
            <dt className="flex items-center gap-2 text-dim">
              <span className={`h-1.5 w-1.5 shrink-0 ${s.durable ? "bg-mid" : "bg-accent"}`} />
              {s.label}
            </dt>
            <dd className="tabular-nums text-mid">{num(s.tokens)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2 text-[12.5px]">
          <dt className="text-dim">of about</dt>
          <dd className="tabular-nums text-fg">
            {num(use.used)} / {num(use.budget)}
          </dd>
        </div>
      </dl>

      {use.shouldCompact ? (
        <div className="mt-4 border border-warn/50 px-4 py-3">
          <p className="text-[12.5px] leading-relaxed text-warn">
            The window is nearly full. Distil the conversation to keep what it established
            and discard the rest.
          </p>
          <div className="mt-3">
            <Button tone="accent" onClick={onCompact} disabled={compacting || !canCompact}>
              {compacting ? "Distilling" : "Distil and clear"}
            </Button>
          </div>
        </div>
      ) : (
        canCompact && (
          <div className="mt-4">
            <Button tone="quiet" onClick={onCompact} disabled={compacting}>
              {compacting ? "Distilling" : "Distil now"}
            </Button>
            <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
              Turns this conversation into claims with sources, then clears it.
            </p>
          </div>
        )
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
        Grey survives a distillation. <span className="text-accent">Orange</span> is the
        transcript, which does not.
      </p>
    </section>
  );
}
