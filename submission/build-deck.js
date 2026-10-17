/**
 * The LastBuy deck.
 *
 *   node submission/build-deck.js
 *
 * Twelve slides in the order relate.pptx uses: motivation with sourced numbers,
 * the problem, what already exists, a feature comparison, the product, the
 * architecture, then how it is built.
 *
 * It also borrows relate.pptx's look: content sits in rounded cards, not between
 * rules. One card per slide is the accent (red edge, pale red fill), a cream card
 * with a gold edge carries the sentence that matters, and numbered circles mark
 * steps. Where the deck talks about the pipeline, colour means something:
 *
 *   blue   a model reads or writes          (AMD, Gemma, the Evolus agent)
 *   green  plain code: rules and arithmetic (the form reader, the impact engine)
 *   gold   what the person gets back
 *
 * That split is the product's main claim — no number you act on comes from a
 * model — so it is worth a colour.
 *
 * First and last slides are dark, everything between is light, which is how the
 * product itself looks.
 *
 * Needs pptxgenjs, which is deliberately not a dependency of the app.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const OUT = process.env.OUT_FILE || path.join(__dirname, "LastBuy.pptx");
const DIAGRAMS = path.join(__dirname, "diagrams");
const ASSETS = path.join(__dirname, "assets");
const asset = (f) => path.join(ASSETS, f);
const TOTAL = 12;

/* ---------------------------------------------------------------- palette */

const C = {
  ink: "111317", mid: "3A404A", dim: "6B7280", line: "DADDE2", soft: "F6F7F9",
  red: "D62D12", redT: "FCEEEA", redD: "A12310",
  gold: "C9971C", goldT: "FBF6EA", goldD: "8A6410", goldN: "D9A92C",
  blue: "1A73E8", blueT: "EAF2FD", blueD: "1557B0",
  green: "1E8E5A", greenT: "E8F5EE", greenD: "146C43",
};
const D = {
  bg: "08090B", card: "17191E", edge: "2A2E36", deco: "121419", decoEdge: "1C1F25",
  fg: "F6F7F9", mid: "D6DBE2", dim: "9AA3AE", accent: "FF5A3D", gold: "E2B33C",
};
const SANS = "Arial";
const MONO = "Consolas";

const TONES = {
  plain: { fill: "FFFFFF", edge: C.line, pt: 1 },
  accent: { fill: C.redT, edge: C.red, pt: 1.25 },
  gold: { fill: C.goldT, edge: C.gold, pt: 1.25 },
  blue: { fill: C.blueT, edge: C.blue, pt: 1.25 },
  green: { fill: C.greenT, edge: C.green, pt: 1.25 },
  inner: { fill: "F8F5F4", edge: "E6E0DE", pt: 0.75 },
  white: { fill: "FFFFFF", edge: C.line, pt: 0.75 },
  dark: { fill: D.card, edge: D.edge, pt: 1 },
};

const pptx = new pptxgen();
// LAYOUT_WIDE is the 13.333 x 7.5in page. LAYOUT_16x9 is 10 x 5.625in, and
// using it with these coordinates pushes a third of every slide off the page.
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Hamza Bukhari";
pptx.company = "LastBuy";
pptx.title = "LastBuy";

const W = 13.333;
const H = 7.5;
const M = 0.7;
const CW = W - M * 2; // content width
const TOP = 1.45; // where content starts under the title

/* ---------------------------------------------------------------- helpers */

/** Text with no inner margin, so a box's x is exactly where its words start. */
function txt(s, text, o) {
  s.addText(text, { fontFace: SANS, color: C.ink, margin: 0, valign: "top", ...o });
}

function card(s, { x, y, w, h, tone = "plain", r = 0.12 }) {
  const t = TONES[tone];
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: r,
    fill: { color: t.fill }, line: { color: t.edge, width: t.pt },
  });
}

function circle(s, { x, y, d = 0.5, fill, color = "FFFFFF", text, size = 14 }) {
  s.addShape(pptx.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 } });
  s.addText(text, {
    x, y, w: d, h: d, fontFace: SANS, fontSize: size, bold: true, color,
    align: "center", valign: "middle", margin: 0,
  });
}

/** Small capitals over a heading, the way relate.pptx labels a card. */
function tag(s, text, { x, y, w, color = C.goldD, size = 9.5 }) {
  txt(s, text, { x, y, w, h: 0.22, fontSize: size, bold: true, charSpacing: 1, color });
}

/** Horizontal arrow with its label sitting just above it. */
function arrow(s, { x1, x2, y, color = C.dim, label, dashed = false, width = 1.5 }) {
  s.addShape(pptx.ShapeType.line, {
    x: x1, y, w: x2 - x1, h: 0,
    line: { color, width, endArrowType: "triangle", dashType: dashed ? "dash" : "solid" },
  });
  if (label) {
    txt(s, label, { x: x1 - 0.2, y: y - 0.27, w: x2 - x1 + 0.4, h: 0.22, fontSize: 9.5, color, align: "center", bold: true });
  }
}

/** Off-page decoration. Named so check-deck.js knows it is meant to hang over the edge. */
function deco(s, x, y, d) {
  s.addShape(pptx.ShapeType.ellipse, {
    x, y, w: d, h: d, objectName: "deco",
    fill: { color: D.deco }, line: { color: D.decoEdge, width: 1 },
  });
}

function image(s, file, box) {
  const p = path.join(DIAGRAMS, file);
  if (!fs.existsSync(p)) throw new Error("missing diagram " + file);
  s.addImage({ path: p, ...box });
}

/** Image at a fixed width, height from its own aspect ratio. */
function pngSize(p) {
  const b = fs.readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function imageAt(s, file, { x, y, w }) {
  const { w: pw, h: ph } = pngSize(path.join(DIAGRAMS, file));
  const h = (w * ph) / pw;
  image(s, file, { x, y, w, h });
  return h;
}

function footer(s, n, dark = false) {
  txt(s, [
    { text: "Gemma-4-31B-IT", options: { color: dark ? D.mid : C.mid } },
    { text: "  on  ", options: { color: dark ? D.dim : C.dim } },
    { text: "AMD Instinct", options: { color: dark ? D.mid : C.mid } },
    { text: "   ·   ", options: { color: dark ? D.dim : C.dim } },
    { text: "Evolus workspace lychee", options: { color: dark ? D.mid : C.mid } },
  ], { x: M, y: H - 0.48, w: 8, h: 0.24, fontFace: MONO, fontSize: 10 });
  txt(s, `${n}/${TOTAL}`, {
    x: W - M - 1.2, y: H - 0.48, w: 1.2, h: 0.24, fontSize: 11, bold: true,
    color: dark ? D.dim : C.dim, align: "right",
  });
}

/** Title, logo and footer: the frame every light slide shares. No rules. */
function frame(title, n) {
  const s = pptx.addSlide();
  s.background = { color: "FFFFFF" };
  txt(s, title, { x: M, y: 0.5, w: CW - 1.2, h: 0.62, fontSize: 30, bold: true, valign: "middle" });
  s.addImage({ path: asset("logo-ink.png"), x: W - M - 0.62, y: 0.46, w: 0.62, h: 0.565 });
  footer(s, n);
  return s;
}

/* ------------------------------------------------------------- 1. title */

{
  const s = pptx.addSlide();
  s.background = { color: D.bg };
  deco(s, -2.9, -4.3, 6.1);
  deco(s, 10.2, 4.7, 5.2);
  s.addImage({ path: asset("logo-white.png"), x: 11.86, y: 0.3, w: 1.17, h: 1.07 });

  txt(s, "LastBuy", { x: M + 0.1, y: 1.75, w: 8, h: 1.0, fontSize: 54, bold: true, color: D.fg });
  txt(s, [
    { text: "Reads a supplier's discontinuation letter and tells you ", options: { color: D.fg } },
    { text: "what it breaks, and what to buy.", options: { color: D.accent } },
  ], { x: M + 0.1, y: 2.95, w: 9.2, h: 1.1, fontSize: 24, lineSpacingMultiple: 1.15 });

  txt(s, "Hamza Bukhari", { x: M + 0.1, y: 4.35, w: 8, h: 0.34, fontSize: 16, bold: true, color: D.fg });
  txt(s, "AMD Developer Hackathon: ACT III   ·   Intelligent Industry", {
    x: M + 0.1, y: 4.72, w: 10, h: 0.3, fontSize: 13, color: D.gold,
  });

  // who it runs on, as the logos themselves
  tag(s, "RUNS ON", { x: M + 0.1, y: 5.55, w: 3, color: D.dim });
  const logos = [
    ["logo-amd.png", 163, 47, "MinerU2.5-Pro · Gemma"],
    ["logo-gemma.png", 153, 59, "Gemma-4-31B-IT"],
    ["logo-evolus.png", 1040, 326, "workspace lychee"],
  ];
  logos.forEach(([file, pw, ph, sub], i) => {
    const x = M + 0.1 + i * 2.55;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 5.85, w: 2.35, h: 1.0, rectRadius: 0.1, fill: { color: "FFFFFF" }, line: { color: "FFFFFF", width: 0 },
    });
    const lh = 0.36;
    const lw = Math.min((lh * pw) / ph, 1.9);
    s.addImage({ path: asset(file), x: x + (2.35 - lw) / 2, y: 6.0, w: lw, h: (lw * ph) / pw });
    txt(s, sub, { x, y: 6.47, w: 2.35, h: 0.24, fontSize: 9.5, color: C.mid, align: "center" });
  });
}

/* ------------------------------------------------------------ 2. motivation */

{
  const s = frame("Motivation", 2);
  const cw = (CW - 0.7) / 3;
  const stats = [
    ["756,087", "electronic components went obsolete in 2022", "Almost 50 percent more than the year before.", "accent"],
    ["82,000+", "lifecycle changes in 2023 with no notice sent at all", "One in four. Nobody wrote to say.", "plain"],
    ["$1.1M", "average cost to redesign one assembly once a part is gone", "For a whole system: $10.3 million.", "plain"],
  ];
  stats.forEach(([v, label, punch, tone], i) => {
    const x = M + i * (cw + 0.35);
    card(s, { x, y: TOP, w: cw, h: 3.45, tone });
    txt(s, v, { x: x + 0.38, y: TOP + 0.4, w: cw - 0.6, h: 0.95, fontSize: 50, bold: true, color: C.red });
    txt(s, label, { x: x + 0.38, y: TOP + 1.55, w: cw - 0.76, h: 0.75, fontSize: 15, bold: true, lineSpacingMultiple: 1.15 });
    txt(s, punch, { x: x + 0.38, y: TOP + 2.5, w: cw - 0.76, h: 0.6, fontSize: 13, color: C.mid, lineSpacingMultiple: 1.15 });
  });

  card(s, { x: M, y: 5.2, w: CW, h: 0.95, tone: "gold" });
  txt(s, "Every one of those letters lands on someone who has to work out, by hand, which products it stops. And the date does not move.", {
    x: M + 0.38, y: 5.2, w: CW - 0.76, h: 0.95, fontSize: 16, bold: true, color: C.redD, valign: "middle",
  });

  txt(s, "Sources: Z2Data, Obsolescence Trends 2024  ·  Z2Data, 2023 lifecycle analysis  ·  US Department of Commerce (BIS) and DSPO, DMSMS Cost Metrics, 2015", {
    x: M, y: 6.42, w: CW, h: 0.24, fontSize: 9.5, italic: true, color: C.dim,
  });
}

/* ------------------------------------------------ 3. problem & justification */

{
  const s = frame("Problem Statement & Justification", 3);

  card(s, { x: M, y: TOP - 0.05, w: CW, h: 0.95, tone: "gold" });
  txt(s, [
    { text: "Problem: ", options: { color: C.red } },
    { text: "A supplier's letter gives you a part number and a date. Working out which of your products it stops, and how many to buy before that date, is still done by hand.", options: { color: C.redD } },
  ], { x: M + 0.38, y: TOP - 0.05, w: CW - 0.76, h: 0.95, fontSize: 14.5, bold: true, valign: "middle", lineSpacingMultiple: 1.1 });

  // left: why it is hard
  const lw = 5.75;
  card(s, { x: M, y: 2.6, w: lw, h: 4.05, tone: "accent" });
  txt(s, "The answer is a tree, not a list.", { x: M + 0.38, y: 2.88, w: lw - 0.7, h: 0.4, fontSize: 18, bold: true, color: C.redD });
  const why = [
    "Letters come as PDFs and scans, in any language, with no common format.",
    "One part can sit under five products, through three assemblies.",
    "The order has to be in before the date. After it, the part is never sold again.",
    "Today's tools say a part is at risk. They don't read the letter, and they don't size the order.",
  ];
  txt(s, why.map((t, i) => ({
    text: t,
    options: { bullet: { indent: 16 }, breakLine: i < why.length - 1, paraSpaceAfter: 9 },
  })), { x: M + 0.38, y: 3.48, w: lw - 0.7, h: 3.0, fontSize: 13, color: C.ink, lineSpacingMultiple: 1.15 });

  // right: why this way
  const rx = M + lw + 0.45;
  const rw = CW - lw - 0.45;
  txt(s, "Justification", { x: rx, y: 2.62, w: rw, h: 0.38, fontSize: 18, bold: true, color: C.redD });
  const just = [
    ["Nothing gets triaged out.", "At about a hundredth of a cent a notice, every letter gets read, not only the ones that look important."],
    ["The answer can be checked.", "Every figure is arithmetic over your own bill of materials. Nobody has to trust a model with a million-euro order."],
    ["It works on your data.", "Bring your bill of materials as a CSV, from any system. The columns are worked out from their names."],
  ];
  just.forEach(([t, b], i) => {
    const y = 3.1 + i * 1.2;
    card(s, { x: rx, y, w: rw, h: 1.05, tone: "gold" });
    circle(s, { x: rx + 0.22, y: y + 0.27, d: 0.5, fill: C.goldN, color: C.ink, text: String(i + 1) });
    txt(s, [
      { text: t + " ", options: { bold: true, color: C.redD } },
      { text: b, options: { color: C.ink } },
    ], { x: rx + 0.92, y, w: rw - 1.12, h: 1.05, fontSize: 12, valign: "middle", lineSpacingMultiple: 1.12 });
  });
}

/* ------------------------------------------------------- 4. what exists today */

{
  const s = frame("What Exists Today & the Gap", 4);

  const cols = [
    {
      l: "A", title: "Lifecycle databases", names: "SiliconExpert, Z2Data, Accuris",
      line: "Tell you a part is at risk.",
      does: "Lifecycle status and risk scores for millions of parts.",
      misses: "Which of your products it stops, and how many to buy.",
    },
    {
      l: "B", title: "Part search", names: "Octopart, distributor sites",
      line: "Price and stock for one part number at a time.",
      does: "Finds who still sells the part, and for how much.",
      misses: "Anything about your products.",
    },
    {
      l: "C", title: "Spreadsheets and email", names: "what most teams actually use",
      line: "Accurate when someone has time. Slow when they don't.",
      does: "Whatever the person doing it knows.",
      misses: "The deadline, the week that person is busy.",
    },
  ];
  const cw = (CW - 0.6) / 3;
  cols.forEach((c, i) => {
    const x = M + i * (cw + 0.3);
    card(s, { x, y: TOP, w: cw, h: 3.9 });
    circle(s, { x: x + 0.3, y: TOP + 0.3, d: 0.55, fill: C.red, text: c.l, size: 16 });
    txt(s, c.title, { x: x + 1.02, y: TOP + 0.3, w: cw - 1.2, h: 0.55, fontSize: 17, bold: true, color: C.redD, valign: "middle" });
    txt(s, c.names, { x: x + 0.3, y: TOP + 1.05, w: cw - 0.6, h: 0.26, fontSize: 11, italic: true, color: C.dim });
    txt(s, c.line, { x: x + 0.3, y: TOP + 1.4, w: cw - 0.6, h: 0.55, fontSize: 13, lineSpacingMultiple: 1.12 });

    const ix = x + 0.2, iw = cw - 0.4, iy = TOP + 2.1;
    card(s, { x: ix, y: iy, w: iw, h: 1.6, tone: "inner", r: 0.08 });
    tag(s, "WHAT IT DOES", { x: ix + 0.2, y: iy + 0.16, w: iw - 0.4 });
    txt(s, c.does, { x: ix + 0.2, y: iy + 0.4, w: iw - 0.4, h: 0.42, fontSize: 11.5, lineSpacingMultiple: 1.1 });
    tag(s, "WHAT IT MISSES", { x: ix + 0.2, y: iy + 0.86, w: iw - 0.4, color: C.redD });
    txt(s, c.misses, { x: ix + 0.2, y: iy + 1.1, w: iw - 0.4, h: 0.42, fontSize: 11.5, lineSpacingMultiple: 1.1 });
  });

  card(s, { x: M, y: 5.6, w: CW, h: 1.0, tone: "accent" });
  txt(s, "Nobody reads the supplier's letter, traces the part through your own products, and hands back what to buy, with the working shown.", {
    x: M + 0.38, y: 5.6, w: CW - 0.76, h: 1.0, fontSize: 16, bold: true, color: C.redD, valign: "middle", lineSpacingMultiple: 1.1,
  });
}

/* ------------------------------------------------------ 5. feature comparison */

{
  const s = frame("Feature Comparison", 5);

  const head = ["", "Lifecycle databases", "Part search", "Spreadsheet by hand", "LastBuy"];
  const rows = [
    ["Starts from", "a part number", "a part number", "the letter, read by a person", "the letter, read for you"],
    ["Knows your products", "if you upload your BOM", "no", "in someone's head", "yes, from your BOM"],
    ["Reads the letter", "no", "no", "a person does", "yes, any language"],
    ["Sizes the last order", "no", "no", "by hand", "yes"],
    ["Shows how each number was made", "no", "no", "depends who did it", "yes"],
    ["Cost", "enterprise licence", "free", "staff time", "about $0.0001 a notice"],
  ];

  const edge = { pt: 0.75, color: "E6E8EC" };
  const table = [
    head.map((h, i) => ({
      text: h,
      options: {
        bold: true, color: "FFFFFF", fill: { color: i === 4 ? C.red : C.ink },
        fontFace: SANS, fontSize: 12, valign: "middle", border: [edge, edge, edge, edge],
      },
    })),
    ...rows.map((r, ri) =>
      r.map((v, i) => ({
        text: v,
        options: {
          fontFace: SANS, fontSize: 12, valign: "middle", border: [edge, edge, edge, edge],
          bold: i === 0 || i === 4,
          color: i === 0 ? C.redD : i === 4 ? C.red : C.mid,
          fill: { color: i === 4 ? C.redT : ri % 2 ? "F7F7F9" : "FFFFFF" },
        },
      })),
    ),
  ];
  s.addTable(table, {
    x: M, y: TOP, w: CW, colW: [2.75, 2.25, 1.8, 2.45, 2.683], rowH: [0.62, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
    margin: [0.04, 0.1, 0.04, 0.14], // inches: pptxgenjs reads a first value under 1 as inches
  });

  card(s, { x: M, y: 5.95, w: CW, h: 0.7, tone: "gold" });
  txt(s, "The only one that starts from the letter and ends with what to buy.", {
    x: M + 0.38, y: 5.95, w: CW - 0.76, h: 0.7, fontSize: 15, bold: true, color: C.redD, valign: "middle",
  });
}

/* ---------------------------------------------------------- 6. the product */

{
  const s = frame("Proposal & Product Idea", 6);

  const ideas = [
    ["Reads", "Any notice: a PDF, a scan or a phone photo, in any language.", "plain"],
    ["Traces", "Walks your bill of materials up to every product the part is in.", "plain"],
    ["Prices", "How many to buy, what it costs, and what it protects.", "plain"],
    ["Explains", "Every number shows the path it came from, so you can check it.", "accent"],
    ["Drafts", "The supplier order and the customer notice, ready to review.", "accent"],
    ["Waits for you", "Nothing is ordered until a named person approves it.", "accent"],
  ];
  const gw = 7.2;
  const cw = (gw - 0.4) / 3;
  ideas.forEach(([t, b, tone], i) => {
    const x = M + (i % 3) * (cw + 0.2);
    const y = TOP + Math.floor(i / 3) * 2.65;
    card(s, { x, y, w: cw, h: 2.45, tone });
    txt(s, t, { x: x + 0.25, y: y + 0.3, w: cw - 0.5, h: 0.4, fontSize: 17, bold: true, color: C.redD });
    txt(s, b, { x: x + 0.25, y: y + 0.85, w: cw - 0.5, h: 1.4, fontSize: 13, lineSpacingMultiple: 1.2 });
  });

  // the product itself, dark, the way relate.pptx shows its own
  const px = M + gw + 0.35;
  const pw = CW - gw - 0.35;
  const py = TOP - 0.1;
  const ph = 5.35;
  s.addShape(pptx.ShapeType.roundRect, {
    x: px, y: py, w: pw, h: ph, rectRadius: 0.14, fill: { color: "15171B" }, line: { color: "15171B", width: 0 },
  });
  const ix = px + 0.35, iw = pw - 0.7;
  tag(s, "THE PRODUCT", { x: ix, y: py + 0.3, w: iw, color: D.gold });
  txt(s, "LastBuy", { x: ix, y: py + 0.55, w: iw, h: 0.5, fontSize: 24, bold: true, color: D.fg });
  txt(s, "Drop in the letter. Get what it breaks.", { x: ix, y: py + 1.1, w: iw, h: 0.3, fontSize: 13, italic: true, color: D.mid });

  const steps = [["In:", "the letter, and your BOM as a CSV."], ["Finds:", "every product the part stops."], ["Out:", "what to buy, what it costs, a memo."]];
  steps.forEach(([k, v], i) => {
    const y = py + 1.6 + i * 0.58;
    circle(s, { x: ix, y, d: 0.42, fill: D.gold, color: C.ink, text: String(i + 1), size: 13 });
    txt(s, [{ text: k + " ", options: { bold: true, color: D.gold } }, { text: v, options: { color: D.fg } }], {
      x: ix + 0.58, y, w: iw - 0.58, h: 0.42, fontSize: 12.5, valign: "middle",
    });
  });

  tag(s, "ONE REAL RESULT  ·  ADUM1201ARZ", { x: ix, y: py + 3.45, w: iw, color: D.gold });
  const result = [["products it stops", "5"], ["revenue behind them", "€9.06M / yr"], ["units to buy", "504,798"], ["days to order", "34"]];
  result.forEach(([l, v], i) => {
    const y = py + 3.75 + i * 0.37;
    s.addShape(pptx.ShapeType.roundRect, {
      x: ix, y, w: iw, h: 0.31, rectRadius: 0.05, fill: { color: "24272E" }, line: { color: "24272E", width: 0 },
    });
    txt(s, l, { x: ix + 0.15, y, w: iw * 0.6, h: 0.31, fontSize: 11, color: D.mid, valign: "middle" });
    txt(s, v, { x: ix + iw * 0.45, y, w: iw * 0.55 - 0.15, h: 0.31, fontSize: 11, bold: true, color: i === 3 ? D.accent : D.gold, align: "right", valign: "middle" });
  });
}

/* ------------------------------------------------- 7. system architecture */

/** The colour key, under any slide that uses it. */
const KEY = { blue: "a model reads or writes", green: "plain code: rules and arithmetic", gold: "what you get back" };
function legend(s, y, tones = ["blue", "green"]) {
  const keys = tones.map((t) => [t, KEY[t]]);
  keys.forEach(([tone, label], i) => {
    const x = M + i * 3.6;
    card(s, { x, y, w: 0.42, h: 0.24, tone, r: 0.05 });
    txt(s, label, { x: x + 0.55, y: y + 0.01, w: 3, h: 0.24, fontSize: 11, color: C.mid });
  });
}

/** One coloured card in a right-hand column: tag, title, one plain line. */
function sideCard(s, { x, y, w, h, tone, tagText, title, body }) {
  card(s, { x, y, w, h, tone });
  const tc = { blue: C.blueD, green: C.greenD, gold: C.goldD, accent: C.redD, plain: C.goldD }[tone];
  tag(s, tagText, { x: x + 0.25, y: y + 0.2, w: w - 0.5, color: tc });
  txt(s, title, { x: x + 0.25, y: y + 0.43, w: w - 0.5, h: 0.3, fontSize: 14.5, bold: true });
  txt(s, body, { x: x + 0.25, y: y + 0.77, w: w - 0.5, h: h - 0.87, fontSize: 11.5, color: C.mid, lineSpacingMultiple: 1.1 });
}

{
  const s = frame("System Architecture", 7);
  const iw = 8.55;
  const ih = imageAt(s, "01-system.png", { x: M, y: TOP + 0.05, w: iw });

  const rx = M + iw + 0.3;
  const rw = CW - iw - 0.3;
  const ch = (ih - 0.3) / 3;
  sideCard(s, {
    x: rx, y: TOP, w: rw, h: ch, tone: "blue", tagText: "AMD INSTINCT",
    title: "Reads and writes", body: "MinerU2.5-Pro reads the scan. Gemma-4-31B-IT writes the memo.",
  });
  sideCard(s, {
    x: rx, y: TOP + ch + 0.15, w: rw, h: ch, tone: "blue", tagText: "EVOLUS  ·  LYCHEE",
    title: "Rules on certificates", body: "An agent on the same AMD model. It cites the clause.",
  });
  sideCard(s, {
    x: rx, y: TOP + (ch + 0.15) * 2, w: rw, h: ch, tone: "green", tagText: "IMPACT ENGINE",
    title: "Does the maths", body: "Every number you act on. Plain code, no model.",
  });

  legend(s, TOP + ih + 0.45);
}

/* ---------------------------------------------- 8. what happens to a notice */

{
  const s = frame("What Happens to a Notice", 8);
  const iw = 8.55;
  const ih = imageAt(s, "02-notice.png", { x: M, y: TOP + 0.2, w: iw });

  const rx = M + iw + 0.3;
  const rw = CW - iw - 0.3;
  // the two ways through, as numbers
  card(s, { x: rx, y: TOP, w: rw, h: 1.75, tone: "green" });
  tag(s, "THE PAGE SAYS IT", { x: rx + 0.25, y: TOP + 0.2, w: rw - 0.5, color: C.greenD });
  txt(s, "27s", { x: rx + 0.25, y: TOP + 0.45, w: rw - 0.5, h: 0.65, fontSize: 36, bold: true, color: C.green });
  txt(s, "0 credits, $0. No model runs.", { x: rx + 0.25, y: TOP + 1.18, w: rw - 0.5, h: 0.4, fontSize: 11.5, color: C.mid });

  card(s, { x: rx, y: TOP + 1.95, w: rw, h: 1.75, tone: "blue" });
  tag(s, "IT DOESN'T", { x: rx + 0.25, y: TOP + 2.15, w: rw - 0.5, color: C.blueD });
  txt(s, "54s", { x: rx + 0.25, y: TOP + 2.4, w: rw - 0.5, h: 0.65, fontSize: 36, bold: true, color: C.blue });
  txt(s, "Evolus and Gemma fill the gap. 10.6 credits.", { x: rx + 0.25, y: TOP + 3.13, w: rw - 0.5, h: 0.4, fontSize: 11.5, color: C.mid });

  card(s, { x: M, y: 5.55, w: CW, h: 0.85, tone: "gold" });
  txt(s, "A notice is a form. Read the form first, and ask a model only for what the page didn't say.", {
    x: M + 0.38, y: 5.55, w: CW - 0.76, h: 0.85, fontSize: 15, bold: true, color: C.redD, valign: "middle",
  });
  void ih;
}

/* ------------------------------------------------------------- 9. vigil */

{
  const s = frame("Vigil", 9);

  // what it looks at
  const srcs = [
    ["What's on screen", "the page you are on"],
    ["How the system works", "every screen and figure"],
    ["Your documents", "notices, BOMs, certificates"],
  ];
  const sw = 2.55;
  srcs.forEach(([t, b], i) => {
    const y = TOP + 0.1 + i * 0.95;
    card(s, { x: M, y, w: sw, h: 0.8 });
    txt(s, t, { x: M + 0.22, y: y + 0.14, w: sw - 0.4, h: 0.28, fontSize: 13, bold: true });
    txt(s, b, { x: M + 0.22, y: y + 0.44, w: sw - 0.4, h: 0.24, fontSize: 10.5, color: C.dim });
    arrow(s, { x1: M + sw + 0.05, x2: M + sw + 0.75, y: y + 0.4, label: i === 0 ? "context" : null });
  });

  // Vigil himself
  const vx = M + sw + 0.8;
  const vw = 2.5;
  card(s, { x: vx, y: TOP, w: vw, h: 3.05, tone: "plain" });
  s.addImage({ path: asset("vigil-ink.png"), x: vx + (vw - 1.65) / 2, y: TOP + 0.2, w: 1.65, h: 1.65 });
  txt(s, "Vigil", { x: vx, y: TOP + 1.95, w: vw, h: 0.36, fontSize: 18, bold: true, align: "center" });
  s.addShape(pptx.ShapeType.roundRect, {
    x: vx + 0.45, y: TOP + 2.45, w: vw - 0.9, h: 0.34, rectRadius: 0.17,
    fill: { color: C.soft }, line: { color: C.line, width: 0.75 },
  });
  txt(s, "sign in to ask", { x: vx + 0.45, y: TOP + 2.45, w: vw - 0.9, h: 0.34, fontSize: 10.5, color: C.mid, align: "center", valign: "middle" });

  // the model it asks
  const mx = vx + vw + 0.75;
  const mw = 2.45;
  arrow(s, { x1: vx + vw + 0.05, x2: mx - 0.05, y: TOP + 1.5, color: C.blue, label: "ask" });
  card(s, { x: mx, y: TOP + 0.55, w: mw, h: 1.95, tone: "blue" });
  tag(s, "THE MODEL", { x: mx + 0.22, y: TOP + 0.72, w: mw - 0.44, color: C.blueD });
  s.addImage({ path: asset("logo-amd.png"), x: mx + 0.22, y: TOP + 1.05, w: 0.95, h: (0.95 * 47) / 163 });
  s.addImage({ path: asset("logo-gemma.png"), x: mx + 1.3, y: TOP + 0.98, w: 0.95, h: (0.95 * 59) / 153 });
  txt(s, "Gemma-4-31B-IT", { x: mx + 0.22, y: TOP + 1.6, w: mw - 0.44, h: 0.28, fontSize: 13, bold: true });
  txt(s, "on AMD Instinct", { x: mx + 0.22, y: TOP + 1.9, w: mw - 0.44, h: 0.26, fontSize: 11, color: C.mid });

  // the answer, with where it came from
  const ax = mx + mw + 0.75;
  const aw = W - M - ax;
  arrow(s, { x1: mx + mw + 0.05, x2: ax - 0.05, y: TOP + 1.5, color: C.red, label: "answer" });
  card(s, { x: ax, y: TOP + 0.3, w: aw, h: 2.45, tone: "gold" });
  tag(s, "WHAT YOU READ", { x: ax + 0.22, y: TOP + 0.5, w: aw - 0.44 });
  const claims = [["Stops 5 products.", "engine", C.green], ["Last buy: 17 Nov.", "PCN.pdf", C.blue]];
  claims.forEach(([claim, src, col], i) => {
    const y = TOP + 0.85 + i * 0.9;
    txt(s, claim, { x: ax + 0.22, y, w: aw - 0.4, h: 0.3, fontSize: 12.5 });
    s.addShape(pptx.ShapeType.roundRect, {
      x: ax + 0.22, y: y + 0.36, w: 0.95, h: 0.28, rectRadius: 0.14,
      fill: { color: "FFFFFF" }, line: { color: col, width: 1 },
    });
    txt(s, src, { x: ax + 0.22, y: y + 0.36, w: 0.95, h: 0.28, fontSize: 10, bold: true, color: col, align: "center", valign: "middle" });
  });

  // what it promises
  const promises = [
    ["Sees your screen", "Knows which page you are on, and what is on it."],
    ["Shows its sources", "Every claim ends with where it came from."],
    ["Says \"I don't know\"", "No guessing to fill a gap."],
    ["Floats on every page", "Reading is open. Asking needs an account."],
  ];
  const pw = (CW - 0.75) / 4;
  promises.forEach(([t, b], i) => {
    const x = M + i * (pw + 0.25);
    card(s, { x, y: 4.85, w: pw, h: 1.75, tone: i === 1 ? "accent" : "plain" });
    circle(s, { x: x + 0.22, y: 5.07, d: 0.42, fill: C.red, text: String(i + 1), size: 12 });
    txt(s, t, { x: x + 0.22, y: 5.62, w: pw - 0.44, h: 0.3, fontSize: 13.5, bold: true, color: C.redD });
    txt(s, b, { x: x + 0.22, y: 5.97, w: pw - 0.44, h: 0.55, fontSize: 11.5, color: C.mid, lineSpacingMultiple: 1.12 });
  });
}

/* ------------------------------------------------- 10. what Vigil remembers */

{
  const s = frame("What Vigil Remembers", 10);
  const iw = 8.2;
  const ih = imageAt(s, "03-memory.png", { x: M, y: TOP, w: iw });

  const rx = M + iw + 0.35;
  const rw = CW - iw - 0.35;
  const ch = (ih - 0.3) / 3;
  sideCard(s, {
    x: rx, y: TOP, w: rw, h: ch, tone: "gold", tagText: "DISTIL",
    title: "Keep the facts", body: "Turns the chat into claims, each with its source.",
  });
  sideCard(s, {
    x: rx, y: TOP + ch + 0.15, w: rw, h: ch, tone: "plain", tagText: "FORK",
    title: "Start clean", body: "A new chat with an empty window that still knows the claims.",
  });
  sideCard(s, {
    x: rx, y: TOP + (ch + 0.15) * 2, w: rw, h: ch, tone: "accent", tagText: "FORGET",
    title: "Delete it", body: "Removes the conversation. It asks you first.",
  });

  card(s, { x: M, y: TOP + ih + 0.25, w: CW, h: 0.7, tone: "gold" });
  txt(s, "A summary can't be checked. A claim with its source can.", {
    x: M + 0.38, y: TOP + ih + 0.25, w: CW - 0.76, h: 0.7, fontSize: 15, bold: true, color: C.redD, valign: "middle",
  });
}

/* --------------------------------------------- 11. techniques & structure */

{
  const s = frame("Techniques & Structure", 11);

  const stages = [
    {
      tone: "blue", tag: "MODEL", title: "Read",
      bits: ["MinerU2.5-Pro reads PDFs, scans and photos", "Runs on AMD Instinct, through Token Factory"],
      out: "the notice, as text",
    },
    {
      tone: "green", tag: "RULES", title: "Read the form",
      bits: ["Finds the ticked category box", "Finds the date next to its label", "Matches part numbers to your BOM"],
      out: "type, date and parts, with no model",
    },
    {
      tone: "green", tag: "ENGINE", title: "Trace the part",
      bits: ["Walks the BOM up to every product", "Multiplies quantities on each path", "Sizes the order for the service period"],
      out: "products, revenue, order size",
    },
    {
      tone: "blue", tag: "MODEL + AGENT", title: "Write it up",
      bits: ["Gemma-4-31B-IT writes the memo", "Evolus agent rules on certificates", "Vigil answers questions"],
      out: "memo, drafts, ruling",
    },
  ];
  const gap = 0.42;
  const cw = (CW - gap * 3) / 4;
  const ch = 3.95;
  stages.forEach((st, i) => {
    const x = M + i * (cw + gap);
    const col = st.tone === "blue" ? C.blue : C.green;
    const dark = st.tone === "blue" ? C.blueD : C.greenD;
    card(s, { x, y: TOP, w: cw, h: ch, tone: st.tone });
    circle(s, { x: x + 0.22, y: TOP + 0.25, d: 0.5, fill: col, text: String(i + 1) });
    tag(s, st.tag, { x: x + 0.85, y: TOP + 0.24, w: cw - 1.0, color: dark });
    txt(s, st.title, { x: x + 0.85, y: TOP + 0.46, w: cw - 1.0, h: 0.32, fontSize: 15.5, bold: true });
    txt(s, st.bits.map((b, j) => ({
      text: b, options: { bullet: { indent: 12 }, breakLine: j < st.bits.length - 1, paraSpaceAfter: 6 },
    })), { x: x + 0.22, y: TOP + 1.0, w: cw - 0.4, h: 1.8, fontSize: 11.5, lineSpacingMultiple: 1.1 });

    card(s, { x: x + 0.18, y: TOP + ch - 1.0, w: cw - 0.36, h: 0.8, tone: "white", r: 0.08 });
    txt(s, [{ text: "Out: ", options: { bold: true, color: dark } }, { text: st.out, options: { color: C.ink } }], {
      x: x + 0.35, y: TOP + ch - 1.0, w: cw - 0.7, h: 0.8, fontSize: 11.5, valign: "middle",
    });

    if (i < 3) {
      s.addShape(pptx.ShapeType.chevron, {
        x: x + cw + (gap - 0.2) / 2, y: TOP + ch / 2 - 0.2, w: 0.2, h: 0.4,
        fill: { color: C.goldN }, line: { color: C.goldN, width: 0 },
      });
    }
  });

  const by = TOP + ch + 0.22;
  card(s, { x: M, y: by, w: CW, h: 0.5, tone: "gold" });
  txt(s, [
    { text: "Stack   ", options: { bold: true, color: C.redD } },
    { text: "Next.js, TypeScript, Tailwind  ·  Vercel and Docker  ·  runs in a browser, nothing to install", options: { color: C.ink } },
  ], { x: M + 0.3, y: by, w: CW - 0.6, h: 0.5, fontSize: 12, valign: "middle" });

  card(s, { x: M, y: by + 0.62, w: CW, h: 0.5, tone: "accent" });
  txt(s, [
    { text: "On AMD   ", options: { bold: true, color: C.redD } },
    { text: "MinerU2.5-Pro  ▸  Gemma-4-31B-IT  ▸  the Evolus agent in workspace lychee, on the same model", options: { color: C.ink } },
  ], { x: M + 0.3, y: by + 0.62, w: CW - 0.6, h: 0.5, fontSize: 12, valign: "middle" });
}

/* ---------------------------------------------------- 12. contributions */

{
  const s = pptx.addSlide();
  s.background = { color: D.bg };
  deco(s, -2.6, 3.4, 6.2);
  s.addImage({ path: asset("logo-white.png"), x: 11.86, y: 0.3, w: 1.17, h: 1.07 });

  txt(s, "Contributions", { x: M, y: 0.55, w: 7, h: 0.65, fontSize: 30, bold: true, color: D.fg, valign: "middle" });

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 1.5, w: CW, h: 1.35, rectRadius: 0.12, fill: { color: D.card }, line: { color: D.card, width: 0 },
  });
  txt(s, [
    { text: "Obsolescence management is already an industry. Every tool in it is a database you search. ", options: { color: D.fg } },
    { text: "This one reads the letter and tells you what breaks.", options: { color: D.accent } },
  ], { x: M + 0.4, y: 1.5, w: CW - 0.8, h: 1.35, fontSize: 19, bold: true, valign: "middle", lineSpacingMultiple: 1.15 });

  const gives = [
    ["Keeps products alive", "A missed last-time buy ends a product line. Nobody meant to miss it. They just couldn't work it out in time."],
    ["Not only for big firms", "A hundredth of a cent a notice, and your own spreadsheet is the input. No licence, no data migration."],
    ["Numbers you can check", "Every figure is arithmetic over your bill of materials. Nobody should sign a €1.4M order on a model's word."],
    ["Less thrown away", "Buy the quantity the maths gives you, not the panic order that gets scrapped three years later."],
  ];
  const gw = (CW - 0.3) / 2;
  gives.forEach(([t, b], i) => {
    const x = M + (i % 2) * (gw + 0.3);
    const y = 3.1 + Math.floor(i / 2) * 1.68;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: gw, h: 1.48, rectRadius: 0.12, fill: { color: D.card }, line: { color: D.edge, width: 1 },
    });
    circle(s, { x: x + 0.3, y: y + 0.28, d: 0.46, fill: D.gold, color: C.ink, text: String(i + 1), size: 13 });
    txt(s, t, { x: x + 0.95, y: y + 0.28, w: gw - 1.25, h: 0.46, fontSize: 16, bold: true, color: D.accent, valign: "middle" });
    txt(s, b, { x: x + 0.95, y: y + 0.8, w: gw - 1.25, h: 0.6, fontSize: 12, color: D.mid, lineSpacingMultiple: 1.15 });
  });

  footer(s, 12, true);
}

pptx
  .writeFile({ fileName: OUT })
  .then(() => console.log("wrote", OUT))
  .catch((e) => {
    console.error("failed:", e.message);
    process.exit(1);
  });
