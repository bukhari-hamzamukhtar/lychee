"use client";

/**
 * Ask — the agent with the whole workspace in front of it.
 *
 * Vigil floats on every other screen answering about what is on that screen.
 * Here the relationship is the other way round: you bring documents to Vigil,
 * as many as you like at once, and ask across all of them and the bill of
 * materials together.
 *
 * Conversations are separate and their memory does not leak between them. What
 * carries across is a deliberate act — forking distils the parent's transcript
 * into claims, hands those to the child, and gives the window back.
 *
 * The context gauge is not decoration. A reader should be able to see what the
 * agent is actually being given, how much room is left, and what happens when
 * it runs out.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "@/lib/store";
import { buildPortfolioFacts } from "@/lib/screen-context";
import { fileToBase64, MAX_UPLOAD_BYTES } from "@/lib/ingest-client";
import type { Turn } from "@/lib/chats";
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
import { Button, Eyebrow, PageHead, SectionTitle, num } from "@/components/ui";
import { RequireAccount } from "@/components/RequireAccount";

const OCR_TYPES = /\.(pdf|png|jpe?g|webp)$/i;
const TEXT_TYPES = /\.(csv|tsv|txt|md|json)$/i;
/** Two at a time: the AMD key is shared and rate-limited per team. */
const CONCURRENCY = 2;

let sourceSeq = 0;
const newId = () => `S${Date.now().toString(36)}${(sourceSeq += 1).toString(36)}`;

/** Turn whatever /api/distil returned into assertions with provenance attached. */
function toAssertions(json: Record<string, unknown>): Assertion[] {
  const raw = Array.isArray(json.assertions) ? (json.assertions as Record<string, string>[]) : [];
  return raw.map((a) =>
    assertion(a.subject, a.claim, (a.standing as Standing) ?? "inferred", {
      kind: a.ref === "engine" ? "engine" : a.ref === "conversation" ? "conversation" : "document",
      ref: a.ref || "conversation",
      by: String(json.model ?? "the model"),
    }),
  );
}

export default function AskPage() {
  const {
    notices,
    bom,
    hydrated,
    sources,
    chats,
    chat,
    openChat,
    startChat,
    forkChat,
    renameChat,
    deleteChat,
    setTurns,
    addSource,
    updateSource,
    removeSource,
    addAssertions,
    clearKnowledge,
  } = useWorkspace();

  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "distil" | "fork">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  // There is always a conversation to be in.
  useEffect(() => {
    if (hydrated && !chat) startChat();
  }, [hydrated, chat, startChat]);

  const turns = chat?.turns ?? [];
  const assertions = useMemo(() => chat?.assertions ?? [], [chat]);

  /* ----------------------------------------------------------- the context */

  const facts = useMemo(
    () => (hydrated ? buildPortfolioFacts({ notices, bomName: bom?.name ?? null }) : ""),
    [hydrated, notices, bom],
  );

  const ready = useMemo(() => sources.filter((s) => s.status === "ready"), [sources]);
  const sourceText = useMemo(
    () => ready.map((s) => `--- ${s.filename} ---\n${s.text}`).join("\n\n"),
    [ready],
  );
  const chosenAssertions = useMemo(() => selectAssertions(assertions, 6000), [assertions]);
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
          updateSource(id, { status: "ready", text: text.slice(0, 40000), ms: 0 });
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
        addSource({
          id,
          filename: file.name,
          mime: file.type || "application/octet-stream",
          bytes: file.size,
          status: "queued",
          text: "",
          addedAt: new Date().toISOString(),
        } satisfies Source);
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

  /* ------------------------------------------------ distilling and forking */

  const distilTurns = useCallback(async (): Promise<Assertion[]> => {
    const res = await fetch("/api/distil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: turns.map((t) => ({ role: t.role, content: t.content })) }),
    });
    return toAssertions(await res.json());
  }, [turns]);

  const compact = useCallback(async () => {
    if (!chat || !turns.length || busy) return;
    setBusy("distil");
    setError(null);
    try {
      const made = await distilTurns();
      addAssertions(made);
      setTurns(chat.id, []);
      setNotice(
        made.length
          ? `${made.length} claim${made.length === 1 ? "" : "s"} kept, transcript discarded.`
          : "Nothing in that conversation was worth keeping; transcript discarded.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "the conversation could not be distilled");
    } finally {
      setBusy(null);
    }
  }, [chat, turns, busy, distilTurns, addAssertions, setTurns]);

  const fork = useCallback(async () => {
    if (!chat || busy) return;
    setBusy("fork");
    setError(null);
    try {
      // Everything this conversation established goes to the child; its
      // transcript does not, which is where the room comes back from.
      const carried = turns.length ? await distilTurns() : [];
      forkChat(chat.id, carried);
      setNotice(
        carried.length
          ? `Forked with ${carried.length} claim${carried.length === 1 ? "" : "s"} carried over.`
          : "Forked.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "the conversation could not be forked");
    } finally {
      setBusy(null);
    }
  }, [chat, turns, busy, distilTurns, forkChat]);

  /* ----------------------------------------------------------------- asking */

  const ask = useCallback(async () => {
    const q = question.trim();
    if (!q || asking || !chat) return;
    setQuestion("");
    setError(null);
    setNotice(null);
    setAsking(true);
    const withQuestion: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(chat.id, withQuestion);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          facts,
          assertions: chosenAssertions.map(renderAssertion),
          sources: ready.map((s) => ({ filename: s.filename, text: s.text })),
          history: turns.slice(-20).map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `the agent failed (${res.status})`);
      setTurns(chat.id, [
        ...withQuestion,
        { role: "assistant", content: String(json.answer), ms: json.ms, costUsd: json.costUsd },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "the agent could not answer");
    } finally {
      setAsking(false);
    }
  }, [question, asking, chat, turns, facts, chosenAssertions, ready, setTurns]);

  /* ------------------------------------------------------------------ view */

  return (
    <div className="mx-auto max-w-[1320px] px-8 pb-28 pt-12">
      <PageHead
        title="Ask"
        meta="Bring documents to Vigil and ask across all of them and your bill of materials at once."
        actions={<Button onClick={startChat}>New conversation</Button>}
      />

      <RequireAccount
        what="Asking Vigil"
        why="Conversations, the documents you add and what they establish are kept against your account, and every answer spends inference on the team's AMD key. Reading the workspace needs no account — none of it calls a model."
      >
      <div className="grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)_340px]">
        {/* ------------------------------------------------- conversation list */}
        <aside className="min-w-0">
          <SectionTitle>Conversations</SectionTitle>
          <ul className="space-y-px">
            {chats.map((c) => {
              const active = c.id === chat?.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => openChat(c.id)}
                    className={`group flex w-full flex-col items-start gap-0.5 border-l px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-accent bg-bg-raised"
                        : "border-line hover:border-line-bright"
                    }`}
                  >
                    <span
                      className={`line-clamp-2 text-[13px] leading-snug ${
                        active ? "text-fg" : "text-mid"
                      }`}
                    >
                      {c.title}
                    </span>
                    <span className="text-[11px] text-dim">
                      {c.assertions.length > 0
                        ? `${c.assertions.length} claim${c.assertions.length === 1 ? "" : "s"}`
                        : c.turns.length > 0
                          ? `${c.turns.length} message${c.turns.length === 1 ? "" : "s"}`
                          : "empty"}
                      {c.forkedFrom ? " · forked" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {chat && (
            <div className="mt-5 space-y-2.5 border-t border-line pt-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-dim">
                This conversation
              </p>
              <button
                onClick={() => {
                  const t = window.prompt("Name this conversation", chat.title);
                  if (t !== null) renameChat(chat.id, t);
                }}
                className="block text-[12.5px] text-dim transition-colors hover:text-fg"
              >
                Rename
              </button>
              <button
                onClick={() => void fork()}
                disabled={busy !== null}
                className="block text-[12.5px] text-dim transition-colors hover:text-fg disabled:opacity-50"
              >
                {busy === "fork" ? "Forking" : "Fork into a new conversation"}
              </button>
              <button
                onClick={() => {
                  // Destructive and not recoverable, so it asks. Distilling is
                  // the non-destructive neighbour and must not be confused with it.
                  const n = chat.assertions.length;
                  const loses = [
                    chat.turns.length ? `${chat.turns.length} message${chat.turns.length === 1 ? "" : "s"}` : "",
                    n ? `${n} established claim${n === 1 ? "" : "s"}` : "",
                  ]
                    .filter(Boolean)
                    .join(" and ");
                  if (!loses) return;
                  if (
                    window.confirm(
                      `Forget "${chat.title}"?

This deletes ${loses}. ` +
                        `Your documents and your other conversations are not touched.

` +
                        `To keep what this conversation established, close this and use ` +
                        `"Distil the transcript" instead.`,
                    )
                  ) {
                    clearKnowledge();
                  }
                }}
                className="block text-[12.5px] text-crit transition-opacity hover:opacity-70"
              >
                Forget this conversation
              </button>
              {chats.length > 1 && (
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${chat.title}" entirely?`)) deleteChat(chat.id);
                  }}
                  className="block text-[12.5px] text-crit transition-opacity hover:opacity-70"
                >
                  Delete it
                </button>
              )}
            </div>
          )}
        </aside>

        {/* ----------------------------------------------------- conversation */}
        <div className="min-w-0">
          {chat?.forkedFrom && (
            <p className="mb-4 border-l border-line pl-3.5 text-[12.5px] text-dim">
              Forked from <span className="text-mid">{chat.forkedFrom.title}</span>, carrying what
              it had established.
            </p>
          )}

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

          {notice && <p className="mt-3 text-[12.5px] text-dim">{notice}</p>}
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
          <p className="mt-2 text-[11.5px] text-dim">Enter to send, Shift+Enter for a new line.</p>
        </div>

        {/* ---------------------------------------------------------- sidebar */}
        <div className="space-y-10">
          <section>
            <SectionTitle
              aside={<span className="text-[12px] text-dim">{num(sources.length)}</span>}
            >
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
                PDF, images, CSV or text. Shared by every conversation, because they are
                your files rather than something one chat found out.
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
                            {s.pageCount
                              ? ` · ${s.pageCount} page${s.pageCount === 1 ? "" : "s"}`
                              : ""}
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
            busy={busy}
            canCompact={turns.length > 0}
          />

          <section>
            <SectionTitle
              aside={<span className="text-[12px] text-dim">{num(assertions.length)}</span>}
            >
              What this conversation knows
            </SectionTitle>
            {assertions.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-dim">
                Nothing yet. When this conversation fills the window it is distilled into
                claims, each one carrying where it came from, and the transcript is thrown
                away. The claims are what it keeps — and what a fork takes with it.
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
      </RequireAccount>
    </div>
  );
}

/**
 * What the agent is being given, and how much room is left.
 *
 * Split by where it came from rather than shown as one bar, because the parts
 * behave differently: documents and established claims survive a compaction and
 * the transcript does not, and that is the thing worth understanding before you
 * press either button.
 */
function ContextGauge({
  use,
  onCompact,
  busy,
  canCompact,
}: {
  use: ReturnType<typeof measureContext>;
  onCompact: () => void;
  busy: null | "distil" | "fork";
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

      <div className={`mt-4 ${use.shouldCompact ? "border border-warn/50 px-4 py-3" : ""}`}>
        {use.shouldCompact && (
          <p className="mb-3 text-[12.5px] leading-relaxed text-warn">
            The window is nearly full. Distil to keep what this conversation established
            and discard the rest.
          </p>
        )}
        <Button
          tone={use.shouldCompact ? "accent" : "quiet"}
          onClick={onCompact}
          disabled={busy !== null || !canCompact}
        >
          {busy === "distil" ? "Distilling" : "Distil the transcript"}
        </Button>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
        Grey survives. <span className="text-accent">Orange</span> is the transcript,
        which does not. Distilling turns the messages into claims and then deletes the
        messages — what was established is kept.
      </p>
    </section>
  );
}
