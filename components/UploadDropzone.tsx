"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/lib/store";
import { Button, Panel } from "./ui";

/**
 * Dropping a supplier notice in.
 *
 * The upload itself belongs to the workspace, not to this component, so leaving
 * the page does not cancel it and coming back shows where it got to. Everything
 * here reads that state and renders it.
 */

const PROVIDER_STYLE = {
  amd: "border-warn/40 text-warn",
  evolus: "border-line text-accent",
  local: "border-line text-dim",
} as const;

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

/** Seconds since a moment, ticking, for a stage that has not finished yet. */
function useElapsed(since: number, live: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [live]);
  return live ? Math.max(0, (now - since) / 1000) : 0;
}

export function UploadDropzone() {
  const { upload, startUpload, clearUpload } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const running = upload.status === "running";
  const elapsed = useElapsed(upload.startedAt, running);

  const choose = (file: File | undefined) => {
    if (file) startUpload(file);
  };

  return (
    <Panel className="overflow-hidden">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!running) choose(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center justify-center px-6 py-10 text-center transition-colors ${
          over ? "bg-bg-raised" : ""
        }`}
      >
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {running ? (
          <>
            <Spinner />
            <p className="mt-3.5 text-sm text-fg">
              Reading <span className="font-mono">{upload.filename}</span>
            </p>
            <p className="mt-1.5 text-[12.5px] text-dim">
              {upload.current ?? "finishing up"}
              <span className="ml-2 tabular-nums">{elapsed.toFixed(1)}s</span>
            </p>
            <p className="mt-3 max-w-md text-[12px] leading-relaxed text-dim">
              This takes about forty seconds. You can go to another tab and come back —
              it keeps running.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-fg">Drop a supplier notice here</p>
            <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-dim">
              A letter from a manufacturer saying a component is changing or ending —
              a PDF or a photo of one, in any language. It is read on AMD GPUs and the
              part numbers in it are matched against your bill of materials.
            </p>
            <p className="mt-2.5 max-w-md text-[11.5px] leading-relaxed text-dim">
              Not your parts list. That goes in under{" "}
              <span className="text-mid">Bill of materials</span>, once, and everything
              here is checked against it.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={() => input.current?.click()}>Choose a file</Button>
              {upload.status !== "idle" && (
                <Button tone="quiet" onClick={clearUpload}>
                  Clear
                </Button>
              )}
            </div>
            <p className="mt-3 text-[11.5px] text-dim">PDF, PNG, JPG or WebP &middot; up to 8 MB</p>
          </>
        )}
      </div>

      {(upload.stages.length > 0 || upload.error || upload.status === "done") && (
        <div className="border-t border-line px-5 py-4">
          {upload.stages.length > 0 && (
            <ol className="space-y-2">
              {upload.stages.map((s, i) => (
                <li key={`${s.name}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                  <span
                    className={`w-16 shrink-0 rounded border px-1.5 py-1 text-center text-[10px] font-medium uppercase tracking-wide ${
                      PROVIDER_STYLE[s.provider]
                    }`}
                  >
                    {s.provider === "local" ? "engine" : s.provider}
                  </span>
                  <span className="flex-1 text-mid">{s.name}</span>
                  {s.note && <span className="text-[11.5px] text-dim">{s.note}</span>}
                  <span className="tabular-nums text-dim">{(s.ms / 1000).toFixed(1)}s</span>
                </li>
              ))}
              {running && upload.current && (
                <li className="flex items-center gap-x-3 text-[12.5px]">
                  <span className="w-16 shrink-0 rounded border border-dashed border-line px-1.5 py-1 text-center text-[10px] uppercase tracking-wide text-dim">
                    now
                  </span>
                  <span className="flex-1 text-fg">{upload.current}</span>
                  <span className="tabular-nums text-dim">{elapsed.toFixed(1)}s</span>
                </li>
              )}
            </ol>
          )}

          {upload.totals && (
            <p className="mt-3.5 border-t border-line pt-3 text-[11.5px] text-dim">
              {(upload.totals.ms / 1000).toFixed(1)}s end to end &middot;{" "}
              {upload.totals.evolusCredits} Evolus credits &middot; $
              {upload.totals.amdCostUsd.toFixed(6)} of AMD inference
            </p>
          )}

          {upload.status === "done" && upload.pcnId && (
            <div className="mt-3.5 flex flex-wrap items-center gap-4">
              <Link href={`/notices/${upload.pcnId}`}>
                <Button tone="accent">See what it breaks</Button>
              </Link>
              <span className="text-[12.5px] text-dim">
                Saved as <span className="font-mono text-mid">{upload.pcnId}</span>
              </span>
            </div>
          )}

          {upload.error && (
            <div className="mt-3.5 border border-crit/50 px-3.5 py-3">
              <p className="text-[12.5px] text-crit">{upload.error}</p>
              {upload.diagnosis && (
                <dl className="mt-2.5 space-y-1 text-[11.5px]">
                  {Object.entries(upload.diagnosis).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="text-dim">{k}</dt>
                      <dd className="text-mid">{v === null ? "nothing" : String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {upload.readText && (
                <details className="mt-2.5">
                  <summary className="cursor-pointer text-[11.5px] text-dim">
                    What was actually read from the file
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11.5px] leading-relaxed text-mid">
                    {upload.readText}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

/** A ring that actually turns. The previous one named an animation that was never defined. */
function Spinner() {
  return (
    <span
      role="status"
      aria-label="Reading the document"
      className="block h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent"
    />
  );
}
