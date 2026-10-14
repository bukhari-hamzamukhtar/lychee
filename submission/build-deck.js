/**
 * Pitch deck generator for LastBuy.
 *
 * Run from the scratchpad install that has pptxgenjs:
 *   node build-deck.js
 *
 * Dark slides, because the product is dark and screenshots of it sit on four
 * of the nine. Cambria headings over Arial body: both render true-to-width, so
 * the overflow check in QA can be trusted.
 */
const path = require("path");
const pptxgen = require("pptxgenjs");

const SHOTS = process.env.SHOTS_DIR || "G:/amd-hackathon/lastbuy/submission/screenshots";
const OUT = process.env.OUT_FILE || "G:/amd-hackathon/lastbuy/submission/LastBuy.pptx";

const THEME = {
  name: "LastBuy",
  headFontFace: "Cambria",
  bodyFontFace: "Arial",
  colors: {
    dk1: "E2E8F0", // text1 — light, because the deck is dark
    lt1: "0B1120", // background1
    dk2: "94A3B8", // text2 — muted
    lt2: "0F172A", // background2 — card panels
    accent1: "6366F1", // indigo, lablab's primary and ours
    accent2: "EF4444", // critical
    accent3: "10B981", // confirmed
    accent4: "A5B4FC", // soft indigo, for Evolus labels
    accent5: "1E293B", // hairline
    accent6: "64748B",
    hlink: "6366F1",
    folHlink: "94A3B8",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = "Hamza Mukhtar Bukhari";
pres.title = "LastBuy";

const C = pres.SchemeColor;
const W = 13.3;
const M = 0.7; // page margin

// ---------- layouts ----------

pres.defineSlideMaster({
  title: "TITLE",
  background: { color: THEME.colors.lt1 },
  objects: [
    {
      placeholder: {
        options: { name: "title", type: "title", x: M, y: 2.5, w: W - M * 2, h: 1.3,
          fontSize: 54, bold: true, color: C.text1 },
        text: "",
      },
    },
    {
      placeholder: {
        options: { name: "body", type: "body", x: M, y: 3.9, w: W - M * 2 - 2.2, h: 1.6,
          fontSize: 20, color: C.text2, lineSpacingMultiple: 1.25 },
        text: "",
      },
    },
  ],
});

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: THEME.colors.lt1 },
  objects: [
    {
      placeholder: {
        options: { name: "title", type: "title", x: M, y: 0.55, w: W - M * 2, h: 0.85,
          fontSize: 36, bold: true, color: C.text1, align: "left" },
        text: "",
      },
    },
  ],
  slideNumber: { x: W - 0.85, y: 6.95, fontSize: 10, color: THEME.colors.accent6, fontFace: "Arial" },
});

pres.defineSlideMaster({
  title: "STAT",
  background: { color: THEME.colors.lt1 },
  objects: [
    {
      placeholder: {
        options: { name: "title", type: "title", x: M, y: 0.55, w: W - M * 2, h: 0.85,
          fontSize: 36, bold: true, color: C.text1, align: "left" },
        text: "",
      },
    },
  ],
  slideNumber: { x: W - 0.85, y: 6.95, fontSize: 10, color: THEME.colors.accent6, fontFace: "Arial" },
});

// ---------- helpers ----------

/** Panel card. The repeated motif across the deck; no edge stripes anywhere. */
function card(slide, { x, y, w, h, name }) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: THEME.colors.lt2 },
    line: { color: THEME.colors.accent5, width: 1 },
    objectName: name,
  });
}

function stat(slide, { x, y, w, label, value, sub, tone, valueSize = 34 }) {
  card(slide, { x, y, w, h: 1.75, name: `stat-${label}` });
  slide.addText(label.toUpperCase(), {
    isTextBox: true, x: x + 0.25, y: y + 0.18, w: w - 0.5, h: 0.3,
    fontSize: 11, color: THEME.colors.accent6, charSpacing: 1, margin: 0,
  });
  slide.addText(value, {
    isTextBox: true, x: x + 0.25, y: y + 0.52, w: w - 0.5, h: 0.72,
    fontSize: valueSize, bold: true, color: tone || THEME.colors.dk1, margin: 0,
  });
  if (sub) {
    slide.addText(sub, {
      isTextBox: true, x: x + 0.25, y: y + 1.26, w: w - 0.5, h: 0.32,
      fontSize: 12, color: THEME.colors.accent6, margin: 0,
    });
  }
}

function bullets(slide, items, { x, y, w, h, size = 16, gap = 10 }) {
  slide.addText(
    items.map((t, i) => ({
      text: t,
      options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: gap },
    })),
    { isTextBox: true, x, y, w, h, fontSize: size, color: C.text1, lineSpacingMultiple: 1.2 },
  );
}

// ================= SLIDES =================

pres.addSection({ title: "Opening" });

// 1 — title
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Opening" });
  s.addText("LastBuy", { placeholder: "title" });
  s.addText(
    "A supplier gives you 34 days. After that, the part can never be bought again.",
    { placeholder: "body" },
  );
  s.addText("AMD Developer Hackathon: ACT III   ·   Intelligent Industry   ·   Evolus Business Agents", {
    isTextBox: true, x: M, y: 6.4, w: W - M * 2, h: 0.4,
    fontSize: 13, color: THEME.colors.accent6, margin: 0,
  });
  s.addNotes("Component obsolescence. Say the problem, not the stack.");
}

pres.addSection({ title: "Problem" });

// 2 — the problem
{
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Problem" });
  s.addText("Every factory gets these, and nobody can read them", { placeholder: "title" });

  card(s, { x: M, y: 1.7, w: 6.0, h: 4.3, name: "notice" });
  s.addText("PRODUKT-ABKUENDIGUNG (PDN 26_4471)", {
    isTextBox: true, x: M + 0.3, y: 1.95, w: 5.4, h: 0.3,
    fontSize: 13, bold: true, color: THEME.colors.accent1, fontFace: "Courier New", margin: 0,
  });
  s.addText(
    "wir informieren Sie, dass das Bauteil ADUM1201ARZ\n(Dual-Channel Digital-Isolator) abgekuendigt wird.\n\nLetzter Bestelltermin (Last Time Buy):\n17. November 2026\n\nEin direkter Ersatz ist derzeit nicht verfuegbar.",
    {
      isTextBox: true, x: M + 0.3, y: 2.4, w: 5.4, h: 3.2,
      fontSize: 13, color: THEME.colors.dk2, fontFace: "Courier New",
      lineSpacingMultiple: 1.3, margin: 0,
    },
  );

  s.addText("Then someone works out, by hand:", {
    isTextBox: true, x: 7.1, y: 1.75, w: W - 7.1 - M, h: 0.35,
    fontSize: 15, bold: true, color: C.text1, margin: 0,
  });
  bullets(
    s,
    [
      "Which finished products contain it, at every BOM level",
      "How many go into each one, by every route",
      "Which customers hold supply contracts",
      "Whether a certification names it as critical",
      "How many weeks of stock are left",
      "How many to buy before the door closes",
    ],
    { x: 7.1, y: 2.25, w: W - 7.1 - M, h: 3.0, size: 15, gap: 9 },
  );
  s.addText("Days of work, across several people, in spreadsheets.", {
    isTextBox: true, x: 7.1, y: 5.4, w: W - 7.1 - M, h: 0.6,
    fontSize: 16, italic: true, color: THEME.colors.accent1, margin: 0,
  });
  s.addNotes("Let the German sit on screen. The language barrier is the real obstacle.");
}

pres.addSection({ title: "Finding" });

// 3 — the finding
{
  const s = pres.addSlide({ masterName: "STAT", sectionTitle: "Finding" });
  s.addText("What nobody knew", { placeholder: "title" });

  stat(s, { x: M, y: 1.75, w: 2.8, label: "Last buy in", value: "34 days" });
  stat(s, { x: M + 3.0, y: 1.75, w: 2.8, label: "Stock runway", value: "4.7 wk",
    sub: "lead time 26 wk", tone: THEME.colors.accent2 });
  stat(s, { x: M + 6.0, y: 1.75, w: 2.8, label: "Must buy", value: "504,798", sub: "EUR 1,433,626" });
  stat(s, { x: M + 9.0, y: 1.75, w: 2.9, label: "Revenue at risk", value: "EUR 9.06M",
    sub: "per year", valueSize: 27 });

  card(s, { x: M, y: 3.9, w: W - M * 2, h: 1.5, name: "finding" });
  s.addText(
    [
      { text: "They were already 21 weeks short — and nothing in their process would have said so.", options: { bold: true, color: THEME.colors.accent2, breakLine: true } },
      { text: "Four point seven weeks of cover against a twenty-six week lead time. That is true today, independently of the deadline in the letter.", options: { color: THEME.colors.dk2 } },
    ],
    { isTextBox: true, x: M + 0.35, y: 4.15, w: W - M * 2 - 0.7, h: 1.0, fontSize: 17, lineSpacingMultiple: 1.3 },
  );

  s.addText("ADUM1201ARZ · dual-channel digital isolator · reaches 5 products through 3 assemblies by 7 distinct BOM paths", {
    isTextBox: true, x: M, y: 5.7, w: W - M * 2, h: 0.4,
    fontSize: 13, color: THEME.colors.accent6, margin: 0,
  });
  s.addNotes("This slide is the pitch. Pause on 4.7 against 26.");
}

pres.addSection({ title: "How" });

// 4 — pipeline
{
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "How" });
  s.addText("Twenty seconds, end to end", { placeholder: "title" });

  const steps = [
    ["Evolus", "translate + doc-structure", "the notice, in any language", THEME.colors.accent4],
    ["Engine", "propagate through the BOM", "exact arithmetic, no model", THEME.colors.accent1],
    ["AMD", "write the impact memo", "open model on AMD GPUs", THEME.colors.accent2],
    ["Evolus", "agent rules on certification", "cites the clause", THEME.colors.accent4],
    ["Evolus", "draft order + customer notice", "nothing is sent", THEME.colors.accent4],
  ];
  const cw = 2.28, gapx = 0.17;
  steps.forEach((st, i) => {
    const x = M + i * (cw + gapx);
    card(s, { x, y: 2.0, w: cw, h: 2.5, name: `step-${i}` });
    s.addText(st[0].toUpperCase(), {
      isTextBox: true, x: x + 0.2, y: 2.2, w: cw - 0.4, h: 0.28,
      fontSize: 10, bold: true, color: st[3], charSpacing: 1, margin: 0,
    });
    s.addText(st[1], {
      isTextBox: true, x: x + 0.2, y: 2.58, w: cw - 0.4, h: 1.0,
      fontSize: 14, bold: true, color: C.text1, margin: 0, lineSpacingMultiple: 1.15,
    });
    s.addText(st[2], {
      isTextBox: true, x: x + 0.2, y: 3.65, w: cw - 0.4, h: 0.7,
      fontSize: 11, color: THEME.colors.accent6, margin: 0, lineSpacingMultiple: 1.15,
    });
  });

  card(s, { x: M, y: 4.85, w: W - M * 2, h: 1.25, name: "gate" });
  s.addText(
    [
      { text: "Then it stops.  ", options: { bold: true, color: THEME.colors.accent3 } },
      { text: "A person commits the spend. The agent prepares the decision; it does not take it.", options: { color: THEME.colors.dk2 } },
    ],
    { isTextBox: true, x: M + 0.35, y: 5.25, w: W - M * 2 - 0.7, h: 0.5, fontSize: 17 },
  );
  s.addNotes("Five stages, about 9 Evolus credits and $0.00012 of AMD inference per run.");
}

// 5 — why no LLM in the engine
{
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "How" });
  s.addText("The engine has no language model in it", { placeholder: "title" });

  card(s, { x: M, y: 1.7, w: 6.4, h: 3.1, name: "paths" });
  s.addText("ADUM1201ARZ reaches MD-7500 twice", {
    isTextBox: true, x: M + 0.3, y: 1.95, w: 5.8, h: 0.3,
    fontSize: 14, bold: true, color: C.text1, margin: 0,
  });
  s.addText(
    "ADUM1201ARZ  ->  ASM-GATE-D  ->  ASM-PWR-A  ->  MD-7500\nADUM1201ARZ  ->  ASM-CTRL-B  ->  MD-7500",
    {
      isTextBox: true, x: M + 0.3, y: 2.45, w: 5.8, h: 0.9,
      fontSize: 12, color: THEME.colors.accent1, fontFace: "Courier New",
      lineSpacingMultiple: 1.4, margin: 0,
    },
  );
  s.addText(
    "2 isolators per gate module x 3 modules per power board x 2 boards, plus 1 on the control board = 13 per unit.",
    {
      isTextBox: true, x: M + 0.3, y: 3.5, w: 5.8, h: 1.0,
      fontSize: 13, color: THEME.colors.dk2, margin: 0, lineSpacingMultiple: 1.25,
    },
  );

  bullets(
    s,
    [
      "A bill of materials is a directed graph. Propagation is exact arithmetic.",
      "Quantity sums over every route — a part can reach one product twice.",
      "Ask a language model to do this and it invents quantities.",
      "Every path is printed, so any number can be checked by hand in seconds.",
    ],
    { x: 7.45, y: 1.85, w: W - 7.45 - M, h: 2.9, size: 15, gap: 11 },
  );

  card(s, { x: M, y: 5.05, w: W - M * 2, h: 1.1, name: "split" });
  s.addText(
    "The graph decides what is affected. The model reads, rules and writes. It is never asked for a number.",
    { isTextBox: true, x: M + 0.35, y: 5.35, w: W - M * 2 - 0.7, h: 0.5,
      fontSize: 17, italic: true, color: THEME.colors.accent1, margin: 0 },
  );
  s.addNotes("This is the originality argument. Everyone else built RAG over documents.");
}

pres.addSection({ title: "Agent" });

// 6 — the agent
{
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Agent" });
  s.addText("An agent that knows what it does not know", { placeholder: "title" });

  card(s, { x: M, y: 1.7, w: 5.9, h: 2.0, name: "cites" });
  s.addText("It cites the clause", {
    isTextBox: true, x: M + 0.3, y: 1.92, w: 5.3, h: 0.3,
    fontSize: 13, bold: true, color: THEME.colors.accent4, margin: 0,
  });
  s.addText(
    "\u201CSubstitution re-opens EN 61800-3 under clause 6.3.2 and UL 61800-5-1 under clause 4.4. Clause 6.4.1 requires re-tested radiated and conducted emissions per affected product.\u201D",
    { isTextBox: true, x: M + 0.3, y: 2.3, w: 5.3, h: 1.25,
      fontSize: 13, color: C.text1, margin: 0, lineSpacingMultiple: 1.25 },
  );

  card(s, { x: 7.0, y: 1.7, w: W - 7.0 - M, h: 2.0, name: "refuses" });
  s.addText("And it refuses what it cannot ground", {
    isTextBox: true, x: 7.3, y: 1.92, w: 5.0, h: 0.3,
    fontSize: 13, bold: true, color: THEME.colors.accent3, margin: 0,
  });
  s.addText(
    "\u201CThe documents contain no thermal derating curve for this part. You need the manufacturer datasheet, or review by a qualified engineer.\u201D",
    { isTextBox: true, x: 7.3, y: 2.3, w: 5.0, h: 1.25,
      fontSize: 13, color: C.text1, margin: 0, lineSpacingMultiple: 1.25 },
  );

  bullets(
    s,
    [
      "Runs on the AMD Token Factory endpoint connected to the Evolus workspace — not a model the platform chose",
      "Answers only from the company's own approval records and obsolescence procedure",
      "Instructed that it may not introduce a part number, date, quantity or cost of its own",
    ],
    { x: M, y: 4.0, w: W - M * 2, h: 1.7, size: 15, gap: 11 },
  );

  s.addText("That refusal is the feature. It is what you need before anything goes near a EUR 1.4M purchase order.", {
    isTextBox: true, x: M, y: 5.85, w: W - M * 2, h: 0.5,
    fontSize: 16, italic: true, color: THEME.colors.accent1, margin: 0,
  });
  s.addNotes("Do not cut this from the video. It is the trust argument.");
}

pres.addSection({ title: "Product" });

// 7 — the product, with callouts rather than a stretched screenshot
{
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Product" });
  s.addText("Every figure traceable, on one screen", { placeholder: "title" });

  s.addImage({
    path: path.join(SHOTS, "02-impact.jpg"),
    x: M, y: 1.65, w: 7.4, h: 4.67,
    objectName: "impact-screenshot",
  });

  const notes = [
    ["Four numbers, not a dashboard", "Days remaining, stock runway, quantity to buy, revenue exposed."],
    ["The path under every product", "ADUM1201ARZ to ASM-GATE-D to ASM-PWR-A to MD-7500. Check the 13 by hand."],
    ["Risk before any notice", "Parts scored from graph position and supplier history, left column."],
  ];
  let y = 1.8;
  notes.forEach(([h, b], i) => {
    card(s, { x: 8.35, y, w: W - 8.35 - M, h: 1.42, name: `note-${i}` });
    s.addText(h, {
      isTextBox: true, x: 8.6, y: y + 0.2, w: W - 8.35 - M - 0.5, h: 0.32,
      fontSize: 14, bold: true, color: THEME.colors.accent1, margin: 0,
    });
    s.addText(b, {
      isTextBox: true, x: 8.6, y: y + 0.56, w: W - 8.35 - M - 0.5, h: 0.78,
      fontSize: 12, color: THEME.colors.dk2, margin: 0, lineSpacingMultiple: 1.2,
    });
    y += 1.58;
  });
  s.addNotes("The paths are the point. Any number on this screen can be checked by hand.");
}

// 8 — what a run costs, drawn natively so it stays crisp
{
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Product" });
  s.addText("What each stage cost, on every run", { placeholder: "title" });

  const rows = [
    ["Evolus", "translate notice", "4.3 s", "2.06 credits"],
    ["Evolus", "extract fields", "4.3 s", "2.79 credits"],
    ["Engine", "propagate through BOM", "0.0 s", "free, local"],
    ["AMD", "write impact memo", "10.5 s", "$0.000118"],
    ["Evolus", "draft supplier order", "3.7 s", "1.96 credits"],
    ["Evolus", "draft customer notice", "3.0 s", "1.84 credits"],
    ["Evolus", "rule on certification impact", "10.8 s", "agent, on AMD"],
  ];
  const tone = { Evolus: THEME.colors.accent4, AMD: THEME.colors.accent1, Engine: THEME.colors.accent6 };

  let y = 1.75;
  rows.forEach((r, i) => {
    card(s, { x: M, y, w: W - M * 2, h: 0.54, name: `row-${i}` });
    s.addText(r[0].toUpperCase(), {
      isTextBox: true, x: M + 0.25, y: y + 0.15, w: 1.1, h: 0.26,
      fontSize: 10, bold: true, color: tone[r[0]], charSpacing: 1, margin: 0,
    });
    s.addText(r[1], {
      isTextBox: true, x: M + 1.5, y: y + 0.13, w: 6.0, h: 0.3,
      fontSize: 14, color: C.text1, margin: 0,
    });
    s.addText(r[2], {
      isTextBox: true, x: 9.2, y: y + 0.14, w: 1.1, h: 0.28,
      fontSize: 13, color: THEME.colors.dk2, align: "right", margin: 0,
    });
    s.addText(r[3], {
      isTextBox: true, x: 10.5, y: y + 0.14, w: W - 10.5 - M - 0.25, h: 0.28,
      fontSize: 13, color: THEME.colors.accent6, align: "right", margin: 0,
    });
    y += 0.64;
  });

  s.addText(
    [
      { text: "About 20 seconds, 9 Evolus credits and $0.00012.  ", options: { bold: true, color: THEME.colors.accent1 } },
      { text: "A buyer deciding whether to run this on every incoming notice needs that number.", options: { color: THEME.colors.dk2 } },
    ],
    { isTextBox: true, x: M, y: 6.45, w: W - M * 2, h: 0.5, fontSize: 15 },
  );
  s.addNotes("Memo and both drafts run concurrently, so wall clock is under the sum.");
}

// 9 — the upload, which is what makes it a product rather than a demo
{
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Product" });
  s.addText("Drop in a notice you have never seen", { placeholder: "title" });

  s.addImage({
    path: path.join(SHOTS, "01-inbox.jpg"),
    x: M, y: 1.65, w: 7.4, h: 4.67,
    objectName: "inbox-screenshot",
  });

  const notes = [
    ["MinerU, on AMD GPUs", "A PDF or a photo of one, in any language. It takes a base64 data URI, so nothing has to be hosted first."],
    ["Reconciled, not trusted", "Part numbers are matched against the real BOM. A notice naming nothing you build is rejected, not assessed."],
    ["17 seconds, $0.00006", "Plus about two Evolus credits. Cheap enough to run on every notice that arrives."],
  ];
  let y = 1.8;
  notes.forEach(([h, b], i) => {
    card(s, { x: 8.35, y, w: W - 8.35 - M, h: 1.42, name: `up-${i}` });
    s.addText(h, {
      isTextBox: true, x: 8.6, y: y + 0.2, w: W - 8.35 - M - 0.5, h: 0.32,
      fontSize: 14, bold: true, color: THEME.colors.accent1, margin: 0,
    });
    s.addText(b, {
      isTextBox: true, x: 8.6, y: y + 0.56, w: W - 8.35 - M - 0.5, h: 0.8,
      fontSize: 11.5, color: THEME.colors.dk2, margin: 0, lineSpacingMultiple: 1.2,
    });
    y += 1.58;
  });
  s.addNotes("This is the difference between a dashboard and a product you can put work into.");
}

pres.addSection({ title: "Case" });

// 9 — business case + stack
{
  const s = pres.addSlide({ masterName: "STAT", sectionTitle: "Case" });
  s.addText("People already pay for this, badly", { placeholder: "title" });

  stat(s, { x: M, y: 1.7, w: 3.85, label: "Per assessment", value: "$0.00012", sub: "AMD inference, plus 9 Evolus credits" });
  stat(s, { x: M + 4.05, y: 1.7, w: 3.85, label: "Time", value: "Days to 20s", sub: "three people to none" });
  stat(s, { x: M + 8.1, y: 1.7, w: 3.8, label: "On one part", value: "EUR 9.06M", sub: "annual revenue protected" });

  card(s, { x: M, y: 3.75, w: 6.0, h: 2.4, name: "market" });
  s.addText("The category exists", {
    isTextBox: true, x: M + 0.3, y: 3.98, w: 5.4, h: 0.3,
    fontSize: 14, bold: true, color: THEME.colors.accent1, margin: 0,
  });
  s.addText(
    "SiliconExpert, Z2Data and IHS sell obsolescence data today, and manufacturers employ obsolescence managers. That is the proof of willingness to pay.\n\nEvery one of them is a database you search. This is the first that reads the incoming notice and tells you what breaks.",
    { isTextBox: true, x: M + 0.3, y: 4.35, w: 5.4, h: 1.7,
      fontSize: 13, color: THEME.colors.dk2, margin: 0, lineSpacingMultiple: 1.3 },
  );

  card(s, { x: 7.1, y: 3.75, w: W - 7.1 - M, h: 2.4, name: "stack" });
  s.addText("Built on", {
    isTextBox: true, x: 7.4, y: 3.98, w: 4.9, h: 0.3,
    fontSize: 14, bold: true, color: THEME.colors.accent1, margin: 0,
  });
  s.addText(
    [
      { text: "AMD Token Factory  ", options: { bold: true, color: C.text1 } },
      { text: "— every model call, on AMD GPUs", options: { color: THEME.colors.dk2, breakLine: true } },
      { text: "Evolus  ", options: { bold: true, color: C.text1 } },
      { text: "— agent on that same AMD endpoint, plus translate, doc-structure and email", options: { color: THEME.colors.dk2, breakLine: true } },
      { text: "Impact engine  ", options: { bold: true, color: C.text1 } },
      { text: "— TypeScript, deterministic, auditable", options: { color: THEME.colors.dk2 } },
    ],
    { isTextBox: true, x: 7.4, y: 4.35, w: 4.9, h: 1.7, fontSize: 13, lineSpacingMultiple: 1.35 },
  );
  s.addNotes("Close on the number. No thank-you slide.");
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})();
