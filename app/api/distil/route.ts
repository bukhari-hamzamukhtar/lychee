/**
 * Turning a conversation into things that can be checked.
 *
 * When the window fills, the usual move is to summarise the transcript and keep
 * the summary. That keeps the prose and loses the facts: a paragraph saying
 * "we discussed the Hittite notice and its impact" cannot be verified, cannot
 * be contradicted by new evidence, and cannot be attached to a part.
 *
 * This asks for the opposite. The transcript goes in and discrete claims come
 * out, each one tied to a subject and marked with how it is known — read from a
 * document, computed by the engine, or a model's inference. The transcript is
 * then discarded and the claims are kept, which is the part worth keeping.
 *
 * Anything the model returns without a subject and a claim is dropped. A
 * malformed assertion is worse than a missing one.
 */
import { NextResponse } from "next/server";
import { chat, MODEL } from "@/lib/amd";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const STANDINGS = new Set(["stated", "derived", "inferred"]);
const MAX_OUT = 24;

const INSTRUCTION = `
You convert a conversation into discrete, checkable claims. Output JSON only.

Return {"assertions":[{"subject":string,"claim":string,"standing":"stated"|"derived"|"inferred","ref":string}]}

- subject: what the claim is about — a part number, a supplier, a product, or a
  document name. One subject per assertion.
- claim: one sentence, self-contained. It must still make sense to someone who
  never saw this conversation.
- standing: "stated" if a document said it in so many words; "derived" if it was
  computed from the bill of materials; "inferred" if it was a reading or a
  judgement rather than something given.
- ref: the document filename it came from, or "engine" for a computed figure,
  or "conversation" if it was established in discussion.

Keep only what would still matter tomorrow. Drop pleasantries, restatements of
the question, and anything the assistant said it did not know. Never invent a
part number, a date, a quantity or a cost that does not appear in the input.
`.trim();

export async function POST(req: Request) {
  let history: Turn[] = [];
  try {
    const body = await req.json();
    history = Array.isArray(body.history) ? body.history : [];
  } catch {
    return NextResponse.json({ error: "expected JSON with a history" }, { status: 400 });
  }

  const transcript = history
    .filter((t) => t && typeof t.content === "string" && t.content.trim())
    .slice(-40)
    .map((t) => `${t.role === "assistant" ? "VIGIL" : "USER"}: ${String(t.content).slice(0, 1800)}`)
    .join("\n\n");

  if (!transcript.trim()) {
    return NextResponse.json({ assertions: [], ms: 0, costUsd: 0 });
  }

  try {
    const t0 = Date.now();
    const r = await chat(
      [
        { role: "system", content: INSTRUCTION },
        { role: "user", content: `CONVERSATION:\n${transcript}` },
      ],
      { model: MODEL.generate, maxTokens: 900, temperature: 0.1, json: true },
    );

    let parsed: { assertions?: unknown } = {};
    try {
      parsed = JSON.parse(r.text.replace(/^```(?:json)?|```$/g, "").trim());
    } catch {
      return NextResponse.json(
        { error: "The distilled claims could not be read back.", assertions: [] },
        { status: 502 },
      );
    }

    const raw = Array.isArray(parsed.assertions) ? parsed.assertions : [];
    const assertions = raw
      .filter(
        (a): a is Record<string, string> =>
          !!a && typeof a === "object" && typeof (a as Record<string, unknown>).subject === "string",
      )
      .map((a) => ({
        subject: String(a.subject ?? "").slice(0, 80).trim(),
        claim: String(a.claim ?? "").slice(0, 400).trim(),
        standing: STANDINGS.has(String(a.standing)) ? String(a.standing) : "inferred",
        ref: String(a.ref ?? "conversation").slice(0, 120).trim() || "conversation",
      }))
      .filter((a) => a.subject && a.claim.length > 8)
      .slice(0, MAX_OUT);

    return NextResponse.json({
      assertions,
      model: r.model,
      ms: Date.now() - t0,
      costUsd: r.costUsd,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown failure";
    return NextResponse.json({ error: message, assertions: [] }, { status: 502 });
  }
}
