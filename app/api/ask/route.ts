/**
 * Vigil's endpoint.
 *
 * The assistant answers from two things and nothing else: a fixed brief of how
 * the system works, and a snapshot of what is actually on the caller's screen,
 * which the client assembles and sends with each turn. That keeps it honest —
 * it can describe this workspace rather than obsolescence management in general.
 *
 * It runs on the same AMD-hosted open model as the rest of the pipeline.
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

const MAX_HISTORY = 8;
const MAX_QUESTION = 2000;
const MAX_CONTEXT = 6000;

export async function POST(req: Request) {
  let question = "";
  let context = "";
  let history: Turn[] = [];

  try {
    const body = await req.json();
    question = String(body.question ?? "").slice(0, MAX_QUESTION);
    context = String(body.context ?? "").slice(0, MAX_CONTEXT);
    history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : [];
  } catch {
    return NextResponse.json({ error: "expected JSON with a question" }, { status: 400 });
  }

  if (!question.trim()) {
    return NextResponse.json({ error: "no question" }, { status: 400 });
  }

  try {
    const t0 = Date.now();
    const r = await chat(
      [
        {
          role: "system",
          content: `${PERSONA}\n\n--- HOW THE SYSTEM WORKS ---\n${SYSTEM_BRIEF}`,
        },
        ...history.map((t) => ({
          role: t.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(t.content).slice(0, 1500),
        })),
        {
          role: "user",
          content: context
            ? `--- WHAT IS ON MY SCREEN RIGHT NOW ---\n${context}\n\n--- MY QUESTION ---\n${question}`
            : question,
        },
      ],
      { model: MODEL.generate, maxTokens: 420, temperature: 0.4, topP: 1.0 },
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown failure";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
