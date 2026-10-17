"use client";

/**
 * What survives when the window fills.
 *
 * The usual answer is a summary, and a summary is a paragraph: you cannot check
 * it, contradict it with a new document, or attach it to a part. The diagram
 * draws the alternative — the transcript is broken into claims that each carry
 * where they came from, and then the transcript is thrown away.
 *
 * The fork is the half people miss, so it is drawn rather than described: the
 * child conversation gets the claims and an empty window, which is where the
 * room comes back from.
 */

function Card({
  x,
  y,
  w,
  h,
  title,
  lines,
  accent = false,
  dashed = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines?: string[];
  accent?: boolean;
  dashed?: boolean;
}) {
  return (
    <g className={accent ? "text-accent" : undefined}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        className="fill-none stroke-current"
        strokeWidth={1}
        strokeDasharray={dashed ? "3 3" : undefined}
        opacity={dashed ? 0.55 : 1}
      />
      <text x={x + 12} y={y + 20} className="fill-current text-[11.5px]" style={{ fontWeight: 500 }}>
        {title}
      </text>
      {lines?.map((l, i) => (
        <text key={l} x={x + 12} y={y + 38 + i * 15} className="fill-current text-[10px] opacity-65">
          {l}
        </text>
      ))}
    </g>
  );
}

export function ContextGraphDiagram() {
  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 900 300"
        className="h-auto w-full text-fg"
        role="img"
        aria-label="A full conversation is distilled into claims, each carrying its subject, how it is known and which document it came from. The transcript is then discarded. Forking hands those claims to a new conversation with an empty window."
      >
        <defs>
          <marker id="ctxArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 1 L7 4 L0 7 z" className="fill-current" />
          </marker>
        </defs>

        <text x={0} y={14} className="fill-current text-[10px] uppercase tracking-[0.16em] opacity-55">
          The window fills
        </text>

        <Card
          x={0}
          y={28}
          w={186}
          h={104}
          title="The conversation"
          lines={["12 messages", "everything said, in order", "worth 4,800 tokens"]}
        />

        <path d="M186 80 L246 80" className="fill-none stroke-current diagram-flow" strokeWidth={1} strokeDasharray="5 4" markerEnd="url(#ctxArrow)" />
        <text x={216} y={72} textAnchor="middle" className="fill-current text-[10px] opacity-80">
          distil
        </text>

        <Card
          x={246}
          y={28}
          w={240}
          h={104}
          title="Claims, with where they came from"
          lines={[
            "PCN140002 — a plating change   [document]",
            "last-time buy 2014-02-01   [document]",
            "HMC311ST89 is under RF-FRONTEND   [engine]",
          ]}
          accent
        />

        {/* the transcript goes */}
        <path d="M93 132 L93 188" className="fill-none stroke-current" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} markerEnd="url(#ctxArrow)" />
        <Card x={0} y={192} w={186} h={46} title="Thrown away" dashed />
        <text x={0} y={262} className="fill-current text-[10px] opacity-60">
          A summary cannot be checked.
        </text>
        <text x={0} y={277} className="fill-current text-[10px] opacity-60">
          A claim can.
        </text>

        {/* the fork */}
        <path d="M486 80 L560 80" className="fill-none stroke-current diagram-flow" strokeWidth={1} strokeDasharray="5 4" markerEnd="url(#ctxArrow)" />
        <text x={523} y={72} textAnchor="middle" className="fill-current text-[10px] opacity-80">
          fork
        </text>

        <Card
          x={560}
          y={28}
          w={200}
          h={104}
          title="A new conversation"
          lines={["the claims, carried over", "no messages", "the window back"]}
          accent
        />

        <path d="M660 132 L660 188" className="fill-none stroke-current" strokeWidth={1} opacity={0.5} markerEnd="url(#ctxArrow)" />
        <Card x={560} y={192} w={200} h={46} title="Ask on, with what was settled" />

        <line x1={0} y1={296} x2={900} y2={296} className="stroke-current" strokeWidth={1} opacity={0.2} />
      </svg>

      <figcaption className="mt-4 max-w-[76ch] text-[12.5px] leading-relaxed text-dim">
        Nothing is remembered as conversation. Everything is remembered as a claim with a
        subject, a standing and a source — which is the part that can still be checked
        tomorrow.
      </figcaption>
    </figure>
  );
}
