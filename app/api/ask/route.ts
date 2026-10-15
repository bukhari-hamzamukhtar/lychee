/**
 * Vigil's endpoint, in both the places Vigil appears.
 *
 * The floating assistant sends a snapshot of the screen and asks about what is
 * on it. The Ask page sends something heavier: the documents a person has
 * dropped in, and the assertions already established about them. Both arrive
 * here, because the rule is the same either way — answer out of what you were
 * given, and never out of what you happen to know about electronics.
 *
 * Where grounding is supplied, the reply has to say which part of it each claim
 * came from. An unsourced sentence about a last-time-buy date is worse than no
 * sentence, because someone will act on it.
 */
import { NextResponse } from "next/server";
import { chat, MODEL } from "@/lib/amd";
import { SYSTEM_BRIEF, PERSONA } from "@/lib/app-knowledge";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface GroundingSource {
  filename: string;
  text: string;
}

const MAX_HISTORY = 20;
const MAX_QUESTION = 2000;
const MAX_CONTEXT = 6000;
const MAX_SOURCE_CHARS = 40000;
const MAX_SOURCES = 12;
const MAX_ASSERTIONS = 200;

/**
 * Added only when documents are in play.
 *
 * The citation rule is the whole point of the page: the engine's numbers and a
 * document's words carry different weight, and a reader has to be able to tell
 * which one they are looking at without taking the model's word for it.
 */
const GROUNDED_RULES = `
You have been given documents the user uploaded, facts computed from their bill
of materials, and assertions already established in this workspace.

Rules for this answer:
- Every factual claim ends with its source in square brackets: the filename for
  something read from a document, or [engine] for something computed from the
  bill of materials.
- A figure that came from the engine is exact. A figure read out of a document
  is only as good as the document. Never present one as the other.
- If the documents and the engine disagree, say so plainly and give both.
- If the answer is not in what you were given, say that it is not, and name the
  screen or the document that would have it. Do not fill the gap.
`.trim();

function buildGrounding(sources: GroundingSource[], assertions: string[], facts: string): string {
  const parts: string[] = [];

  if (facts.trim()) {
    parts.push(`--- COMPUTED FROM THE BILL OF MATERIALS (exact) ---\n${facts.trim()}`);
  }

  if (assertions.length) {
    parts.push(
      `--- ALREADY ESTABLISHED ---\n${assertions.slice(0, MAX_ASSERTIONS).join("\n")}`,
    );
  }

  for (const s of sources.slice(0, MAX_SOURCES)) {
    const body = String(s.text ?? "").slice(0, MAX_SOURCE_CHARS);
    if (!body.trim()) continue;
    parts.push(`--- DOCUMENT: ${s.filename} ---\n${body}`);
  }

  return parts.join("\n\n");
}

export async function POST(req: Request) {
  let question = "";
  let context = "";
  let history: Turn[] = [];
  let sources: GroundingSource[] = [];
  let assertions: string[] = [];
  let facts = "";

  try {
    const body = await req.json();
    question = String(body.question ?? "").slice(0, MAX_QUESTION);
    context = String(body.context ?? "").slice(0, MAX_CONTEXT);
    history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : [];
    sources = Array.isArray(body.sources) ? body.sources : [];
    assertions = Array.isArray(body.assertions) ? body.assertions.map(String) : [];
    facts = String(body.facts ?? "");
  } catch {
    return NextResponse.json({ error: "expected JSON with a question" }, { status: 400 });
  }

  if (!question.trim()) {
    return NextResponse.json({ error: "no question" }, { status: 400 });
  }

  const grounding = buildGrounding(sources, assertions, facts);
  const grounded = grounding.length > 0;

  try {
    const t0 = Date.now();
    const r = await chat(
      [
        {
          role: "system",
          content: [
            PERSONA,
            `--- HOW THE SYSTEM WORKS ---\n${SYSTEM_BRIEF}`,
            grounded ? GROUNDED_RULES : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
        ...history.map((t) => ({
          role: t.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(t.content).slice(0, 1500),
        })),
        {
          role: "user",
          content: [
            grounded ? grounding : "",
            context ? `--- WHAT IS ON MY SCREEN RIGHT NOW ---\n${context}` : "",
            `--- MY QUESTION ---\n${question}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      {
        model: MODEL.generate,
        // A grounded answer cites, which costs room; the floating assistant is
        // deliberately kept to a couple of sentences.
        maxTokens: grounded ? 700 : 420,
        temperature: 0.4,
        topP: 1.0,
      },
    );

    const text = r.text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "The model returned nothing. Try asking again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      answer: text,
      model: r.model,
      ms: Date.now() - t0,
      costUsd: r.costUsd,
      grounded,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown failure";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
