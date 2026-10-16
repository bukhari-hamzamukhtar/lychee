"use client";

/**
 * The difference, shown rather than claimed.
 *
 * The closing line says every other tool is a database you search. That is a
 * claim, and a claim sitting alone across half a screen is just a sentence with
 * space around it. These are the two answers side by side: what you get when
 * you look a part up, and what you get when the letter is read for you.
 *
 * The figures are the engine's own output for ADUM1201ARZ in the example
 * factory, so the comparison is not rhetorical.
 */

const LOOKUP = [
  ["Lifecycle", "NRND"],
  ["Datasheet", "rev C, 2019"],
  ["Alternates", "none qualified"],
  ["Stock", "14,200"],
] as const;

const IMPACT = [
  ["Products that stop", "5"],
  ["Revenue behind them", "€9,058,546 / yr"],
  ["Cover you actually have", "21 weeks against 26"],
  ["Days to decide", "34"],
] as const;

function Column({
  eyebrow,
  caption,
  rows,
  accent = false,
}: {
  eyebrow: string;
  caption: string;
  rows: readonly (readonly [string, string])[];
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-dim">{eyebrow}</p>
      <p className={`mt-2 text-[14px] ${accent ? "text-fg" : "text-mid"}`}>{caption}</p>
      <dl className="mt-5 border-t border-line">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-4 border-b border-line py-2.5"
          >
            <dt className="text-[12.5px] text-dim">{k}</dt>
            <dd
              className={`text-right text-[12.5px] tabular-nums ${
                accent ? "text-accent" : "text-mid"
              }`}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function TwoAnswers() {
  return (
    <div className="w-full">
      <p className="mb-6 font-mono text-[12px] text-dim">
        ADUM1201ARZ &middot; the same part, asked two ways
      </p>
      <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
        <Column
          eyebrow="Search a part number"
          caption="Facts about the component."
          rows={LOOKUP}
        />
        <Column
          eyebrow="Drop in the letter"
          caption="What it costs you to lose it."
          rows={IMPACT}
          accent
        />
      </div>
    </div>
  );
}
