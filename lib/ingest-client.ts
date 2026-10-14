"use client";

/**
 * Reading the ingest stream.
 *
 * The server sends one JSON object per line as each stage of the pipeline
 * finishes. This turns that into callbacks, so the page can show the OCR
 * finishing at thirteen seconds instead of waiting forty for everything.
 *
 * None of this is tied to a component. An upload that takes most of a minute
 * must survive the user walking to another tab while it runs, so the caller
 * owns the state and this only reports into it.
 */
import type { Pcn } from "./types";

export interface IngestStage {
  name: string;
  provider: "amd" | "evolus" | "local";
  ms: number;
  credits?: number;
  costUsd?: number;
  note?: string;
}

export interface IngestTotals {
  ms: number;
  evolusCredits: number;
  amdCostUsd: number;
}

export interface IngestFailure {
  error: string;
  readText?: string;
  diagnosis?: Record<string, unknown>;
  stages: IngestStage[];
  totals?: IngestTotals;
}

export interface IngestSuccess {
  pcn: Pcn;
  filename: string;
  pageCount?: number;
  stages: IngestStage[];
  totals: IngestTotals;
}

export interface IngestHandlers {
  /** A stage has started; nothing is known about it yet but its name. */
  onBegin?: (name: string, provider: IngestStage["provider"]) => void;
  onStage?: (stage: IngestStage) => void;
  onDone?: (result: IngestSuccess) => void;
  onError?: (failure: IngestFailure) => void;
}

/** Base64 for a file, chunked so a large one does not blow the argument limit. */
export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Post a document and report each stage as the server completes it.
 *
 * Resolves when the stream ends, whichever way it ended; the handlers say what
 * happened. It never throws for an ordinary failure, because a document that
 * could not be read is a result, not an exception.
 */
export async function ingestDocument(
  file: File,
  knownParts: string[],
  handlers: IngestHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const fail = (error: string, stages: IngestStage[] = []) =>
    handlers.onError?.({ error, stages });

  if (file.size > MAX_UPLOAD_BYTES) {
    return fail("That file is larger than 8 MB.");
  }

  let res: Response;
  try {
    const data = await fileToBase64(file);
    res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        filename: file.name,
        mime: file.type || "application/pdf",
        data,
        // The server has never seen an imported bill of materials, so the part
        // list travels with the request.
        knownParts,
      }),
    });
  } catch (e) {
    if (signal?.aborted) return;
    return fail(e instanceof Error ? e.message : "the upload could not be sent");
  }

  // Validation failures are refused before the stream opens, as plain JSON.
  if (!res.ok || !res.body) {
    let message = `upload failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = String(body.error);
    } catch {
      /* a response with no JSON body leaves the status as the explanation */
    }
    return fail(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const stages: IngestStage[] = [];
  let settled = false;

  const handle = (line: string) => {
    if (!line.trim()) return;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line);
    } catch {
      return; // a torn line is not worth taking the upload down for
    }
    switch (event.t) {
      case "begin":
        handlers.onBegin?.(String(event.name), event.provider as IngestStage["provider"]);
        break;
      case "stage": {
        const stage = event.stage as IngestStage;
        stages.push(stage);
        handlers.onStage?.(stage);
        break;
      }
      case "done":
        settled = true;
        handlers.onDone?.(event as unknown as IngestSuccess);
        break;
      case "error":
        settled = true;
        handlers.onError?.(event as unknown as IngestFailure);
        break;
    }
  };

  try {
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
    if (signal?.aborted) return;
    if (!settled) fail(e instanceof Error ? e.message : "the connection dropped", stages);
    return;
  }

  // A stream that ended without a verdict is a failure the user should see
  // rather than a spinner that never stops.
  if (!settled) {
    fail(
      "The connection closed before the document was finished. " +
        "Reading a large scan can exceed the request limit; try a smaller file.",
      stages,
    );
  }
}
