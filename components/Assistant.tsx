"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccountGate } from "./RequireAccount";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { buildScreenContext } from "@/lib/screen-context";
import { VigilAvatar } from "./VigilAvatar";

/**
 * Vigil follows the reader from screen to screen.
 *
 * Every turn carries a fresh snapshot of whatever is on the current page, so
 * "what am I looking at" and "why is this one critical" are answerable without
 * the person having to describe anything. The character keeps its own cold
 * palette, distinct from the product's red, so it reads as something alongside
 * the app rather than part of its chrome.
 */

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const OPENERS: Record<string, string[]> = {
  "/": ["What does this actually do?", "Who is it for?"],
  "/notices": ["What am I looking at?", "Which of these is most urgent?", "How do I add one?"],
  "/parts": ["How is the risk score worked out?", "Which part should worry me most?"],
  "/products": ["Why does a product carry a part's risk?"],
  "/suppliers": ["What does the discontinuation rate mean?"],
  "/certifications": ["Why would a swap re-open an approval?"],
  "/approvals": ["Who is allowed to approve what?"],
};

function openersFor(pathname: string): string[] {
  if (pathname.startsWith("/notices/")) {
    return ["Explain this notice to me", "Why is this critical?", "What should I do about it?"];
  }
  if (pathname.startsWith("/parts/")) {
    return ["Why is this part risky?", "What breaks if it goes?"];
  }
  return OPENERS[pathname] ?? ["What am I looking at?"];
}

export function Assistant() {
  const pathname = usePathname();
  const { notices, uploaded, approvals } = useWorkspace();

  const { allowed } = useAccountGate();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs, busy]);

  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  // Escape closes, as it does in every panel people have used before.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function send(text: string) {
    // The composer is already inert without an account; this is the same
    // rule stated where it cannot be styled around.
    if (!allowed) return;
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setError(null);
    const next = [...msgs, { role: "user" as const, content: question }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: buildScreenContext({ pathname, notices, uploaded, approvals }),
          history: msgs.slice(-8),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `failed (${res.status})`);
      setMsgs([...next, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vigil could not answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* summon */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Vigil" : "Ask Vigil"}
        className={`fixed bottom-5 left-5 z-50 flex items-center gap-2.5 border px-3 py-2.5 transition-colors duration-200 ${
          open
            ? "border-[#38BDF8]/50 bg-bg text-fg"
            : "border-line bg-bg text-fg hover:border-[#38BDF8]/50"
        }`}
      >
        <VigilAvatar size={26} thinking={busy} />
        <span className="hidden text-[13px] sm:inline">Ask Vigil</span>
      </button>

      {/* panel */}
      <div
        className={`fixed bottom-20 left-5 z-50 flex w-[min(24rem,calc(100vw-2.5rem))] flex-col border border-[#38BDF8]/25 bg-bg transition-all duration-300 ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
        style={{ maxHeight: "min(32rem, calc(100vh - 8rem))" }}
        aria-hidden={!open}
      >
        <header className="flex items-center gap-3 border-b border-[#38BDF8]/20 px-4 py-3">
          <VigilAvatar size={32} thinking={busy} />
          <div className="min-w-0">
            <p className="text-[14px] text-fg">Vigil</p>
            <p className="truncate text-[11.5px] text-dim">
              {busy ? "thinking…" : "keeper of the last light"}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="ml-auto text-dim transition-colors hover:text-fg"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* Vigil is visible to everyone because it is part of the product.
              Answering costs inference on a key shared by the whole team, so
              that part waits for someone to be signed in. */}
          {!allowed && (
            <div className="space-y-3.5">
              <p className="text-[13.5px] leading-relaxed text-mid">
                I watch the deadlines here, and I can see whichever screen you are on.
                Before I answer, I need to know who I am answering.
              </p>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="inline-block border border-[#38BDF8]/50 px-4 py-2 text-[13px] text-fg transition-opacity hover:opacity-70"
              >
                Sign in to ask
              </Link>
              <p className="text-[11.5px] leading-relaxed text-dim">
                Everything you can read stays open without one — the parts, the products,
                every figure the engine computes. None of it calls a model.
              </p>
            </div>
          )}

          {allowed && msgs.length === 0 && (
            <div className="space-y-4">
              <p className="text-[13.5px] leading-relaxed text-mid">
                I can see this screen and I know how the system works underneath it. Ask
                me what something means, or what to do next.
              </p>
              <div className="flex flex-wrap gap-2">
                {openersFor(pathname).map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="border border-line px-2.5 py-1.5 text-left text-[12px] text-mid transition-colors hover:border-[#38BDF8]/50 hover:text-fg"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) =>
            m.role === "user" ? (
              <p key={i} className="ml-6 border-l-2 border-[#38BDF8]/40 pl-3 text-[13.5px] leading-relaxed text-fg">
                {m.content}
              </p>
            ) : (
              <div key={i} className="flex gap-2.5">
                <VigilAvatar size={20} className="mt-0.5 shrink-0 text-dim" />
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-mid">
                  {m.content}
                </p>
              </div>
            ),
          )}

          {busy && (
            <div className="flex items-center gap-2.5 text-[13px] text-dim">
              <VigilAvatar size={20} thinking className="shrink-0" />
              <span className="animate-pulse-soft">holding the light up&hellip;</span>
            </div>
          )}

          {error && <p className="text-[12.5px] text-crit">{error}</p>}
        </div>

        <div className="border-t border-[#38BDF8]/20 p-3">
          <div className={`flex items-end gap-2 ${allowed ? "" : "pointer-events-none opacity-40"}`}>
            <textarea
              ref={field}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={allowed ? "Ask about this screen…" : "Sign in to ask"}
              className="max-h-28 flex-1 resize-none bg-transparent px-1 py-1.5 text-[13.5px] outline-none placeholder:text-dim"
            />
            <button
              onClick={() => send(input)}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="border border-line px-2.5 py-1.5 text-dim transition-colors enabled:hover:border-[#38BDF8]/50 enabled:hover:text-fg disabled:opacity-30"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
