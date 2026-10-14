"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import {
  parseCsv,
  inferColumns,
  buildDataset,
  FIELD_LABELS,
  type Field,
  type ParsedCsv,
  type ImportResult,
} from "@/lib/bom-import";
import { Button, Eyebrow, PageHead, Tag, num } from "@/components/ui";

const FIELDS = Object.keys(FIELD_LABELS) as Field[];

export default function ImportPage() {
  const router = useRouter();
  const { bom, loadBom, clearBom, hydrated } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [filename, setFilename] = useState("");
  const [cols, setCols] = useState<Partial<Record<Field, number>>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function read(file: File) {
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = parseCsv(String(reader.result ?? ""));
        if (p.headers.length === 0 || p.rows.length === 0) {
          throw new Error("That file has no header row and no data rows.");
        }
        setParsed(p);
        setFilename(file.name);
        setCols(inferColumns(p.headers));
      } catch (e) {
        setError(e instanceof Error ? e.message : "could not read that file");
      }
    };
    reader.onerror = () => setError("could not read that file");
    reader.readAsText(file);
  }

  function preview() {
    if (!parsed) return;
    setError(null);
    try {
      setResult(buildDataset(parsed, cols, filename.replace(/\.[^.]+$/, "") || "Imported assembly"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not build a bill of materials");
    }
  }

  function commit() {
    if (!result) return;
    loadBom({
      name: filename || "Imported BOM",
      importedAt: new Date().toISOString(),
      dataset: result.dataset,
    });
    router.push("/parts");
  }

  return (
    <div className="mx-auto max-w-[1320px] px-8 pb-28 pt-12">
      <PageHead
        title="Import a bill of materials"
        meta="your parts, your hierarchy, your column names"
        actions={
          hydrated && bom ? (
            <Button
              tone="quiet"
              onClick={() => {
                clearBom();
                router.refresh();
              }}
            >
              Back to the demo factory
            </Button>
          ) : undefined
        }
      />

      {hydrated && bom && (
        <p className="mb-10 border border-line px-5 py-4 text-[14px] text-mid">
          Running on <span className="text-fg">{bom.name}</span>, imported{" "}
          {new Date(bom.importedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.
          Importing another replaces it.
        </p>
      )}

      {!parsed && (
        <div className="border border-line px-6 py-16 text-center">
          <input
            ref={input}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) read(f);
              e.target.value = "";
            }}
          />
          <p className="text-[17px]">Drop in a CSV export from your PLM or ERP</p>
          <p className="mx-auto mt-3 max-w-[58ch] leading-relaxed text-dim">
            No two companies name their columns the same way. Yours are read as they are
            and matched by meaning — &ldquo;MPN&rdquo;, &ldquo;Manufacturer Part
            Number&rdquo; and &ldquo;Part No&rdquo; all land in the same place. You get to
            correct the guess before anything loads.
          </p>
          <div className="mt-7">
            <Button onClick={() => input.current?.click()}>Choose a file</Button>
          </div>
          <p className="mt-4 text-[12.5px] text-dim">CSV, TSV or tab-separated text</p>
        </div>
      )}

      {error && (
        <p className="mt-6 border border-crit/50 px-5 py-4 text-[13.5px] text-crit">{error}</p>
      )}

      {parsed && (
        <div className="mt-2 space-y-12">
          <section>
            <Eyebrow>
              {filename} &middot; {num(parsed.rows.length)} rows &middot; {parsed.headers.length} columns
            </Eyebrow>

            <div className="mt-5 border border-line">
              <div className="border-b border-line px-5 py-3.5">
                <p className="text-[14px]">What each column was taken to mean</p>
                <p className="mt-1 text-[12.5px] text-dim">
                  Change anything that is wrong. Only the part number is required.
                </p>
              </div>

              <div className="divide-y divide-line">
                {FIELDS.map((f) => (
                  <div key={f} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
                    <span className="w-52 shrink-0 text-[14px]">
                      {FIELD_LABELS[f]}
                      {f === "partNumber" && <span className="ml-1.5 text-accent">*</span>}
                    </span>
                    <select
                      value={cols[f] ?? -1}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setCols((c) => ({ ...c, [f]: v < 0 ? undefined : v }));
                        setResult(null);
                      }}
                      className="min-w-56 border border-line bg-bg px-3 py-1.5 text-[13.5px] text-fg outline-none focus:border-line-bright"
                    >
                      <option value={-1}>not in this file</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    {cols[f] !== undefined && (
                      <span className="truncate font-mono text-[12px] text-dim">
                        e.g. {parsed.rows[0]?.[cols[f]!] || "—"}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
                <Button onClick={preview} tone="accent">
                  Check it
                </Button>
                <Button
                  tone="quiet"
                  onClick={() => {
                    setParsed(null);
                    setResult(null);
                    setError(null);
                  }}
                >
                  Choose a different file
                </Button>
              </div>
            </div>
          </section>

          {result && (
            <section>
              <Eyebrow>What this builds</Eyebrow>
              <div className="mt-5 grid gap-px border border-line sm:grid-cols-4">
                {[
                  ["Components", result.stats.parts],
                  ["Assemblies", result.stats.assemblies],
                  ["Products", result.stats.products],
                  ["Suppliers", result.stats.suppliers],
                ].map(([l, v]) => (
                  <div key={String(l)} className="border border-line px-6 py-5">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                      {l}
                    </div>
                    <div className="mt-2 text-[26px] font-semibold tabular-nums">{num(Number(v))}</div>
                  </div>
                ))}
              </div>

              {result.warnings.length > 0 && (
                <div className="mt-6 border border-warn/50 px-5 py-4">
                  <p className="text-[13px] text-warn">
                    It will load, but these are missing and some figures depend on them:
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {result.warnings.map((w) => (
                      <li key={w} className="text-[13px] text-mid">
                        &middot; {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button tone="accent" onClick={commit}>
                  Load this bill of materials
                </Button>
                <span className="text-[13px] text-dim">
                  Every screen will run against it. The demo factory is one click back.
                </span>
              </div>
            </section>
          )}

          <section>
            <Eyebrow>First rows, as read</Eyebrow>
            <div className="mt-5 overflow-x-auto border border-line">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line">
                    {parsed.headers.map((h, i) => (
                      <th key={i} className="whitespace-nowrap px-4 py-2.5 font-normal text-dim">
                        {h || `column ${i + 1}`}
                        {Object.entries(cols).some(([, v]) => v === i) && (
                          <span className="ml-2">
                            <Tag tone="accent">
                              {FIELD_LABELS[
                                (Object.keys(cols) as Field[]).find((k) => cols[k] === i)!
                              ]}
                            </Tag>
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {parsed.rows.slice(0, 6).map((r, i) => (
                    <tr key={i}>
                      {parsed.headers.map((_, j) => (
                        <td key={j} className="whitespace-nowrap px-4 py-2.5 font-mono text-mid">
                          {r[j] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
