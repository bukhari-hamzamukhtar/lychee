"use client";

/**
 * What is running this, stated on every screen.
 *
 * Three reviewers need to see three different things and none of them will dig
 * for it: AMD wants the endpoint its inference is served from, Google wants to
 * see that the open model is Gemma, and Evolus wants the workspace name so the
 * implementation can be found and checked. All three are facts about the
 * running system, so they belong in the running system rather than only in a
 * slide.
 *
 * Deliberately one thin line. The same instinct that put a permanent countdown
 * in the corner — announcing something nobody asked about — is what this has to
 * avoid; it states what is true and takes up almost no room doing it.
 */

const PARTS = [
  { label: "model", value: "Gemma-4-31B-IT" },
  { label: "served on", value: "AMD Instinct · developer.amd.com.cn" },
  { label: "orchestrated by", value: "Evolus · workspace lychee" },
  { label: "impact engine", value: "deterministic, no model" },
] as const;

export function RunsOn() {
  return (
    <div className="border-b border-line bg-bg-raised/60">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-1 px-8 py-1.5">
        {PARTS.map((p) => (
          <span key={p.label} className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[10px] uppercase tracking-[0.14em] text-dim">{p.label}</span>
            <span className="font-mono text-[11.5px] text-mid">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
