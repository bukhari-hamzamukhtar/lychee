/**
 * Turn an uploaded supplier notice into something the engine can assess.
 *
 *   MinerU2.5-Pro on AMD   PDF or scan -> Markdown, per page
 *   local                  readers     -> type, last-time buy, reason, parts
 *   Evolus + AMD model     only when the readers came up short
 *
 * The order matters. A supplier notice is a form: it states its category in a
 * ticked box, prints its last-time-buy date beside a label, and lists its part
 * numbers. When the document says all of that plainly there is nothing for a
 * model to add, and asking one anyway costs thirty seconds and a little money
 * to arrive at an answer that was already on the page. So the deterministic
 * readers go first and the model is the fallback, not the default.
 *
 * That is also what keeps this inside a sixty-second request. A scanned form
 * takes most of a minute to OCR on its own; it cannot also afford two language
 * model round trips before anyone sees a result.
 *
 * The part match is the last word either way. A model may read a part number
 * that is not in this company's bill of materials, and an assessment of a part
 * we do not build is worse than no assessment.
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

/** Nothing has been heard from the stream for this long; say we are still here. */
const HEARTBEAT_MS = 8000;

/**
 * How long the whole request may take, and what the optional stage needs.
 *
 * maxDuration is 60s and the platform does not warn before it cuts; a request
 * killed mid-stream looks to the browser exactly like a dead connection. OCR on
 * a large scan takes most of a minute on its own, so the budget has to be spent
 * deliberately rather than hoped through.
 *
 * Evolus doc-structure is genuinely useful — it hands the model clean fields to
 * work from — but it is not load-bearing: the model gets the full notice text
 * either way. So it is the thing that gets dropped when OCR has already eaten
 * the budget, and the stream says that is what happened.
 */
const TOTAL_BUDGET_MS = Number(process.env.INGEST_BUDGET_MS ?? 55_000);
const MODEL_RESERVE_MS = Number(process.env.INGEST_MODEL_RESERVE_MS ?? 22_000);
const EVOLUS_ESTIMATE_MS = 12_000;

interface Stage {
  name: string;
  provider: "amd" | "evolus" | "local";
  ms: number;
  credits?: number;
  costUsd?: number;
  note?: string;
  /** Named per stage so the screen says which model did which piece of work. */
  model?: string;
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
      const startedAt = Date.now();
      const stages: Stage[] = [];
      let closed = false;

      const send = (event: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      // A long OCR with nothing on the wire looks like a dead connection to
      // every proxy between here and the browser. Keep something moving.
      const beat = setInterval(() => send({ t: "ping" }), HEARTBEAT_MS);
      const finish = () => {
        clearInterval(beat);
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

      const note = (name: string, ms: number, text: string) => {
        const stage: Stage = { name, provider: "local", ms, note: text };
        stages.push(stage);
        send({ t: "stage", stage });
      };

      const totals = () => ({
        ms: stages.reduce((s, x) => s + x.ms, 0),
        evolusCredits: Number(stages.reduce((s, x) => s + (x.credits ?? 0), 0).toFixed(3)),
        amdCostUsd: Number(stages.reduce((s, x) => s + (x.costUsd ?? 0), 0).toFixed(6)),
      });

      try {
        // 1. OCR on AMD. MinerU takes a data URI, so nothing has to be hosted.
        const read = await timed(
          "read the document",
          "amd",
          () => ocr(`data:${mime};base64,${base64}`),
          () => ({ model: MODEL.ocr }),
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

        // 2. Read the form directly. All of this is deterministic.
        send({ t: "begin", name: "read the form", provider: "local" });
        const t1 = Date.now();
        let partIds = matchParts(text, known);
        const found = lastBuyDate(text);
        const kind = classify(text, null);
        const reason =
          labelled(text, ["reason for change", "reason for discontinuation", "reason:"]) ||
          labelled(text, ["description of change"]);
        const guessedType = kind.from.startsWith("assumed");

        const got: string[] = [];
        if (partIds.length) got.push(`${partIds.length} part${partIds.length === 1 ? "" : "s"}`);
        if (found.date) got.push("last-time buy");
        if (!guessedType) got.push("type");
        note(
          "read the form",
          Date.now() - t1,
          got.length ? `found ${got.join(", ")} without a model` : "nothing could be read directly",
        );

        // 3. The model only runs for what the document did not state plainly.
        const needsModel = !found.date || guessedType || partIds.length === 0;
        let parsed: Record<string, unknown> = {};

        if (needsModel) {
          const missing: string[] = [];
          if (!found.date) missing.push("a last-time-buy date");
          if (guessedType) missing.push("the kind of notice");
          if (!partIds.length) missing.push("part numbers in a form we recognise");

          // Spend the optional step only if there is room left for the one that
          // matters. A long OCR means this document gets the model and nothing
          // else, which is a worse answer than it could have been but an answer.
          const spent = Date.now() - startedAt;
          const roomForEvolus =
            spent + EVOLUS_ESTIMATE_MS + MODEL_RESERVE_MS < TOTAL_BUDGET_MS;

          const extracted = roomForEvolus
            ? await timed(
                "extract fields",
                "evolus",
                () =>
                  runTool("doc-structure", text.slice(0, 12000), { format: "json", content: "data" }),
                (r) => ({ credits: r.creditsConsumed, note: `looking for ${missing.join(", ")}` }),
              ).catch(() => ({
                output: "",
                creditsConsumed: 0,
                tool: "doc-structure",
                truncated: false,
              }))
            : (note(
                "skip the extractor",
                0,
                `reading took ${Math.round(spent / 1000)}s; going straight to the model to stay inside the limit`,
              ),
              { output: "", creditsConsumed: 0, tool: "doc-structure", truncated: false });

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
            (r) => ({ costUsd: r.costUsd, model: MODEL.generate }),
          ).catch(() => ({ text: "", costUsd: 0, model: "", finishReason: "error" }));

          try {
            parsed = JSON.parse(normalised.text.replace(/^```(?:json)?|```$/g, "").trim());
          } catch {
            /* the deterministic readers above do not depend on this succeeding */
          }

          // Only ever add to what was read directly; never overwrite it.
          if (!partIds.length && Array.isArray(parsed.partNumbers)) {
            partIds = matchParts((parsed.partNumbers as string[]).join(" "), known);
          }
        } else {
          note("skip the model", 0, "the document stated everything plainly");
        }

        // 4. Reconcile against the real BOM.
        partIds = [...new Set(partIds)];
        const chosen =
          found.date ??
          (typeof parsed.lastBuyDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastBuyDate)
            ? parsed.lastBuyDate
            : null);
        const type = guessedType && parsed.type === "change" ? "change" : kind.type;
        const typeEvidence = guessedType && parsed.type ? "the model's reading of the text" : kind.from;

        note(
          "match against the bill of materials",
          0,
          partIds.length
            ? `${partIds.length} of our ${known.length} parts named`
            : `none of our ${known.length} parts were named`,
        );

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
          type,
          typeEvidence,
          partIds,
          lastBuyDate: chosen,
          lastShipDate: typeof parsed.lastShipDate === "string" ? parsed.lastShipDate : undefined,
          replacementPartId:
            typeof parsed.replacementPart === "string" ? parsed.replacementPart : undefined,
          reason: reason || (typeof parsed.reason === "string" ? parsed.reason : ""),
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
