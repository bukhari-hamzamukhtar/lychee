"use client";

/**
 * What happens to a notice, and the branch that decides what it costs.
 *
 * This is the one diagram worth drawing carefully, because the whole design
 * argument is a fork in it. A supplier notice is a form: it ticks its own
 * category and prints its last-time-buy date beside a label. If the page says
 * all of that, nothing else needs to run. If it does not, the model answers for
 * the gap.
 *
 * The two routes are drawn as two routes rather than described as a policy,
 * with what each costs written on it. Sending everything down the lower path is
 * what took a hundred and sixty-one seconds against a sixty second limit.
 */

function Step({
  x,
  y,
  w,
  title,
  meta,
  tone = "plain",
}: {
  x: number;
  y: number;
  w: number;
  title: string;
  meta?: string;
  tone?: "plain" | "accent" | "quiet";
}) {
  const h = meta ? 52 : 38;
  return (
    <g className={tone === "accent" ? "text-accent" : undefined} opacity={tone === "quiet" ? 0.6 : 1}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        className="fill-none stroke-current"
        strokeWidth={1}
        strokeDasharray={tone === "quiet" ? "3 3" : undefined}
      />
      <text x={x + 11} y={y + (meta ? 21 : 23)} className="fill-current text-[11.5px]" style={{ fontWeight: 500 }}>
        {title}
      </text>
      {meta && (
        <text x={x + 11} y={y + 38} className="fill-current text-[10px] opacity-60">
          {meta}
        </text>
      )}
    </g>
  );
}

function Arrow({
  d,
  label,
  at,
  flow = false,
  quiet = false,
}: {
  d: string;
  label?: string;
  at?: { x: number; y: number; anchor?: "start" | "middle" | "end" };
  flow?: boolean;
  quiet?: boolean;
}) {
  return (
    <g className={flow ? "text-accent" : undefined} opacity={quiet ? 0.5 : 1}>
      <path
        d={d}
        className={`fill-none stroke-current ${flow ? "diagram-flow" : ""}`}
        strokeWidth={1}
        strokeDasharray={flow ? "5 4" : quiet ? "3 3" : undefined}
        markerEnd="url(#flowArrow)"
      />
      {label && at && (
        <text x={at.x} y={at.y} textAnchor={at.anchor ?? "middle"} className="fill-current text-[10px]" opacity={0.85}>
          {label}
        </text>
      )}
    </g>
  );
}

export function NoticeFlow() {
  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 980 340"
        className="h-auto w-full text-fg"
        role="img"
        aria-label="A notice is read by MinerU on AMD, then by deterministic readers. If the form states its category, its last-time-buy date and its part numbers, the pipeline goes straight to matching against the bill of materials in twenty-seven seconds for no credits. If anything is missing, it goes through Evolus extraction and Gemma normalisation first, which is slower."
      >
        <defs>
          <marker id="flowArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 1 L7 4 L0 7 z" className="fill-current" />
          </marker>
        </defs>

        {/* ---------- the part that always runs ---------- */}
        <Step x={0} y={96} w={116} title="The letter" meta="488 KB, scanned" tone="accent" />
        <Arrow d="M116 122 L150 122" flow />

        <Step x={150} y={96} w={140} title="MinerU2.5-Pro" meta="OCR on AMD · 27s" tone="accent" />
        <Arrow d="M290 122 L320 122" flow />

        {/* what the readers get off the page, listed where there is room for it */}
        <g className="text-accent">
          <rect x={320} y={88} width={170} height={68} className="fill-none stroke-current" strokeWidth={1} />
          <text x={331} y={108} className="fill-current text-[11.5px]" style={{ fontWeight: 500 }}>
            Read the form
          </text>
          <text x={331} y={124} className="fill-current text-[10px] opacity-60">
            ticked box · labelled date
          </text>
          <text x={331} y={137} className="fill-current text-[10px] opacity-60">
            part numbers · 0ms
          </text>
          <text x={331} y={150} className="fill-current text-[10px] opacity-60">
            lib/notice-read.ts
          </text>
        </g>

        {/* ---------- the branch ---------- */}
        <Arrow d="M490 122 L512 122" flow />
        <path d="M566 94 L620 122 L566 150 L512 122 Z" className="fill-none stroke-current" strokeWidth={1} />
        <text x={566} y={119} textAnchor="middle" className="fill-current text-[10px]">
          did the page
        </text>
        <text x={566} y={131} textAnchor="middle" className="fill-current text-[10px]">
          say it?
        </text>

        {/* yes — straight on */}
        <Arrow d="M620 122 L700 122" flow label="yes" at={{ x: 660, y: 112 }} />
        <Step x={700} y={96} w={160} title="Match the bill of materials" meta="only parts you build" tone="accent" />
        <Arrow d="M860 122 L890 122" flow />
        <Step x={890} y={96} w={78} title="Impact" tone="accent" />

        {/* no — the long way round */}
        <Arrow d="M566 150 L566 212 L628 212" label="no" at={{ x: 556, y: 186, anchor: "end" }} quiet />
        <Step x={628} y={192} w={150} title="Evolus doc-structure" meta="extract the fields · 17s" tone="quiet" />
        <Arrow d="M778 212 L812 212" quiet />
        <Step x={812} y={192} w={150} title="Gemma normalise" meta="fill the gap · up to 103s" tone="quiet" />
        <Arrow d="M962 192 L962 166 L780 166 L780 150" quiet />

        {/* ---------- what each route costs ---------- */}
        <line x1={0} y1={268} x2={980} y2={268} className="stroke-current" strokeWidth={1} opacity={0.22} />

        <g className="text-accent">
          <text x={0} y={290} className="fill-current text-[11px]" style={{ fontWeight: 500 }}>
            Form says it
          </text>
          <text x={110} y={290} className="fill-current text-[11px]">
            27s · 0 Evolus credits · $0.00 of inference
          </text>
        </g>
        <g opacity={0.6}>
          <text x={0} y={312} className="fill-current text-[11px]" style={{ fontWeight: 500 }}>
            Model needed
          </text>
          <text x={110} y={312} className="fill-current text-[11px]">
            up to 161s · over the 60s request limit · fails
          </text>
        </g>
      </svg>

      <figcaption className="mt-4 max-w-[76ch] text-[12.5px] leading-relaxed text-dim">
        A supplier notice is a form. It ticks its own category and prints its last-time-buy
        date beside a label. When the page says all of that, the lower route never runs —
        which is the difference between twenty-seven seconds and a request that times out.
      </figcaption>
    </figure>
  );
}
