/**
 * The LastBuy deck.
 *
 *   node submission/build-deck.js
 *
 * Nine slides. The first and the last are dark, the seven in between are light,
 * which is exactly how the product behaves — so the deck and the thing it is
 * about look like one piece of work.
 *
 * Colours are lifted straight out of app/globals.css rather than picked again
 * here. Arial throughout, because the app is all sans and a serif heading would
 * read as a different product; part numbers and endpoints are set in Consolas,
 * the way the app sets them in mono.
 *
 * Needs pptxgenjs, which is deliberately not a dependency of the app.
 */
const path = require("path");
const pptxgen = require("pptxgenjs");

const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, "screenshots");
const OUT = process.env.OUT_FILE || path.join(__dirname, "LastBuy.pptx");
const shot = (n) => path.join(SHOTS, n);

/* ---------------------------------------------------------------- palette */

const DARK = {
  bg: "08090B",
  line: "262A31",
  fg: "F6F7F9",
  mid: "D6DBE2",
  dim: "B2BBC5",
  accent: "FF5A3D",
};

const LIGHT = {
  bg: "FFFFFF",
  line: "DFE1E5",
  fg: "111317",
  mid: "373D47",
  dim: "5C636E",
  accent: "D62D12",
};

const SANS = "Arial";
const MONO = "Consolas";

const pptx = new pptxgen();
// LAYOUT_16x9 is 10 x 5.625in, which is a trap: it is 16:9 but it is not the
// widescreen page everything here is positioned for. LAYOUT_WIDE is the
// 13.333 x 7.5in one. Getting this wrong pushes a third of every slide off the
// page, and it looks fine in the XML because the shapes are where you put them.
pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 inches
pptx.author = "Hamza Mukhtar Bukhari";
pptx.company = "LastBuy";
pptx.title = "LastBuy - know what a discontinued part breaks";

const W = 13.333;
const H = 7.5;
const M = 0.85;

function slide(theme) {
  const s = pptx.addSlide();
  s.background = { color: theme.bg };
  return s;
}

/** The small uppercase label the app puts above every section. */
function eyebrow(s, text, theme, y = 0.62) {
  s.addText(text.toUpperCase(), {
    x: M, y, w: W - M * 2, h: 0.3,
    fontFace: SANS, fontSize: 11, bold: true, charSpacing: 2.2, color: theme.dim,
  });
}

function rule(s, theme, y, x = M, w = W - M * 2) {
  s.addShape(pptx.ShapeType.rect, {
    x, y, w, h: 0.012,
    fill: { color: theme.line },
    line: { width: 0 },
  });
}

/** Who is running this. On every light slide, because three reviewers need it. */
function partners(s, theme, y = H - 0.72) {
  rule(s, theme, y - 0.22);
  const bits = [
    ["MODEL", "Gemma-4-31B-IT"],
    ["ON", "AMD Instinct"],
    ["VIA", "Evolus / lychee"],
    ["ENGINE", "no model"],
  ];
  let x = M;
  for (const [k, v] of bits) {
    s.addText(k, {
      x, y, w: 0.85, h: 0.26,
      fontFace: SANS, fontSize: 9, bold: true, charSpacing: 1.6, color: theme.dim,
    });
    s.addText(v, {
      x: x + 0.78, y, w: 2.3, h: 0.26,
      fontFace: MONO, fontSize: 10, color: theme.mid,
    });
    x += 3.0;
  }
}

/** One big number with a word under it. The deck's main visual device. */
function figure(s, theme, { x, y, w, value, label, accent = false, size = 40 }) {
  s.addText(value, {
    x, y, w, h: 0.8,
    fontFace: SANS, fontSize: size, bold: true,
    color: accent ? theme.accent : theme.fg,
  });
  s.addText(label, {
    x, y: y + 0.82, w, h: 0.7,
    fontFace: SANS, fontSize: 12.5, color: theme.dim, lineSpacingMultiple: 1.2,
  });
}

/* ------------------------------------------------------------- 1. title */

{
  const s = slide(DARK);
  s.addText("LastBuy", {
    x: M, y: 2.15, w: 7, h: 0.9,
    fontFace: SANS, fontSize: 46, bold: true, color: DARK.fg,
  });
  s.addText(
    [
      { text: "Know what a discontinued part costs you ", options: { color: DARK.fg } },
      { text: "before the window shuts.", options: { color: DARK.accent } },
    ],
    { x: M, y: 3.15, w: 8.6, h: 1.7, fontFace: SANS, fontSize: 27, lineSpacingMultiple: 1.22 },
  );
  s.addText("AMD Developer Hackathon: ACT III   ·   Intelligent Industry   ·   Hamza Mukhtar Bukhari", {
    x: M, y: 5.3, w: 11, h: 0.3, fontFace: SANS, fontSize: 13, color: DARK.dim,
  });
  rule(s, DARK, 5.9, M, 5.2);
  s.addText("Gemma-4-31B-IT on AMD Instinct   ·   Evolus workspace lychee   ·   lychee-seven.vercel.app", {
    x: M, y: 6.1, w: 11.6, h: 0.3, fontFace: MONO, fontSize: 11, color: DARK.mid,
  });
}

/* ------------------------------------------------------------ 2. problem */

{
  const s = slide(LIGHT);
  eyebrow(s, "The problem", LIGHT);
  s.addText("A letter arrives. Your part is dead in 34 days.", {
    x: M, y: 1.05, w: 7.0, h: 1.3,
    fontFace: SANS, fontSize: 30, bold: true, color: LIGHT.fg, lineSpacingMultiple: 1.14,
  });
  s.addText(
    "Someone now has to work out which products use it, which customers are under " +
      "contract, which certificates re-open, and how many to buy before the door shuts.",
    { x: M, y: 2.55, w: 6.3, h: 1.2, fontFace: SANS, fontSize: 15, color: LIGHT.mid, lineSpacingMultiple: 1.35 },
  );
  s.addText("Miss the date and the part is gone for good. You redesign the product, or you stop building it.", {
    x: M, y: 3.85, w: 6.3, h: 0.9, fontFace: SANS, fontSize: 15, color: LIGHT.fg, lineSpacingMultiple: 1.35,
  });

  rule(s, LIGHT, 1.2, 8.0, 4.5);
  figure(s, LIGHT, { x: 8.0, y: 1.4, w: 4.5, value: "Days", label: "to work one notice out by hand" });
  rule(s, LIGHT, 3.05, 8.0, 4.5);
  figure(s, LIGHT, { x: 8.0, y: 3.25, w: 4.5, value: "3", label: "people usually pulled in" });
  rule(s, LIGHT, 4.9, 8.0, 4.5);
  figure(s, LIGHT, { x: 8.0, y: 5.1, w: 4.5, value: "0", label: "chances to buy it again afterwards", accent: true });

  partners(s, LIGHT);
}

/* -------------------------------------------------------- 3. what it does */

{
  const s = slide(LIGHT);
  eyebrow(s, "What it does", LIGHT);
  s.addText("Drop the letter in. Get the damage.", {
    x: M, y: 1.0, w: 6.2, h: 0.8, fontFace: SANS, fontSize: 28, bold: true, color: LIGHT.fg,
  });

  const rows = [
    ["Reads any notice", "A PDF, a scan, a photo. Any language.", "27s"],
    ["Traces the part", "Through your bill of materials, up to every product.", "5 products"],
    ["Prices the decision", "What to buy, what it costs, what it protects.", "EUR 1.4M"],
    ["Shows its working", "Every figure is arithmetic you can replay.", "0 guessed"],
  ];
  let y = 2.0;
  for (const [title, body, num] of rows) {
    rule(s, LIGHT, y - 0.14, M, 6.5);
    s.addText(title, { x: M, y, w: 3.0, h: 0.3, fontFace: SANS, fontSize: 15, bold: true, color: LIGHT.fg });
    s.addText(body, { x: M, y: y + 0.32, w: 4.5, h: 0.4, fontFace: SANS, fontSize: 12, color: LIGHT.dim });
    s.addText(num, {
      x: M + 4.6, y, w: 1.9, h: 0.35,
      fontFace: SANS, fontSize: 16, bold: true, color: LIGHT.accent, align: "right",
    });
    y += 1.05;
  }

  s.addImage({ path: shot("13-notice-impact.png"), x: 7.9, y: 1.05, w: 4.6, h: 2.59 });
  s.addText("One notice, opened. Everything under it is computed.", {
    x: 7.9, y: 3.75, w: 4.6, h: 0.3, fontFace: SANS, fontSize: 11, color: LIGHT.dim,
  });

  partners(s, LIGHT);
}

/* ------------------------------------------------- 4. the graph, not a model */

{
  const s = slide(LIGHT);
  eyebrow(s, "How the numbers are made", LIGHT);
  s.addText("The money is a graph walk. No model touches it.", {
    x: M, y: 1.0, w: 7.0, h: 1.2,
    fontFace: SANS, fontSize: 27, bold: true, color: LIGHT.fg, lineSpacingMultiple: 1.14,
  });
  s.addText(
    "One isolator sits under five finished products. We walk the bill of materials from " +
      "the part up to each of them, multiplying quantities on the way. Ask again and you " +
      "get the same answer, because it is arithmetic.",
    { x: M, y: 2.35, w: 5.5, h: 1.5, fontFace: SANS, fontSize: 14, color: LIGHT.mid, lineSpacingMultiple: 1.35 },
  );
  s.addText(
    [
      { text: "Models read documents and write the memo.\n", options: { color: LIGHT.mid } },
      { text: "They never make a number you act on.", options: { color: LIGHT.fg, bold: true } },
    ],
    { x: M, y: 3.95, w: 5.5, h: 0.9, fontFace: SANS, fontSize: 14, lineSpacingMultiple: 1.35 },
  );

  figure(s, LIGHT, { x: M, y: 5.0, w: 2.4, value: "5", label: "products it reaches", size: 36 });
  figure(s, LIGHT, { x: M + 2.6, y: 5.0, w: 3.2, value: "EUR 9.05M", label: "revenue behind them, a year", accent: true, size: 36 });

  s.addImage({ path: shot("01-landing-hero.png"), x: 7.0, y: 1.4, w: 5.5, h: 3.09 });
  s.addText("The same part, traced on screen.", {
    x: 7.0, y: 4.6, w: 5.5, h: 0.3, fontFace: SANS, fontSize: 11, color: LIGHT.dim,
  });

  partners(s, LIGHT);
}

/* ------------------------------------------------------- 5. the real letter */

{
  const s = slide(LIGHT);
  eyebrow(s, "On a real document", LIGHT);
  s.addText("We tested it on a letter nobody wrote for us.", {
    x: M, y: 1.0, w: 7.6, h: 0.85, fontFace: SANS, fontSize: 27, bold: true, color: LIGHT.fg,
  });
  s.addText(
    "Hittite Microwave PCN140002 - a real 2014 notice, 488 KB, scanned. It is a form, so " +
      "we read the form first and only ask a model for what the page does not say.",
    { x: M, y: 1.9, w: 6.2, h: 1.0, fontFace: SANS, fontSize: 14, color: LIGHT.mid, lineSpacingMultiple: 1.35 },
  );

  const compare = [
    ["", "model always", "form first"],
    ["OCR on AMD", "42s", "27s"],
    ["Evolus extraction", "17s", "skipped"],
    ["Model normalisation", "103s", "skipped"],
    ["Total", "161s", "27s"],
    ["Cost", "10.4 credits", "nothing"],
  ];
  let y = 3.1;
  for (const [k, a, b] of compare) {
    const head = k === "";
    const total = k === "Total" || k === "Cost";
    if (!head) rule(s, LIGHT, y - 0.1, M, 6.2);
    s.addText(k, {
      x: M, y, w: 2.4, h: 0.3, fontFace: SANS, fontSize: 12.5,
      bold: total, color: total ? LIGHT.fg : LIGHT.dim,
    });
    s.addText(a, { x: M + 2.4, y, w: 1.8, h: 0.3, fontFace: SANS, fontSize: 12.5, color: LIGHT.dim, align: "right" });
    s.addText(b, {
      x: M + 4.3, y, w: 1.9, h: 0.3, fontFace: SANS, fontSize: 12.5,
      bold: total, color: head ? LIGHT.dim : LIGHT.accent, align: "right",
    });
    y += head ? 0.42 : 0.5;
  }

  s.addText("Vercel kills a request at 60 seconds. The left column does not just cost more - it fails.", {
    x: M, y: 6.2, w: 6.3, h: 0.5, fontFace: SANS, fontSize: 12, color: LIGHT.mid, lineSpacingMultiple: 1.3,
  });

  s.addImage({ path: shot("02-notices-empty.png"), x: 7.5, y: 1.9, w: 5.0, h: 2.81 });
  s.addText("Five parts matched. Last-time buy 2014-02-01, read off its own label.", {
    x: 7.5, y: 4.85, w: 5.0, h: 0.5, fontFace: SANS, fontSize: 11, color: LIGHT.dim, lineSpacingMultiple: 1.3,
  });

  partners(s, LIGHT);
}

/* ------------------------------------------------------------------ 6. ask */

{
  const s = slide(LIGHT);
  eyebrow(s, "Ask", LIGHT);
  s.addText("Bring your own documents. Every answer says where it came from.", {
    x: M, y: 1.0, w: 5.6, h: 1.6,
    fontFace: SANS, fontSize: 25, bold: true, color: LIGHT.fg, lineSpacingMultiple: 1.14,
  });
  s.addText(
    "Drop in as many files as you like and ask across all of them at once. A claim read " +
      "from a document ends with the filename. A figure computed from the bill of " +
      "materials ends with [engine]. The two are never mixed up.",
    { x: M, y: 2.75, w: 5.3, h: 1.5, fontFace: SANS, fontSize: 13.5, color: LIGHT.mid, lineSpacingMultiple: 1.35 },
  );
  s.addText(
    "When the window fills, the chat is not summarised. It becomes claims - each with " +
      "its subject, how it is known, and which document it came from - and the messages " +
      "are thrown away. A summary cannot be checked. A claim can.",
    { x: M, y: 4.35, w: 5.3, h: 1.6, fontFace: SANS, fontSize: 13.5, color: LIGHT.fg, lineSpacingMultiple: 1.35 },
  );

  s.addImage({ path: shot("14-ask-in-use.png"), x: 6.4, y: 1.25, w: 6.1, h: 3.43 });
  s.addText("2.1 seconds. $0.000039.", {
    x: 6.4, y: 4.8, w: 6.1, h: 0.3, fontFace: MONO, fontSize: 12, color: LIGHT.accent,
  });

  partners(s, LIGHT);
}

/* ------------------------------------------------------- 7. what it runs on */

{
  const s = slide(LIGHT);
  eyebrow(s, "What it runs on", LIGHT);
  s.addText("Three partners, and one file that proves it.", {
    x: M, y: 1.0, w: 8.4, h: 0.85, fontFace: SANS, fontSize: 28, bold: true, color: LIGHT.fg,
  });

  const stack = [
    ["Gemma-4-31B-IT", "Google's open model. Reads notices, writes memos, answers in Ask.", "2.1s an answer"],
    ["AMD Instinct", "developer.amd.com.cn - MinerU2.5-Pro reads, Gemma does the rest.", "every model call"],
    ["Evolus / lychee", "Agent, AI Tools and a knowledge library, driven through the REST API.", "cites its clauses"],
    ["lib/graph.ts", "The impact engine. Pure traversal - no model is involved at all.", "replayable"],
  ];
  let y = 2.15;
  for (const [name, body, tag] of stack) {
    rule(s, LIGHT, y - 0.14);
    s.addText(name, { x: M, y, w: 3.3, h: 0.32, fontFace: MONO, fontSize: 14, bold: true, color: LIGHT.fg });
    s.addText(body, { x: M + 3.4, y: y + 0.02, w: 5.9, h: 0.4, fontFace: SANS, fontSize: 12.5, color: LIGHT.dim });
    s.addText(tag, { x: M + 9.4, y, w: 2.1, h: 0.32, fontFace: SANS, fontSize: 12, color: LIGHT.accent, align: "right" });
    y += 0.92;
  }

  rule(s, LIGHT, y - 0.1);
  s.addText(
    "lib/amd.ts is the only file in the repository that reaches an inference provider. " +
      "Grep it for openai, anthropic, groq or fireworks and nothing comes back.",
    { x: M, y: y + 0.14, w: 11.6, h: 0.6, fontFace: SANS, fontSize: 13, color: LIGHT.mid, lineSpacingMultiple: 1.3 },
  );

  partners(s, LIGHT);
}

/* ----------------------------------------------------------------- 8. cost */

{
  const s = slide(LIGHT);
  eyebrow(s, "What it costs", LIGHT);
  s.addText("Cheap enough to run on everything.", {
    x: M, y: 1.0, w: 7.4, h: 0.85, fontFace: SANS, fontSize: 28, bold: true, color: LIGHT.fg,
  });
  s.addText(
    "Most teams triage - they only look at the notices that seem important. That is how " +
      "the expensive ones get missed. At this price you read all of them.",
    { x: M, y: 1.95, w: 6.4, h: 1.1, fontFace: SANS, fontSize: 14, color: LIGHT.mid, lineSpacingMultiple: 1.35 },
  );

  rule(s, LIGHT, 3.35, M, 11.6);
  figure(s, LIGHT, { x: M, y: 3.6, w: 3.0, value: "$0.00012", label: "a complete assessment", accent: true, size: 32 });
  figure(s, LIGHT, { x: M + 3.1, y: 3.6, w: 2.6, value: "27s", label: "a scanned notice, end to end", size: 32 });
  figure(s, LIGHT, { x: M + 5.9, y: 3.6, w: 2.6, value: "0", label: "credits when the form says it plainly", size: 32 });
  figure(s, LIGHT, { x: M + 8.7, y: 3.6, w: 2.8, value: "60s", label: "the request limit we had to fit inside", size: 32 });

  s.addText("Every stage reports its own cost on screen, so nobody has to take our word for it.", {
    x: M, y: 5.55, w: 11.6, h: 0.4, fontFace: SANS, fontSize: 13, color: LIGHT.fg,
  });

  partners(s, LIGHT);
}

/* -------------------------------------------------- 9. contributions + close */

{
  const s = slide(DARK);

  s.addText("Contributions", {
    x: M, y: 0.8, w: 6.0, h: 0.6,
    fontFace: SANS, fontSize: 30, bold: true, color: DARK.fg,
  });
  s.addText("What this is actually for.", {
    x: M, y: 1.45, w: 6.0, h: 0.35, fontFace: SANS, fontSize: 14, color: DARK.dim,
  });

  const gives = [
    ["Keeps products alive", "A missed last-time buy ends a product line. Nobody meant to miss it - they just could not work it out in time."],
    ["Not only for big firms", "A hundredth of a cent a notice, and your own spreadsheet is the input. No enterprise licence, no data migration."],
    ["Numbers you can check", "Every figure is arithmetic over your bill of materials. Nobody should sign a 1.4 million euro order on a model's word."],
    ["Less thrown away", "Buy the quantity the maths gives you, not the panic order that gets scrapped three years later."],
  ];
  let y = 2.1;
  for (const [title, body] of gives) {
    rule(s, DARK, y - 0.14, M, 6.0);
    s.addText(title, {
      x: M, y, w: 6.0, h: 0.3, fontFace: SANS, fontSize: 14.5, bold: true, color: DARK.accent,
    });
    s.addText(body, {
      x: M, y: y + 0.34, w: 6.0, h: 0.62,
      fontFace: SANS, fontSize: 11.5, color: DARK.mid, lineSpacingMultiple: 1.28,
    });
    y += 1.18;
  }

  // the closing line, on the right
  s.addText(
    [
      { text: "Obsolescence management is already an industry.\n", options: { color: DARK.fg } },
      { text: "Every tool in it is a database you search.\n\n", options: { color: DARK.fg } },
      { text: "This one reads the letter and tells you what breaks.", options: { color: DARK.accent } },
    ],
    { x: 7.5, y: 1.9, w: 5.0, h: 2.6, fontFace: SANS, fontSize: 20, bold: true, lineSpacingMultiple: 1.25 },
  );

  rule(s, DARK, 4.85, 7.5, 5.0);
  const links = [
    ["LIVE", "lychee-seven.vercel.app"],
    ["CODE", "github.com/bukhari-hamzamukhtar"],
    ["EVOLUS WORKSPACE", "lychee"],
  ];
  let ly = 5.05;
  for (const [k, v] of links) {
    s.addText(k, {
      x: 7.5, y: ly, w: 2.4, h: 0.26,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 1.4, color: DARK.dim,
    });
    s.addText(v, { x: 9.3, y: ly, w: 3.2, h: 0.26, fontFace: MONO, fontSize: 11.5, color: DARK.fg });
    ly += 0.42;
  }

  s.addText("Gemma-4-31B-IT on AMD Instinct   ·   Evolus   ·   impact by graph traversal, not generation", {
    x: M, y: 6.85, w: 11.6, h: 0.3, fontFace: SANS, fontSize: 11, color: DARK.mid,
  });
}

pptx
  .writeFile({ fileName: OUT })
  .then(() => console.log("wrote", OUT))
  .catch((e) => {
    console.error("failed:", e.message);
    process.exit(1);
  });
