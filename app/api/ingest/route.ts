/**
 * Turn an uploaded supplier notice into something the engine can assess.
 *
 *   MinerU2.5-Pro on AMD   PDF or scan -> Markdown, per page
 *   Evolus doc-structure   Markdown    -> structured fields
 *   AMD model              fields      -> our notice shape, strict JSON
 *   local                  part match  -> only parts that exist in the BOM
 *
 * The part match is deliberately the last word. A model may read a part number
 * that is not in this company's bill of materials, and an assessment of a part
 * we do not build is worse than no assessment.
 */
import { NextResponse } from "next/server";
import { ocr, chat, MODEL } from "@/lib/amd";
import { runTool } from "@/lib/evolus";
import { NODES } from "@/data/factory";
import type { Pcn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

interface Stage {
  name: string;
  provider: "amd" | "evolus" | "local";
  ms: number;
  credits?: number;
  costUsd?: number;
  note?: string;
}

const KNOWN_PARTS = NODES.filter((n) => n.kind === "part").map((n) => n.id);

/** Part numbers the model saw, narrowed to ones this factory actually uses. */
function matchParts(haystack: string): string[] {
  const upper = haystack.toUpperCase();
  return KNOWN_PARTS.filter((id) => upper.includes(id.toUpperCase()));
}

function firstDate(text: string): string | null {
  // ISO first, then "17 November 2026" and "November 17, 2026".
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december";
  const dmy = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS})\\s+(20\\d{2})\\b`, "i"));
  if (dmy) return toIso(dmy[3], dmy[2], dmy[1]);
  const mdy = text.match(new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b`, "i"));
  if (mdy) return toIso(mdy[3], mdy[1], mdy[2]);
  return null;
}

function toIso(year: string, month: string, day: string): string {
  const idx = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ].indexOf(month.toLowerCase());
  return `${year}-${String(idx + 1).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  const stages: Stage[] = [];
  const timed = async <T>(
    name: string,
    provider: Stage["provider"],
    fn: () => Promise<T>,
    extra?: (r: T) => Partial<Stage>,
  ): Promise<T> => {
    const t0 = Date.now();
    const out = await fn();
    stages.push({ name, provider, ms: Date.now() - t0, ...(extra ? extra(out) : {}) });
    return out;
  };

  let filename = "notice.pdf";
  let base64 = "";
  let mime = "application/pdf";

  try {
    const body = await req.json();
    filename = String(body.filename ?? filename);
    base64 = String(body.data ?? "");
    mime = String(body.mime ?? mime);
  } catch {
    return NextResponse.json({ error: "expected JSON with { filename, mime, data }" }, { status: 400 });
  }

  if (!base64) return NextResponse.json({ error: "no file data" }, { status: 400 });
  if (base64.length * 0.75 > MAX_BYTES) {
    return NextResponse.json({ error: "file is larger than 8 MB" }, { status: 413 });
  }

  try {
    // 1. OCR on AMD. MinerU takes a data URI, so nothing has to be hosted.
    const read = await timed("read the document", "amd", () =>
      ocr(`data:${mime};base64,${base64}`),
    );
    const text = read.markdown.trim();
    if (!text) {
      return NextResponse.json(
        { error: "no text could be read from that file", stages },
        { status: 422 },
      );
    }

    // 2. Structured extraction through Evolus.
    const extracted = await timed(
      "extract fields",
      "evolus",
      () => runTool("doc-structure", text.slice(0, 12000), { format: "json", content: "data" }),
      (r) => ({ credits: r.creditsConsumed }),
    ).catch(() => ({ output: "", creditsConsumed: 0, tool: "doc-structure", truncated: false }));

    // 3. Normalise to our shape. Low temperature, strict JSON, no prose.
    const normalised = await timed(
      "normalise the notice",
      "amd",
      () =>
        chat(
          [
            {
              role: "system",
              content:
                "You convert supplier notices into JSON. Output JSON only, no prose. " +
                "Use null for anything the document does not state. Never guess a date.",
            },
            {
              role: "user",
              content:
                `NOTICE TEXT:\n${text.slice(0, 6000)}\n\n` +
                (extracted.output ? `EXTRACTED FIELDS:\n${extracted.output.slice(0, 2000)}\n\n` : "") +
                `Return {"supplier":string|null,"partNumbers":string[],"type":"eol"|"change",` +
                `"lastBuyDate":"YYYY-MM-DD"|null,"lastShipDate":"YYYY-MM-DD"|null,` +
                `"replacementPart":string|null,"reason":string|null,"language":string}`,
            },
          ],
          { model: MODEL.generate, maxTokens: 500, temperature: 0.1, json: true },
        ),
      (r) => ({ costUsd: r.costUsd }),
    ).catch(() => ({ text: "", costUsd: 0, model: "", finishReason: "error" }));

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(normalised.text.replace(/^```(?:json)?|```$/g, "").trim());
    } catch {
      /* fall through to the regex path below */
    }

    // 4. Reconcile against the real BOM.
    const claimed = Array.isArray(parsed.partNumbers) ? (parsed.partNumbers as string[]).join(" ") : "";
    const partIds = [...new Set([...matchParts(claimed), ...matchParts(text)])];
    const lastBuyDate =
      (typeof parsed.lastBuyDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastBuyDate)
        ? parsed.lastBuyDate
        : null) ?? firstDate(text);

    stages.push({
      name: "match against the bill of materials",
      provider: "local",
      ms: 0,
      note: partIds.length
        ? `${partIds.length} of our parts named`
        : "no part in this BOM was named",
    });

    if (partIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "The document was read, but it names no component in this bill of materials. " +
            "Nothing can be assessed from it.",
          readText: text.slice(0, 1200),
          stages,
        },
        { status: 422 },
      );
    }
    if (!lastBuyDate) {
      return NextResponse.json(
        { error: "No last-time-buy date could be found in that document.", readText: text.slice(0, 1200), stages },
        { status: 422 },
      );
    }

    const pcn: Pcn = {
      id: `PCN-UP-${Date.now().toString(36).toUpperCase()}`,
      supplierId: NODES.find((n) => n.id === partIds[0])?.supplierId ?? "ADI",
      receivedAt: new Date().toISOString().slice(0, 10),
      language: typeof parsed.language === "string" ? parsed.language.slice(0, 2).toLowerCase() : "en",
      type: parsed.type === "change" ? "change" : "eol",
      partIds,
      lastBuyDate,
      lastShipDate: typeof parsed.lastShipDate === "string" ? parsed.lastShipDate : undefined,
      replacementPartId: typeof parsed.replacementPart === "string" ? parsed.replacementPart : undefined,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      rawText: text.slice(0, 4000),
    };

    return NextResponse.json({
      pcn,
      filename,
      pageCount: read.pageCount,
      stages,
      totals: {
        ms: stages.reduce((s, x) => s + x.ms, 0),
        evolusCredits: Number(stages.reduce((s, x) => s + (x.credits ?? 0), 0).toFixed(3)),
        amdCostUsd: Number(stages.reduce((s, x) => s + (x.costUsd ?? 0), 0).toFixed(6)),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown failure";
    return NextResponse.json({ error: message, stages }, { status: 502 });
  }
}
