/**
 * Read any document the user drops in, without assuming what it is.
 *
 * The ingest route is for supplier notices specifically: it insists on a
 * last-time-buy date and a part it recognises, and refuses anything else. That
 * refusal is correct there and useless here, because the Ask page takes
 * whatever a person has on hand — a datasheet, a quality report, a spreadsheet,
 * a photograph of a letter — and its job is only to turn it into text the agent
 * can be grounded in.
 *
 * Like the ingest route it streams, because OCR on a scan takes long enough
 * that silence is indistinguishable from failure.
 */
import { NextResponse } from "next/server";
import { ocr } from "@/lib/amd";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
/** Enough of a document to ground an answer, bounded so one file cannot eat the window. */
const MAX_TEXT = 20000;

export async function POST(req: Request) {
  let filename = "document";
  let base64 = "";
  let mime = "application/pdf";

  try {
    const body = await req.json();
    filename = String(body.filename ?? filename);
    base64 = String(body.data ?? "");
    mime = String(body.mime ?? mime);
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

      const t0 = Date.now();
      try {
        send({ t: "begin", name: "read the document", provider: "amd" });
        const read = await ocr(`data:${mime};base64,${base64}`);
        const text = read.markdown.trim();

        if (!text) {
          send({
            t: "error",
            error: "No text could be read from that file.",
            ms: Date.now() - t0,
          });
          return finish();
        }

        send({
          t: "done",
          filename,
          text: text.slice(0, MAX_TEXT),
          truncated: text.length > MAX_TEXT,
          pageCount: read.pageCount,
          ms: Date.now() - t0,
          // MinerU is billed by the page rather than by the token, and the
          // client shows what the read cost next to the document.
          costUsd: 0,
        });
        finish();
      } catch (err) {
        send({
          t: "error",
          error: err instanceof Error ? err.message : "unknown failure",
          ms: Date.now() - t0,
        });
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
