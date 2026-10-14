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

const DEMO_PARTS = NODES.filter((n) => n.kind === "part").map((n) => n.id);

/**
 * Part numbers the document named, narrowed to ones actually built.
 *
 * The caller sends its own part list when a bill of materials has been
 * imported, because that lives in their workspace and the server has never seen
 * it. Without one, the demo factory is the reference.
 */
function matchParts(haystack: string, known: string[]): string[] {
  const upper = haystack.toUpperCase();
  return known.filter((id) => id.length >= 4 && upper.includes(id.toUpperCase()));
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Labels a manufacturer might put beside the date that actually matters. */
const LTB_LABELS = [
  "last time buy", "last-time buy", "lasttime buy", "last time-buy",
  "last order date", "last buy", "ltb", "last time order",
  "final order", "last purchase", "letzter bestelltermin", "last time buy date",
];

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Pull a date out of one line of text.
 *
 * Covers what manufacturers actually write: ISO, "17 November 2026",
 * "November 17, 2026", and numeric forms. Numeric day/month order is genuinely
 * ambiguous — 2/1/2014 is February 1st to a US manufacturer and January 2nd to
 * a European one — so a value above twelve settles it and otherwise month-first
 * is assumed, which is the convention in the notices this was tested against.
 */
function dateIn(text: string): string | null {
  const isoM = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoM) return iso(+isoM[1], +isoM[2], +isoM[3]);

  // Escapes are doubled: inside a template literal "\b" is a backspace and
  // "\d" is just the letter d, so single-escaped patterns match nothing.
  const dmy = text.match(
    new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS.join("|")})\\w*\\s+(20\\d{2})\\b`, "i"),
  );
  if (dmy) return iso(+dmy[3], MONTHS.indexOf(dmy[2].toLowerCase()) + 1, +dmy[1]);

  const mdy = text.match(
    new RegExp(`\\b(${MONTHS.join("|")})\\w*\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b`, "i"),
  );
  if (mdy) return iso(+mdy[3], MONTHS.indexOf(mdy[1].toLowerCase()) + 1, +mdy[2]);

  const num = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2}|\d{2})\b/);
  if (num) {
    let [a, b] = [+num[1], +num[2]];
    const yr = num[3].length === 2 ? 2000 + +num[3] : +num[3];
    if (a > 12 && b <= 12) return iso(yr, b, a);   // unambiguously day-first
    return iso(yr, a, b);                          // otherwise month-first
  }
  return null;
}

/**
 * Prefer the date sitting beside a last-time-buy label, and only fall back to
 * the first date anywhere. A notice is full of dates — qualification samples,
 * first shipment, the notice's own date — and the wrong one is worse than none.
 */
function lastBuyDate(text: string): { date: string | null; from: string } {
  const lines = text.split(/\n+/);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!LTB_LABELS.some((l) => lower.includes(l))) continue;
    const d = dateIn(line);
    if (d) return { date: d, from: line.trim().slice(0, 90) };
  }
  // the label and its date sometimes land on consecutive lines
  for (let i = 0; i < lines.length - 1; i++) {
    if (!LTB_LABELS.some((l) => lines[i].toLowerCase().includes(l))) continue;
    const d = dateIn(lines[i + 1]);
    if (d) return { date: d, from: `${lines[i].trim()} / ${lines[i + 1].trim()}`.slice(0, 90) };
  }
  for (const line of lines) {
    const d = dateIn(line);
    if (d) return { date: d, from: `no last-time-buy label found; used "${line.trim().slice(0, 60)}"` };
  }
  return { date: null, from: "" };
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
  let known: string[] = DEMO_PARTS;

  try {
    const body = await req.json();
    filename = String(body.filename ?? filename);
    base64 = String(body.data ?? "");
    mime = String(body.mime ?? mime);
    if (Array.isArray(body.knownParts) && body.knownParts.length) {
      known = body.knownParts.slice(0, 20000).map(String);
    }
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
    const partIds = [...new Set([...matchParts(claimed, known), ...matchParts(text, known)])];
    const found = lastBuyDate(text);
    const chosen =
      (typeof parsed.lastBuyDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastBuyDate)
        ? parsed.lastBuyDate
        : null) ?? found.date;

    stages.push({
      name: "match against the bill of materials",
      provider: "local",
      ms: 0,
      note: partIds.length
        ? `${partIds.length} of our ${known.length} parts named`
        : `none of our ${known.length} parts were named`,
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
    if (!chosen) {
      return NextResponse.json(
        {
          error: "No last-time-buy date could be found in that document.",
          // Say what was looked at, so a failure is diagnosable rather than flat.
          diagnosis: {
            modelSaid: parsed.lastBuyDate ?? null,
            scannerSaid: found.date,
            scannerLooked: found.from || "no date pattern matched any line",
            lineCount: text.split(/\n+/).length,
          },
          readText: text.slice(0, 1200),
          stages,
        },
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
      lastBuyDate: chosen,
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
