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
 *
 * The response is a stream of NDJSON events rather than one JSON object at the
 * end. Reading a scanned PDF takes the better part of a minute, and a request
 * that returns nothing for forty seconds is indistinguishable from one that has
 * died. Each stage announces itself when it starts and again when it finishes,
 * so the page can show what is happening and what it cost while it happens.
 */
import { NextResponse } from "next/server";
import { ocr, chat, MODEL } from "@/lib/amd";
import { runTool } from "@/lib/evolus";
import { NODES } from "@/data/factory";
import type { Pcn } from "@/lib/types";
import { lastBuyDate, classify, labelled } from "@/lib/notice-read";

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

export async function POST(req: Request) {
  let filename = "notice.pdf";
  let base64 = "";
  let mime = "application/pdf";
  let known: string[] = DEMO_PARTS;

  // Validation failures happen before the stream opens, so they stay ordinary
  // HTTP errors with a real status code.
  try {
    const body = await req.json();
    filename = String(body.filename ?? filename);
    base64 = String(body.data ?? "");
    mime = String(body.mime ?? mime);
    if (Array.isArray(body.knownParts) && body.knownParts.length) {
      known = body.knownParts.slice(0, 20000).map(String);
    }
  } catch {
    return NextResponse.json(
      { error: "expected JSON with { filename, mime, data }" },
      { status: 400 },
    );
  }
  if (!base64) return NextResponse.json({ error: "no file data" }, { status: 400 });
  if (base64.length * 0.75 > MAX_BYTES) {
    return NextResponse.json({ error: "file is larger than 8 MB" }, { status: 413 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const stages: Stage[] = [];
      let closed = false;

      const send = (event: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      const finish = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      const timed = async <T>(
        name: string,
        provider: Stage["provider"],
        fn: () => Promise<T>,
        extra?: (r: T) => Partial<Stage>,
      ): Promise<T> => {
        send({ t: "begin", name, provider });
        const t0 = Date.now();
        const out = await fn();
        const stage: Stage = { name, provider, ms: Date.now() - t0, ...(extra ? extra(out) : {}) };
        stages.push(stage);
        send({ t: "stage", stage });
        return out;
      };

      const totals = () => ({
        ms: stages.reduce((s, x) => s + x.ms, 0),
        evolusCredits: Number(stages.reduce((s, x) => s + (x.credits ?? 0), 0).toFixed(3)),
        amdCostUsd: Number(stages.reduce((s, x) => s + (x.costUsd ?? 0), 0).toFixed(6)),
      });

      try {
        // 1. OCR on AMD. MinerU takes a data URI, so nothing has to be hosted.
        const read = await timed("read the document", "amd", () =>
          ocr(`data:${mime};base64,${base64}`),
        );
        const text = read.markdown.trim();
        if (!text) {
          send({
            t: "error",
            error: "No text could be read from that file.",
            stages,
            totals: totals(),
          });
          return finish();
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
                    "Use null for anything the document does not state. Never guess a date. " +
                    'Use type "eol" only when the part is being discontinued outright. A ' +
                    "change of process, material, plating, assembly site or package marking " +
                    'is type "change", even when it has a last-time-buy date attached.',
                },
                {
                  role: "user",
                  content:
                    `NOTICE TEXT:\n${text.slice(0, 6000)}\n\n` +
                    (extracted.output
                      ? `EXTRACTED FIELDS:\n${extracted.output.slice(0, 2000)}\n\n`
                      : "") +
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
          /* the deterministic readers below do not depend on this succeeding */
        }

        // 4. Reconcile against the real BOM.
        send({ t: "begin", name: "match against the bill of materials", provider: "local" });
        const claimed = Array.isArray(parsed.partNumbers)
          ? (parsed.partNumbers as string[]).join(" ")
          : "";
        const partIds = [...new Set([...matchParts(claimed, known), ...matchParts(text, known)])];
        const found = lastBuyDate(text);
        const kind = classify(text, parsed.type);
        const chosen =
          (typeof parsed.lastBuyDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastBuyDate)
            ? parsed.lastBuyDate
            : null) ?? found.date;

        const match: Stage = {
          name: "match against the bill of materials",
          provider: "local",
          ms: 0,
          note: partIds.length
            ? `${partIds.length} of our ${known.length} parts named`
            : `none of our ${known.length} parts were named`,
        };
        stages.push(match);
        send({ t: "stage", stage: match });

        if (partIds.length === 0) {
          send({
            t: "error",
            error:
              "The document was read, but it names no component in this bill of materials. " +
              "Nothing can be assessed from it.",
            readText: text.slice(0, 1200),
            stages,
            totals: totals(),
          });
          return finish();
        }
        if (!chosen) {
          send({
            t: "error",
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
            totals: totals(),
          });
          return finish();
        }

        const pcn: Pcn = {
          id: `PCN-UP-${Date.now().toString(36).toUpperCase()}`,
          supplierId: NODES.find((n) => n.id === partIds[0])?.supplierId ?? "ADI",
          receivedAt: new Date().toISOString().slice(0, 10),
          language:
            typeof parsed.language === "string" ? parsed.language.slice(0, 2).toLowerCase() : "en",
          type: kind.type,
          typeEvidence: kind.from,
          partIds,
          lastBuyDate: chosen,
          lastShipDate: typeof parsed.lastShipDate === "string" ? parsed.lastShipDate : undefined,
          replacementPartId:
            typeof parsed.replacementPart === "string" ? parsed.replacementPart : undefined,
          reason:
            labelled(text, ["reason for change", "reason for discontinuation", "reason:"]) ||
            labelled(text, ["description of change"]) ||
            (typeof parsed.reason === "string" ? parsed.reason : ""),
          rawText: text.slice(0, 4000),
        };

        send({ t: "done", pcn, filename, pageCount: read.pageCount, stages, totals: totals() });
        finish();
      } catch (err) {
        send({
          t: "error",
          error: err instanceof Error ? err.message : "unknown failure",
          stages,
          totals: totals(),
        });
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Tell any proxy in front of this not to buffer the stream into one blob.
      "X-Accel-Buffering": "no",
    },
  });
}
