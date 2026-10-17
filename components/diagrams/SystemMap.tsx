"use client";

/**
 * What talks to what.
 *
 * The question a reader has in the first ten seconds is "where does my data go,
 * and who runs the models". Prose answers it slowly. This answers it at a
 * glance: two things you supply, one browser, three services behind it, and the
 * one box that never calls a model at all.
 *
 * Laid out top to bottom because it is a stack, not a journey, and because a
 * vertical layout leaves room beside each arrow for a label — an earlier
 * left-to-right version had the labels colliding with the boxes, which reads as
 * noise rather than information.
 *
 * Every stroke is currentColor so it inherits the page in both themes. The only
 * literal hue is the accent, and it marks exactly one thing: the path a notice
 * actually travels. The dashes march along that path and nothing else moves.
 */

/** SVG text does not wrap, so a sub-label is given as lines. */
function Node({
  x,
  y,
  w,
  h,
  title,
  lines = [],
  accent = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines?: string[];
  accent?: boolean;
}) {
  return (
    <g className={accent ? "text-accent" : undefined}>
      <rect x={x} y={y} width={w} height={h} className="fill-none stroke-current" strokeWidth={1} />
      <text x={x + 11} y={y + 19} className="fill-current text-[11.5px]" style={{ fontWeight: 500 }}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={l} x={x + 11} y={y + 34 + i * 13} className="fill-current text-[9.5px] opacity-65">
          {l}
        </text>
      ))}
    </g>
  );
}

function Flow({ d, dashed = false }: { d: string; dashed?: boolean }) {
  return (
    <path
      d={d}
      className="fill-none stroke-current text-accent diagram-flow"
      strokeWidth={1}
      strokeDasharray={dashed ? "4 4" : "5 4"}
      markerEnd="url(#sysArrow)"
    />
  );
}

function Plain({ d }: { d: string }) {
  return (
    <path
      d={d}
      className="fill-none stroke-current"
      strokeWidth={1}
      opacity={0.5}
      markerEnd="url(#sysArrow)"
    />
  );
}

function Label({
  x,
  y,
  children,
  anchor = "middle",
  accent = false,
}: {
  x: number;
  y: number;
  children: string;
  anchor?: "start" | "middle" | "end";
  accent?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className={`fill-current text-[9.5px] ${accent ? "text-accent" : ""}`}
      opacity={accent ? 0.95 : 0.6}
    >
      {children}
    </text>
  );
}

export function SystemMap() {
  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 500 404"
        className="h-auto w-full text-fg"
        role="img"
        aria-label="A supplier notice and your bill of materials go into LastBuy in the browser. From there it calls AMD Instinct for OCR and generation, Evolus for the certification agent, and runs its own impact engine in process with no model. The answer comes back to the browser."
      >
        <defs>
          <marker
            id="sysArrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M0 1 L7 4 L0 7 z" className="fill-current" />
          </marker>
        </defs>

        {/* ---------------------------------------------------- you supply */}
        <text x={0} y={10} className="fill-current text-[9px] uppercase tracking-[0.18em] opacity-50">
          You supply
        </text>

        <Node x={0} y={20} w={218} h={48} title="A supplier notice" lines={["PDF, a scan, or a photo"]} accent />
        <Node x={252} y={20} w={218} h={48} title="Your bill of materials" lines={["CSV from any PLM or ERP"]} />

        <Flow d="M109 68 L109 92" />
        <Label x={101} y={84} anchor="end" accent>upload</Label>

        <Plain d="M361 68 L361 92" />
        <Label x={369} y={84} anchor="start">loaded once</Label>

        {/* join into the app */}
        <path d="M109 92 L361 92" className="fill-none stroke-current" strokeWidth={1} opacity={0.4} />
        <Flow d="M235 92 L235 116" />

        {/* ------------------------------------------------------- the app */}
        <Node x={145} y={116} w={180} h={48} title="LastBuy" lines={["in your browser"]} />

        {/* --------------------------------------------------- the services */}
        <path d="M235 164 L235 190" className="fill-none stroke-current" strokeWidth={1} opacity={0.4} />
        <path d="M74 190 L396 190" className="fill-none stroke-current" strokeWidth={1} opacity={0.4} />

        <Flow d="M74 190 L74 240" />
        <Plain d="M235 190 L235 240" />
        <Plain d="M396 190 L396 240" />

        <Label x={74} y={212} accent>reads, writes</Label>
        <Label x={235} y={212}>rules on certificates</Label>
        <Label x={396} y={212}>traverses</Label>

        <text x={0} y={234} className="fill-current text-[9px] uppercase tracking-[0.18em] opacity-50">
          Behind it
        </text>

        <Node
          x={1}
          y={240}
          w={146}
          h={64}
          title="AMD Instinct"
          lines={["MinerU2.5-Pro", "Gemma-4-31B-IT"]}
          accent
        />
        <Node
          x={162}
          y={240}
          w={146}
          h={64}
          title="Evolus · lychee"
          lines={["agent · AI Tools", "knowledge library"]}
        />
        <Node
          x={323}
          y={240}
          w={146}
          h={64}
          title="Impact engine"
          lines={["lib/graph.ts", "no model at all"]}
        />

        {/* the answer, back to the browser, around the outside */}
        <Flow dashed d="M74 304 L74 334 L486 334 L486 140 L325 140" />
        <Label x={280} y={328} accent>what breaks, and what it costs</Label>

        {/* ------------------------------------------------ the claim itself */}
        <line x1={0} y1={360} x2={500} y2={360} className="stroke-current" strokeWidth={1} opacity={0.2} />
        <text x={0} y={379} className="fill-current text-[10.5px] opacity-70">
          Models read documents and write the memo.
        </text>
        <text x={0} y={396} className="fill-current text-[10.5px]" style={{ fontWeight: 500 }}>
          The money is a graph walk. No model touches it.
        </text>
      </svg>

      <figcaption className="mt-5 text-[12.5px] leading-relaxed text-dim">
        Two things you supply, one browser, three services behind it — and the box that
        produces the numbers never calls a model.
      </figcaption>
    </figure>
  );
}
