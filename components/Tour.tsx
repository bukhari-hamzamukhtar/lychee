"use client";

/**
 * What the thing actually looks like, before you have put anything into it.
 *
 * The workspace used to open with three supplier notices and a countdown
 * already running, as if the person had received them. That is a lie told for
 * the sake of a demo, and it reads as one: you land on a deadline for a part
 * you never ordered and spend the first minute working out whose data this is.
 *
 * So the worked example lives here instead, on the landing page, where it is
 * plainly an example and is labelled as one. Every figure below is real output
 * from the engine running on the demo factory — the same traversal the app
 * does — rather than numbers chosen to look good.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { Eyebrow } from "./ui";

function Screen({
  tab,
  children,
}: {
  tab: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line">
      {/* A plain title strip, so each block reads as a screen rather than a table. */}
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-line-bright" />
        <span className="text-[11.5px] uppercase tracking-[0.16em] text-dim">{tab}</span>
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </div>
  );
}

function Step({
  n,
  title,
  line,
  children,
}: {
  n: string;
  title: string;
  line: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-7 border-t border-line py-12 lg:grid-cols-[minmax(0,34ch)_minmax(0,1fr)] lg:gap-16">
      <div>
        <Eyebrow>{n}</Eyebrow>
        <h3 className="mt-3.5 text-[21px] font-normal leading-snug tracking-tight">{title}</h3>
        <p className="mt-3 text-[14.5px] leading-relaxed text-mid">{line}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const Row = ({
  left,
  sub,
  right,
  tone,
}: {
  left: string;
  sub?: string;
  right: string;
  tone?: "crit" | "warn";
}) => (
  <div className="flex items-baseline justify-between gap-5 border-b border-line py-2.5 last:border-0">
    <span className="min-w-0">
      <span className="block truncate font-mono text-[12.5px] text-fg">{left}</span>
      {sub && <span className="mt-0.5 block truncate text-[11.5px] text-dim">{sub}</span>}
    </span>
    <span
      className={`shrink-0 whitespace-nowrap text-[12.5px] tabular-nums ${
        tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn" : "text-mid"
      }`}
    >
      {right}
    </span>
  </div>
);

export function Tour() {
  const { setDemo } = useWorkspace();
  const router = useRouter();

  return (
    <section id="tour" className="scroll-mt-16 border-b border-line">
      <div className="mx-auto max-w-[1320px] px-8 py-24">
        <Eyebrow>A worked example</Eyebrow>
        <h2 className="mt-5 max-w-[26ch] text-[clamp(1.6rem,2.9vw,2.3rem)] font-normal leading-[1.15] tracking-[-0.02em]">
          One notice arrives. Here is everything it touches.
        </h2>
        <p className="mt-5 max-w-[62ch] text-[15.5px] leading-relaxed text-mid">
          A demo factory: five products, sixteen components, a supplier letter about one
          of them. Your own workspace starts empty — nothing below is in it until you put
          something there.
        </p>

        <Step
          n="01"
          title="A supplier sends a letter"
          line="A PDF or a scan, in any language. It is read on AMD GPUs, and the part numbers in it are matched against your bill of materials. If it names nothing you build, it is rejected rather than guessed at."
        >
          <Screen tab="Notices">
            <Row
              left="PCN-ADI-2026-4471"
              sub="Analog Devices · ADUM1201ARZ · end of life"
              right="34d to last buy"
              tone="crit"
            />
            <Row
              left="PCN-TDK-2026-0912"
              sub="TDK-Lambda · TLP2361 · product change"
              right="168d to last buy"
            />
            <Row
              left="PCN-INF-2026-7733"
              sub="Infineon · IKW40N120H3 · end of life"
              right="259d to last buy"
            />
          </Screen>
        </Step>

        <Step
          n="02"
          title="The graph says what breaks"
          line="Not a model — a traversal. One isolator sits under five finished products, so the exposure is the revenue of all five. Every figure here is arithmetic you can replay."
        >
          <Screen tab="Notices → ADUM1201ARZ">
            <Row left="Reaches" sub="finished products built from it" right="5 products" />
            <Row left="Stock on hand" sub="14,200 units · 26 week lead time" right="21 wk cover" tone="warn" />
            <Row left="Last-time buy" sub="to cover the contracted service horizon" right="504,798 units" />
            <Row left="What that order costs" sub="at standard cost" right="EUR 1,433,626" />
            <Row
              left="Revenue exposed if it is missed"
              sub="across all five products"
              right="EUR 9,058,546/yr"
              tone="crit"
            />
          </Screen>
        </Step>

        <Step
          n="03"
          title="Every part is scored before any letter arrives"
          line="Sole-sourced, long lead time, deep in the bill of materials: the components most likely to hurt are ranked whether or not anyone has written to you about them yet."
        >
          <Screen tab="Parts">
            <Row left="ADUM1201ARZ" sub="Digital isolator · sole sourced · 26 wk" right="risk 85" tone="crit" />
            <Row left="IKW40N120H3" sub="IGBT 1200 V 40 A · 1 alternative · 32 wk" right="risk 79" tone="warn" />
            <Row left="ACS712ELCTR-20A" sub="Hall current sensor · 1 alternative · 24 wk" right="risk 78" tone="warn" />
            <Row left="B32774D8106K000" sub="Film capacitor · 1 alternative · 28 wk" right="risk 48" />
          </Screen>
        </Step>

        <Step
          n="04"
          title="And what it means for the business"
          line="Products carry the risk of their most exposed component. That is the number a procurement lead has to defend, so it is the number on the screen."
        >
          <Screen tab="Products">
            <Row left="PSU-240" sub="Industrial PSU 240 W" right="EUR 4,321,296/yr" />
            <Row left="MD-3000" sub="Motor Drive 3 kW" right="EUR 2,273,249/yr" />
            <Row left="MD-7500" sub="Motor Drive 7.5 kW" right="EUR 1,658,569/yr" />
            <Row left="HMI-7" sub="Operator Panel 7 inch" right="EUR 613,947/yr" />
            <Row left="SRV-100" sub="Servo Controller" right="EUR 191,486/yr" />
          </Screen>
        </Step>

        <Step
          n="05"
          title="Ask it anything, and check the answer"
          line="Drop in as many documents as you like and ask across all of them at once. Every claim says where it came from: a filename if it was read from a document, the engine if it was computed."
        >
          <Screen tab="Ask">
            <p className="text-[11.5px] uppercase tracking-[0.16em] text-dim">You</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg">
              What does this notice change, and which of my parts does it touch?
            </p>
            <p className="mt-5 text-[11.5px] uppercase tracking-[0.16em] text-dim">Vigil</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-mid">
              It is a process change, not a discontinuation: a switch of plating vendor,
              with no impact on form, fit or function{" "}
              <span className="text-dim">[PCN140002.pdf]</span>. Last-time buy for the
              unchanged product is 2014-02-01{" "}
              <span className="text-dim">[PCN140002.pdf]</span>. It names five components
              in your bill of materials, all under the RF front end{" "}
              <span className="text-dim">[engine]</span>.
            </p>
          </Screen>
        </Step>

        <div className="flex flex-wrap items-center gap-6 border-t border-line pt-10">
          <Link
            href="/import"
            className="border border-fg px-5 py-2.5 text-[14px] text-fg transition-opacity hover:opacity-70"
          >
            Start with your own bill of materials
          </Link>
          <button
            onClick={() => {
              setDemo(true);
              router.push("/notices");
            }}
            className="text-[14px] text-dim underline-offset-4 transition-colors hover:text-fg hover:underline"
          >
            Or load this example into the workspace
          </button>
        </div>
      </div>
    </section>
  );
}
