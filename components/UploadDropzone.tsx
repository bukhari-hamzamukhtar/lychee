"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { Button, Panel } from "./ui";
import type { Pcn } from "@/lib/types";

interface Stage {
  name: string;
  provider: "amd" | "evolus" | "local";
  ms: number;
  credits?: number;
  costUsd?: number;
  note?: string;
}

const PROVIDER_STYLE = {
  amd: "border-warn/40 text-warn",
  evolus: "border-line text-accent",
  local: "border-line text-dim",
} as const;

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

export function UploadDropzone() {
  const router = useRouter();
  const { addNotice } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);

  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readText, setReadText] = useState<string | null>(null);

  const ingest = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      setReadText(null);
      setStages([]);
      try {
        if (file.size > 8 * 1024 * 1024) throw new Error("That file is larger than 8 MB.");

        const buf = await file.arrayBuffer();
        // Chunked so a large file does not blow the argument limit of fromCharCode.
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        const data = btoa(binary);

        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, mime: file.type || "application/pdf", data }),
        });
        const json = await res.json();
        setStages(json.stages ?? []);
        if (!res.ok) {
          setReadText(json.readText ?? null);
          throw new Error(json.error ?? `upload failed (${res.status})`);
        }
        const pcn = json.pcn as Pcn;
        addNotice(pcn);
        router.push(`/notices/${pcn.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "upload failed");
      } finally {
        setBusy(false);
      }
    },
    [addNotice, router],
  );

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
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) ingest(f);
        }}
        className={`flex flex-col items-center justify-center px-6 py-10 text-center transition-colors ${
          over ? "" : ""
        }`}
      >
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) ingest(f);
            e.target.value = "";
          }}
        />

        {busy ? (
          <>
            <div className="mb-3 h-8 w-8 animate-pulse-ring rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-fg">Reading the document&hellip;</p>
            <p className="mt-1 text-[12px] text-dim">
              OCR runs on AMD, extraction through Evolus. Usually under thirty seconds.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-fg">Drop a supplier notice here</p>
            <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-dim">
              A PDF or a photo of one, in any language. It is read by MinerU on AMD GPUs,
              the fields are extracted through Evolus, and the part numbers are matched
              against your bill of materials.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={() => input.current?.click()}>Choose a file</Button>
            </div>
            <p className="mt-3 text-[11px] text-dim">PDF, PNG, JPG or WebP &middot; up to 8 MB</p>
          </>
        )}
      </div>

      {(stages.length > 0 || error) && (
        <div className="animate-fade-in border-t border-line px-5 py-4">
          {stages.length > 0 && (
            <ol className="space-y-1.5">
              {stages.map((s, i) => (
                <li key={i} className="flex items-center gap-3 text-[12px]">
                  <span
                    className={`w-16 shrink-0 rounded border px-1.5 py-0.5 text-center text-[10px] font-medium uppercase ${
                      PROVIDER_STYLE[s.provider]
                    }`}
                  >
                    {s.provider === "local" ? "engine" : s.provider}
                  </span>
                  <span className="flex-1 text-mid">{s.name}</span>
                  {s.note && <span className="text-[11px] text-dim">{s.note}</span>}
                  <span className="tabular-nums text-dim">{(s.ms / 1000).toFixed(1)}s</span>
                </li>
              ))}
            </ol>
          )}

          {error && (
            <div className="mt-3 border border-crit/50  px-3 py-2.5">
              <p className="text-[12px] text-crit">{error}</p>
              {readText && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-dim">
                    What was actually read from the file
                  </summary>
                  <pre className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-mid">
                    {readText}
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
