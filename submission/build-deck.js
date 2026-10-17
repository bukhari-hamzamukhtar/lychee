/**
 * The LastBuy deck.
 *
 *   node submission/build-deck.js
 *
 * Twelve slides, in the order relate.pptx uses: motivation with sourced numbers,
 * the problem, what already exists, a feature comparison, the product, the
 * architecture, then how it is built. Plain wording, short lines, no
 * screenshots — the judges have the live site for those.
 *
 * The first and last slides are dark and everything between is light, which is
 * how the product itself looks. Colours come from app/globals.css.
 *
 * Diagrams are made separately (see CHATGPT-DIAGRAM-PROMPTS.md) and dropped into
 * submission/diagrams/. Any that are missing become a labelled empty frame, so
 * the deck always builds and it is obvious which picture goes where.
 *
 * Needs pptxgenjs, which is deliberately not a dependency of the app.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const OUT = process.env.OUT_FILE || path.join(__dirname, "LastBuy.pptx");
const DIAGRAMS = path.join(__dirname, "diagrams");
const LOGO = path.join(__dirname, "assets", "title-image1.png");
const TOTAL = 12;

/* ---------------------------------------------------------------- palette */

const DARK = { bg: "08090B", line: "262A31", fg: "F6F7F9", mid: "D6DBE2", dim: "B2BBC5", accent: "FF5A3D" };
const LIGHT = { bg: "FFFFFF", line: "DFE1E5", fg: "111317", mid: "373D47", dim: "5C636E", accent: "D62D12", soft: "F7F7F9" };
const SANS = "Arial";
const MONO = "Consolas";

const pptx = new pptxgen();
// LAYOUT_WIDE is the 13.333 x 7.5in page. LAYOUT_16x9 is 10 x 5.625in, and
// using it with these coordinates pushes a third of every slide off the page.
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Hamza Bukhari";
pptx.company = "LastBuy";
pptx.title = "LastBuy";

const W = 13.333;
const H = 7.5;
const M = 0.75;
const CW = W - M * 2; // content width

/* ---------------------------------------------------------------- helpers */

function rule(s, theme, y, x = M, w = CW) {
  s.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.012, fill: { color: theme.line }, line: { width: 0 } });
}

/** Title, rule, page number and the partner strip — the frame every light slide shares. */
function frame(title, n) {
  const s = pptx.addSlide();
  s.background = { color: LIGHT.bg };
  s.addText(title, {
    x: M, y: 0.42, w: CW - 1.2, h: 0.62,
    fontFace: SANS, fontSize: 26, bold: true, color: LIGHT.fg,
  });
  rule(s, LIGHT, 1.12);

  // bottom strip: who runs this, and where we are in the deck
  rule(s, LIGHT, H - 0.62);
  s.addText(
    [
      { text: "Gemma-4-31B-IT", options: { color: LIGHT.mid } },
      { text: "  on  ", options: { color: LIGHT.dim } },
      { text: "AMD Instinct", options: { color: LIGHT.mid } },
      { text: "   ·   ", options: { color: LIGHT.dim } },
      { text: "Evolus workspace lychee", options: { color: LIGHT.mid } },
    ],
    { x: M, y: H - 0.5, w: 9, h: 0.3, fontFace: MONO, fontSize: 10 },
  );
  s.addText(`${n}/${TOTAL}`, {
    x: W - M - 1.2, y: H - 0.5, w: 1.2, h: 0.3,
    fontFace: SANS, fontSize: 11, color: LIGHT.dim, align: "right",
  });
  return s;
}

/** A number, the thing it counts, and one short line that lands the point. */
function stat(s, { x, y, w, value, label, punch, accent = false }) {
  s.addText(value, {
    x, y, w, h: 0.9, fontFace: SANS, fontSize: 46, bold: true,
    color: accent ? LIGHT.accent : LIGHT.fg,
  });
  s.addText(label, {
    x, y: y + 0.95, w, h: 0.7, fontFace: SANS, fontSize: 14, color: LIGHT.mid, lineSpacingMultiple: 1.2,
  });
  s.addText(punch, {
    x, y: y + 1.7, w, h: 0.7, fontFace: SANS, fontSize: 13, bold: true, color: LIGHT.fg, lineSpacingMultiple: 1.2,
  });
}

/** Numbered point: a bold title and a plain sentence under it. */
function point(s, { x, y, w, n, title, body, tag }) {
  s.addText(String(n), {
    x, y, w: 0.42, h: 0.42, fontFace: SANS, fontSize: 15, bold: true, color: LIGHT.accent,
  });
  if (tag) {
    s.addText(tag, {
      x: x + 0.45, y: y + 0.02, w: w - 0.45, h: 0.24,
      fontFace: SANS, fontSize: 9, bold: true, charSpacing: 1.6, color: LIGHT.dim,
    });
  }
  s.addText(title, {
    x: x + 0.45, y: tag ? y + 0.24 : y, w: w - 0.45, h: 0.36,
    fontFace: SANS, fontSize: 15, bold: true, color: LIGHT.fg,
  });
  s.addText(body, {
    x: x + 0.45, y: (tag ? y + 0.24 : y) + 0.38, w: w - 0.45, h: 0.9,
    fontFace: SANS, fontSize: 12.5, color: LIGHT.mid, lineSpacingMultiple: 1.28, valign: "top",
  });
}

/** A ChatGPT diagram if it is there; otherwise a frame saying which one goes here. */
function diagram(s, file, box, name) {
  const p = path.join(DIAGRAMS, file);
  if (fs.existsSync(p)) {
    s.addImage({ path: p, ...box, sizing: { type: "contain", w: box.w, h: box.h } });
    return;
  }
  s.addShape(pptx.ShapeType.rect, {
    ...box,
    fill: { color: LIGHT.soft },
    line: { color: LIGHT.line, width: 1, dashType: "dash" },
  });
  s.addText(
    [
      { text: name + "\n", options: { fontSize: 16, bold: true, color: LIGHT.mid } },
      { text: "submission/diagrams/" + file, options: { fontSize: 11, color: LIGHT.dim, fontFace: MONO } },
    ],
    { ...box, align: "center", valign: "middle", fontFace: SANS },
  );
}

/* ------------------------------------------------------------- 1. title */

{
  const s = pptx.addSlide();
  s.background = { color: DARK.bg };
  if (fs.existsSync(LOGO)) s.addImage({ path: LOGO, x: 11.86, y: 0.3, w: 1.17, h: 1.07 });

  s.addText("LastBuy", {
    x: M, y: 2.3, w: 8, h: 0.95, fontFace: SANS, fontSize: 50, bold: true, color: DARK.fg,
  });
  s.addText(
    [
      { text: "Reads a supplier's discontinuation letter and tells you ", options: { color: DARK.fg } },
      { text: "what it breaks, and what to buy.", options: { color: DARK.accent } },
    ],
    { x: M, y: 3.35, w: 9.4, h: 1.2, fontFace: SANS, fontSize: 24, lineSpacingMultiple: 1.2 },
  );
  rule(s, DARK, 5.0, M, 6.5);
  s.addText("Hamza Bukhari", {
    x: M, y: 5.2, w: 8, h: 0.35, fontFace: SANS, fontSize: 15, bold: true, color: DARK.fg,
  });
  s.addText("AMD Developer Hackathon: ACT III   ·   Intelligent Industry", {
    x: M, y: 5.58, w: 10, h: 0.32, fontFace: SANS, fontSize: 13, color: DARK.dim,
  });
  s.addText("Gemma-4-31B-IT on AMD Instinct   ·   Evolus workspace lychee", {
    x: M, y: 6.6, w: 11, h: 0.3, fontFace: MONO, fontSize: 11, color: DARK.mid,
  });
}

/* ------------------------------------------------------------ 2. motivation */

{
  const s = frame("Motivation", 2);
  const col = (CW - 0.8) / 3;
  stat(s, {
    x: M, y: 1.55, w: col, value: "756,087",
    label: "electronic components went\nobsolete in 2022",
    punch: "Almost 50 percent more than the year before.",
  });
  stat(s, {
    x: M + col + 0.4, y: 1.55, w: col, value: "82,000+",
    label: "lifecycle changes in 2023\nwith no notice sent at all",
    punch: "One in four. Nobody wrote to say.",
  });
  stat(s, {
    x: M + (col + 0.4) * 2, y: 1.55, w: col, value: "$1.1M", accent: true,
    label: "average cost to redesign one\nassembly when a part is gone",
    punch: "For a whole system: $10.3 million.",
  });

  rule(s, LIGHT, 4.55);
  s.addText(
    "Each of those letters lands on someone who has to work out, by hand, which products it stops — before a date that will not move.",
    { x: M, y: 4.75, w: CW, h: 0.8, fontFace: SANS, fontSize: 16, color: LIGHT.fg, lineSpacingMultiple: 1.25 },
  );
  s.addText(
    "Sources: Z2Data, Obsolescence Trends 2024  ·  Z2Data, 2023 lifecycle analysis  ·  US Department of Commerce (BIS) and DSPO, DMSMS Cost Metrics, 2015",
    { x: M, y: 6.25, w: CW, h: 0.3, fontFace: SANS, fontSize: 9.5, color: LIGHT.dim },
  );
}

/* ------------------------------------------------ 3. problem & justification */

{
  const s = frame("Problem Statement & Justification", 3);

  s.addText(
    [
      { text: "Problem:  ", options: { bold: true, color: LIGHT.accent } },
      {
        text: "A supplier's letter gives you a part number and a date. Working out which of your products that part stops, and how many to buy before the date, is still done by hand, in spreadsheets.",
        options: { color: LIGHT.fg },
      },
    ],
    { x: M, y: 1.35, w: CW, h: 0.9, fontFace: SANS, fontSize: 15.5, lineSpacingMultiple: 1.25 },
  );

  const problems = [
    "Letters arrive as PDFs and scans, in any language, with no common format.",
    "A bill of materials is a tree, not a list. One part can sit under five products, through three assemblies.",
    "The order has to be placed before the date. After it, the part is never sold again.",
    "Existing tools tell you a part is at risk. They do not read the letter, and they do not size the order.",
  ];
  let y = 2.45;
  for (const p of problems) {
    s.addText("—", { x: M, y, w: 0.3, h: 0.32, fontFace: SANS, fontSize: 13, color: LIGHT.dim });
    s.addText(p, { x: M + 0.32, y, w: 5.5, h: 0.6, fontFace: SANS, fontSize: 12.5, color: LIGHT.mid, lineSpacingMultiple: 1.25 });
    y += 0.78;
  }

  s.addText("JUSTIFICATION", {
    x: 7.0, y: 2.45, w: 5.5, h: 0.28, fontFace: SANS, fontSize: 10, bold: true, charSpacing: 2, color: LIGHT.dim,
  });
  point(s, {
    x: 7.0, y: 2.85, w: 5.58, n: 1, title: "Nothing gets triaged out.",
    body: "At about a hundredth of a cent a notice, every letter gets read — not only the ones that look important.",
  });
  point(s, {
    x: 7.0, y: 4.0, w: 5.58, n: 2, title: "The answer can be checked.",
    body: "Every figure is arithmetic over your own bill of materials. Nobody has to trust a model with a million-euro order.",
  });
  point(s, {
    x: 7.0, y: 5.15, w: 5.58, n: 3, title: "It works on your data.",
    body: "Bring your bill of materials as a CSV, from any system. The columns are worked out from their names.",
  });
}

/* ------------------------------------------------------- 4. what exists today */

{
  const s = frame("What Exists Today & the Gap", 4);

  const cols = [
    {
      tag: "A",
      title: "Lifecycle databases",
      names: "SiliconExpert, Z2Data, Accuris",
      line: "Tell you a part is at risk. You still work out what it breaks.",
    },
    {
      tag: "B",
      title: "Part search",
      names: "Octopart, distributor sites",
      line: "Price and stock for one part number at a time.",
    },
    {
      tag: "C",
      title: "Spreadsheets and email",
      names: "what most teams actually use",
      line: "Accurate when someone has the time. Slow when they don't.",
    },
  ];
  const cw = (CW - 0.8) / 3;
  cols.forEach((c, i) => {
    const x = M + i * (cw + 0.4);
    s.addText(c.tag, { x, y: 1.5, w: 0.5, h: 0.5, fontFace: SANS, fontSize: 26, bold: true, color: LIGHT.accent });
    s.addText(c.title, { x, y: 2.1, w: cw, h: 0.4, fontFace: SANS, fontSize: 17, bold: true, color: LIGHT.fg });
    s.addText(c.names, { x, y: 2.55, w: cw, h: 0.32, fontFace: SANS, fontSize: 12, color: LIGHT.dim });
    rule(s, LIGHT, 3.05, x, cw);
    s.addText(c.line, { x, y: 3.2, w: cw, h: 0.9, fontFace: SANS, fontSize: 13.5, color: LIGHT.mid, lineSpacingMultiple: 1.3 });
  });

  rule(s, LIGHT, 4.85);
  s.addText(
    "Nobody reads the supplier's letter, traces the part through your own products, and hands back what to buy — with the working shown.",
    { x: M, y: 5.05, w: CW, h: 0.9, fontFace: SANS, fontSize: 17, bold: true, color: LIGHT.fg, lineSpacingMultiple: 1.25 },
  );
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

  const cell = (text, opts = {}) => ({ text, options: { fontFace: SANS, fontSize: 11.5, color: LIGHT.mid, valign: "middle", ...opts } });
  const table = [
    head.map((h, i) =>
      cell(h, {
        bold: true, fontSize: 11, color: i === 4 ? LIGHT.accent : LIGHT.dim,
        border: [{ pt: 0 }, { pt: 0 }, { pt: 1, color: LIGHT.line }, { pt: 0 }],
      }),
    ),
    ...rows.map((r) =>
      r.map((v, i) =>
        cell(v, {
          bold: i === 0 || i === 4,
          color: i === 0 ? LIGHT.fg : i === 4 ? LIGHT.accent : LIGHT.mid,
          border: [{ pt: 0 }, { pt: 0 }, { pt: 0.75, color: LIGHT.line }, { pt: 0 }],
        }),
      ),
    ),
  ];
  s.addTable(table, {
    x: M, y: 1.45, w: CW, colW: [2.7, 2.3, 1.75, 2.45, 2.63], rowH: 0.56,
  });
}

/* ---------------------------------------------------------- 6. the product */

{
  const s = frame("The Product", 6);

  s.addText("LastBuy", { x: M, y: 1.45, w: 6, h: 0.55, fontFace: SANS, fontSize: 24, bold: true, color: LIGHT.fg });
  s.addText("Drop in the letter. Get what it breaks.", {
    x: M, y: 2.0, w: 6.5, h: 0.4, fontFace: SANS, fontSize: 15, color: LIGHT.mid,
  });

  point(s, {
    x: M, y: 2.75, w: 6.2, n: 1, tag: "IN", title: "The letter and your bill of materials",
    body: "A PDF, a scan or a photo, in any language — and your parts list as a CSV.",
  });
  point(s, {
    x: M, y: 3.95, w: 6.2, n: 2, tag: "FINDS", title: "Every product the part stops",
    body: "Through every assembly it sits in, with how many go into each unit.",
  });
  point(s, {
    x: M, y: 5.15, w: 6.2, n: 3, tag: "OUT", title: "What to buy, and what it costs",
    body: "The order size, its cost, the revenue it protects, and a memo ready to sign.",
  });

  // one real result, the way relate.pptx shows a report preview
  const px = 7.6;
  s.addText("ONE REAL RESULT", { x: px, y: 1.5, w: 5, h: 0.28, fontFace: SANS, fontSize: 10, bold: true, charSpacing: 2, color: LIGHT.dim });
  s.addText("ADUM1201ARZ", { x: px, y: 1.85, w: 5, h: 0.4, fontFace: MONO, fontSize: 17, bold: true, color: LIGHT.fg });
  s.addText("digital isolator, Analog Devices", { x: px, y: 2.25, w: 5, h: 0.3, fontFace: SANS, fontSize: 12, color: LIGHT.dim });
  const result = [
    ["5", "products stop without it"],
    ["€9.05M", "a year of revenue behind them"],
    ["504,798", "units to buy"],
    ["34 days", "to place the order"],
  ];
  let y = 2.8;
  result.forEach(([v, l], i) => {
    rule(s, LIGHT, y - 0.08, px, 4.98);
    s.addText(v, {
      x: px, y, w: 1.75, h: 0.5, fontFace: SANS, fontSize: 20, bold: true,
      color: i === 3 ? LIGHT.accent : LIGHT.fg,
    });
    s.addText(l, { x: px + 1.85, y: y + 0.06, w: 3.1, h: 0.4, fontFace: SANS, fontSize: 12.5, color: LIGHT.mid });
    y += 0.72;
  });
}

/* ------------------------------------------------- 7. system architecture */

{
  const s = frame("System Architecture", 7);
  diagram(s, "01-system.png", { x: M, y: 1.35, w: CW, h: 4.95 }, "System architecture");
  s.addText("Two things you give it, one browser, three services behind it.", {
    x: M, y: 6.38, w: CW, h: 0.3, fontFace: SANS, fontSize: 12.5, color: LIGHT.mid,
  });
}

/* ---------------------------------------------- 8. what happens to a notice */

{
  const s = frame("What Happens to a Notice", 8);
  diagram(s, "02-notice.png", { x: M, y: 1.35, w: CW, h: 4.95 }, "What happens to a notice");
  s.addText("A notice is a form. If the page already says it, no model runs at all.", {
    x: M, y: 6.38, w: CW, h: 0.3, fontFace: SANS, fontSize: 12.5, color: LIGHT.mid,
  });
}

/* ------------------------------------------------------------- 9. vigil */

{
  const s = frame("Vigil", 9);

  s.addText("The assistant that sits on every screen.", {
    x: M, y: 1.4, w: 5.2, h: 0.4, fontFace: SANS, fontSize: 16, bold: true, color: LIGHT.fg,
  });

  const lines = [
    ["Sees your screen", "It knows which page you are on and what is on it."],
    ["Knows the system", "It can explain any figure, and which screen to open next."],
    ["Shows its sources", "Every claim ends with where it came from: a filename, or [engine]."],
    ["Says when it doesn't know", "No guessing to fill a gap."],
    ["Needs an account", "Reading is open. Asking is signed in."],
  ];
  let y = 2.05;
  for (const [t, b] of lines) {
    rule(s, LIGHT, y - 0.08, M, 5.2);
    s.addText(t, { x: M, y, w: 5.2, h: 0.32, fontFace: SANS, fontSize: 13.5, bold: true, color: LIGHT.fg });
    s.addText(b, { x: M, y: y + 0.33, w: 5.2, h: 0.4, fontFace: SANS, fontSize: 11.5, color: LIGHT.mid });
    y += 0.85;
  }

  diagram(s, "04-vigil.png", { x: 6.25, y: 1.35, w: 6.33, h: 4.95 }, "How Vigil answers");
}

/* ------------------------------------------------- 10. what Vigil remembers */

{
  const s = frame("What Vigil Remembers", 10);
  diagram(s, "03-memory.png", { x: M, y: 1.35, w: CW, h: 4.95 }, "What Vigil remembers");
  s.addText("A long chat is turned into claims with sources. The chatter goes; the facts stay.", {
    x: M, y: 6.38, w: CW, h: 0.3, fontFace: SANS, fontSize: 12.5, color: LIGHT.mid,
  });
}

/* --------------------------------------------- 11. techniques & structure */

{
  const s = frame("Techniques & Structure", 11);

  const stages = [
    {
      tag: "AMD",
      title: "Read",
      bits: ["MinerU2.5-Pro reads PDFs, scans and photos", "Runs on AMD Instinct through Token Factory"],
      out: "the notice, as text",
    },
    {
      tag: "RULES",
      title: "Read the form",
      bits: ["Finds the ticked category box", "Finds the date next to its label", "Matches part numbers to your BOM"],
      out: "type, date and parts — no model",
    },
    {
      tag: "GRAPH",
      title: "Trace the part",
      bits: ["Walks the BOM up to every product", "Multiplies quantities on each path", "Sizes the order for the service period"],
      out: "products, revenue, order size",
    },
    {
      tag: "GEMMA + EVOLUS",
      title: "Write it up",
      bits: ["Gemma-4-31B-IT writes the memo", "Evolus agent rules on certificates", "Vigil answers questions"],
      out: "memo, drafts, ruling",
    },
  ];

  const cw = (CW - 0.9) / 4;
  stages.forEach((st, i) => {
    const x = M + i * (cw + 0.3);
    s.addText(String(i + 1), { x, y: 1.45, w: 0.5, h: 0.5, fontFace: SANS, fontSize: 24, bold: true, color: LIGHT.accent });
    s.addText(st.tag, { x, y: 2.0, w: cw, h: 0.26, fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 1.8, color: LIGHT.dim });
    s.addText(st.title, { x, y: 2.28, w: cw, h: 0.4, fontFace: SANS, fontSize: 16, bold: true, color: LIGHT.fg });
    rule(s, LIGHT, 2.8, x, cw);
    let by = 2.95;
    for (const b of st.bits) {
      s.addText(b, { x, y: by, w: cw, h: 0.5, fontFace: SANS, fontSize: 11.5, color: LIGHT.mid, lineSpacingMultiple: 1.2 });
      by += 0.55;
    }
    s.addText([{ text: "Out: ", options: { bold: true, color: LIGHT.fg } }, { text: st.out, options: { color: LIGHT.mid } }], {
      x, y: 4.75, w: cw, h: 0.5, fontFace: SANS, fontSize: 11.5,
    });
  });

  rule(s, LIGHT, 5.55);
  s.addText(
    [
      { text: "Stack  ", options: { bold: true, color: LIGHT.fg } },
      { text: "Next.js, TypeScript, AMD Token Factory, Evolus, Vercel, Docker. Runs in a browser — nothing to install.", options: { color: LIGHT.mid } },
    ],
    { x: M, y: 5.72, w: CW, h: 0.4, fontFace: SANS, fontSize: 12.5 },
  );
}

/* ---------------------------------------------------- 12. contributions */

{
  const s = pptx.addSlide();
  s.background = { color: DARK.bg };
  if (fs.existsSync(LOGO)) s.addImage({ path: LOGO, x: 11.86, y: 0.3, w: 1.17, h: 1.07 });

  s.addText("Contributions", {
    x: M, y: 0.7, w: 7, h: 0.65, fontFace: SANS, fontSize: 30, bold: true, color: DARK.fg,
  });

  const gives = [
    ["Keeps products alive", "A missed last-time buy ends a product line. Nobody meant to miss it — they just could not work it out in time."],
    ["Not only for big firms", "A hundredth of a cent a notice, and your own spreadsheet is the input. No enterprise licence, no data migration."],
    ["Numbers you can check", "Every figure is arithmetic over your bill of materials. Nobody should sign a 1.4 million euro order on a model's word."],
    ["Less thrown away", "Buy the quantity the maths gives you, not the panic order that gets scrapped three years later."],
  ];
  let y = 1.75;
  for (const [title, body] of gives) {
    rule(s, DARK, y - 0.14, M, 6.0);
    s.addText(title, { x: M, y, w: 6.0, h: 0.32, fontFace: SANS, fontSize: 15, bold: true, color: DARK.accent });
    s.addText(body, { x: M, y: y + 0.36, w: 6.0, h: 0.66, fontFace: SANS, fontSize: 12, color: DARK.mid, lineSpacingMultiple: 1.28 });
    y += 1.22;
  }

  s.addText(
    [
      { text: "Obsolescence management is already an industry.\n", options: { color: DARK.fg } },
      { text: "Every tool in it is a database you search.\n\n", options: { color: DARK.fg } },
      { text: "This one reads the letter and tells you what breaks.", options: { color: DARK.accent } },
    ],
    { x: 7.5, y: 2.1, w: 5.1, h: 2.8, fontFace: SANS, fontSize: 21, bold: true, lineSpacingMultiple: 1.25 },
  );
}

pptx
  .writeFile({ fileName: OUT })
  .then(() => console.log("wrote", OUT))
  .catch((e) => {
    console.error("failed:", e.message);
    process.exit(1);
  });
