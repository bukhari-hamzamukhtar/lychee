import Link from "next/link";
import { PropagationGraph } from "@/components/PropagationGraph";
import { Reveal } from "@/components/Reveal";
import { Button, Eyebrow } from "@/components/ui";

export default function Landing() {
  return (
    <div className="pb-32">
      {/* ---------------- hero ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 sm:pt-32">
          <Reveal>
            <Eyebrow>Component obsolescence</Eyebrow>
          </Reveal>
          <Reveal delay={1}>
            <h1 className="mt-6 max-w-4xl text-[clamp(2.6rem,7vw,5.2rem)] font-extrabold leading-[0.95] tracking-tightest">
              A supplier gives you
              <br />
              <span className="text-accent">34 days.</span>
            </h1>
          </Reveal>
          <Reveal delay={2}>
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-mid">
              Then the part can never be bought again. Working out what that breaks takes
              days, across several people, in spreadsheets. LastBuy does it in twenty
              seconds, and shows its working.
            </p>
          </Reveal>
          <Reveal delay={3}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button href="/notices" tone="accent">
                Open the workspace
              </Button>
              <Button href="#how" tone="quiet">
                How it works
              </Button>
            </div>
          </Reveal>
        </div>

        {/* The graph is the hero image, and it is real data. */}
        <div className="mx-auto max-w-6xl px-6 pb-20">
          <Reveal>
            <div className="border-t border-line pt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <Eyebrow>One discontinued component, propagating</Eyebrow>
                <span className="font-mono text-[11px] text-dim">ADUM1201ARZ</span>
              </div>
              <div className="mt-6 overflow-x-auto">
                <div className="min-w-[760px]">
                  <PropagationGraph partId="ADUM1201ARZ" loop />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- the problem ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 py-24 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>What arrives</Eyebrow>
            <h2 className="mt-5 text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-tight tracking-tight">
              A PDF, usually not in your language
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-mid">
              Every factory gets a stream of them. Product change notifications,
              end-of-life notices. Someone has to decide what each one means before the
              window shuts.
            </p>
          </Reveal>

          <Reveal delay={1}>
            <div className="border border-line p-6 font-mono text-[12px] leading-relaxed text-dim">
              <p className="text-mid">PRODUKT-ABKUENDIGUNG (PDN 26_4471)</p>
              <p className="mt-4">Sehr geehrter Kunde,</p>
              <p className="mt-3">
                wir informieren Sie, dass das Bauteil ADUM1201ARZ abgekuendigt wird.
              </p>
              <p className="mt-4 text-accent">
                Letzter Bestelltermin: 17. November 2026
              </p>
              <p className="mt-3">Ein direkter Ersatz ist derzeit nicht verfuegbar.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- the questions ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <Eyebrow>What has to be answered, by hand, today</Eyebrow>
          </Reveal>
          <ul className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Which products contain it", "At every level of the bill of materials, not just the top."],
              ["How many go into each", "Summed over every route — a part can reach one product twice."],
              ["Which customers are affected", "Everyone holding a supply contract for those products."],
              ["Does a certification name it", "If so, substitution reopens the approval, per product."],
              ["How many weeks of stock remain", "Against the replenishment lead time, which is usually longer."],
              ["How many to buy, by when", "Enough to cover the contracted service life. Once. Exactly."],
            ].map(([q, a], i) => (
              <Reveal key={q} delay={(i % 3) as 0 | 1 | 2} as="li" className="border border-line p-7">
                <p className="text-[15px] font-medium text-fg">{q}</p>
                <p className="mt-2.5 text-[13px] leading-relaxed text-dim">{a}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- the finding ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <Reveal>
            <Eyebrow>On the worked example</Eyebrow>
            <p className="mt-6 max-w-4xl text-[clamp(1.8rem,4.4vw,3.4rem)] font-bold leading-[1.1] tracking-tight">
              Four point seven weeks of stock, against a{" "}
              <span className="text-accent">twenty-six week</span> lead time.
            </p>
            <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-mid">
              They were already twenty-one weeks short, and nothing in their process would
              have said so. That is true today, independently of the deadline in the
              letter.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-px border border-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Products reached", "5", "through 3 assemblies"],
              ["Routes", "7", "distinct BOM paths"],
              ["Must buy", "504,798", "EUR 1,433,626"],
              ["Revenue exposed", "EUR 9.06M", "per year"],
            ].map(([label, value, sub], i) => (
              <Reveal key={label} delay={(i % 4) as 0 | 1 | 2 | 3} className="border border-line p-7">
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
                  {label}
                </div>
                <div className="mt-3 text-[30px] font-semibold leading-none tabular-nums">{value}</div>
                <div className="mt-2 text-[11px] text-dim">{sub}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- how ---------------- */}
      <section id="how" className="border-b border-line scroll-mt-16">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <Eyebrow>How a notice becomes a decision</Eyebrow>
          </Reveal>

          <ol className="mt-12 space-y-px">
            {[
              ["01", "Read", "AMD", "MinerU on AMD GPUs turns the PDF, or a photo of one, into text. It takes the file inline, so nothing has to be hosted."],
              ["02", "Extract", "Evolus", "Fields come out structured: part numbers, the last-time-buy date, any replacement."],
              ["03", "Reconcile", "Engine", "Part numbers are matched against your real bill of materials. A notice naming nothing you build is rejected, not assessed."],
              ["04", "Propagate", "Engine", "Exact arithmetic over the graph. No model touches this, because a model asked to do it invents quantities."],
              ["05", "Rule", "Evolus + AMD", "An agent on your own AMD-hosted model rules on certification impact, citing the clause, and declines what the documents do not cover."],
              ["06", "Draft", "Evolus", "The last-time-buy order and the customer notice are written, addressed to nobody, sent to nobody."],
              ["07", "Approve", "A person", "Someone commits the spend. The agent prepares the decision; it does not take it."],
            ].map(([n, title, who, body], i) => (
              <Reveal key={n} delay={(i % 3) as 0 | 1 | 2} as="li">
                <div className="group flex flex-col gap-4 border border-line p-7 transition-colors duration-200 hover:border-line-bright sm:flex-row sm:items-baseline sm:gap-10">
                  <span className="font-mono text-[12px] text-dim">{n}</span>
                  <span className="w-28 shrink-0 text-[16px] font-medium">{title}</span>
                  <span className="w-28 shrink-0 text-[11px] uppercase tracking-wider text-accent">
                    {who}
                  </span>
                  <span className="flex-1 text-[13.5px] leading-relaxed text-mid">{body}</span>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={1}>
            <p className="mt-10 max-w-2xl text-[13px] leading-relaxed text-dim">
              A complete assessment runs in about twenty seconds, for roughly nine Evolus
              credits and twelve hundredths of a cent of AMD inference. Every stage reports
              what it cost, because anyone deciding whether to run this on every incoming
              notice needs that number.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- the refusal ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 py-24 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>The part that matters</Eyebrow>
            <h2 className="mt-5 text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-tight tracking-tight">
              It knows what it does not know
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-mid">
              Ask the analyst something its documents do not cover and it says so, rather
              than producing a plausible answer. That is what you need before anything goes
              near a one-point-four-million-euro purchase order.
            </p>
          </Reveal>
          <Reveal delay={1}>
            <div className="space-y-px">
              <div className="border border-line p-6">
                <Eyebrow>Asked about a certification</Eyebrow>
                <p className="mt-4 text-[14px] leading-relaxed text-mid">
                  &ldquo;Substitution re-opens EN 61800-3 under clause 6.3.2 and UL 61800-5-1
                  under clause 4.4. Clause 6.4.1 requires re-tested radiated and conducted
                  emissions per affected product.&rdquo;
                </p>
              </div>
              <div className="border border-line p-6">
                <Eyebrow>Asked for a thermal derating curve</Eyebrow>
                <p className="mt-4 text-[14px] leading-relaxed text-mid">
                  &ldquo;The documents contain no thermal derating curve for this part. You
                  need the manufacturer datasheet, or review by a qualified engineer.&rdquo;
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- close ---------------- */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-28">
          <Reveal>
            <p className="max-w-3xl text-[clamp(1.5rem,3.4vw,2.6rem)] font-bold leading-tight tracking-tight">
              Obsolescence management is already an industry. Every tool in it is a
              database you search.
              <span className="block text-accent">
                This one reads the letter and tells you what breaks.
              </span>
            </p>
          </Reveal>
          <Reveal delay={1}>
            <div className="mt-12 flex flex-wrap items-center gap-3">
              <Button href="/notices" tone="accent">
                Open the workspace
              </Button>
              <Link
                href="/parts"
                className="text-[13px] uppercase tracking-wider text-dim transition-colors hover:text-fg"
              >
                or browse the parts at risk
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
