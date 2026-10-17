/**
 * Does the deck fit on its slides?
 *
 * There is no LibreOffice on this machine to render the thing, so the file is
 * read instead: unzip it, walk the shape tree, and check every box against the
 * 13.333 x 7.5 inch page. Overflow is the failure that actually happens when a
 * deck is generated rather than dragged into place, and it is invisible until
 * somebody opens the file in front of a room.
 *
 *   node submission/check-deck.js [path/to.pptx]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const FILE = process.argv[2] || path.join(__dirname, "LastBuy.pptx");
const EMU = 914400; // English Metric Units per inch

/** pptx is a zip; PowerShell can open one without us adding a dependency. */
function unzip(file) {
  const out = path.join(require("os").tmpdir(), "deckcheck-" + Date.now());
  fs.mkdirSync(out, { recursive: true });
  // Expand-Archive refuses anything not named .zip, and a pptx is a zip.
  const asZip = out + ".zip";
  fs.copyFileSync(file, asZip);
  execFileSync("powershell", [
    "-NoProfile",
    "-Command",
    `Expand-Archive -LiteralPath '${asZip}' -DestinationPath '${out}' -Force`,
  ]);
  fs.rmSync(asZip, { force: true });
  return out;
}

const dir = unzip(FILE);

// Read the page size out of the file rather than assuming it. Assuming it is
// how the first version of this passed a deck whose every slide overflowed.
const presXml = fs.readFileSync(path.join(dir, "ppt", "presentation.xml"), "utf8");
const size = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
if (!size) {
  console.error("could not read the slide size from presentation.xml");
  process.exit(1);
}
const W = +size[1] / EMU;
const H = +size[2] / EMU;
console.log(`page: ${W.toFixed(3)}in x ${H.toFixed(3)}in`);

const slideDir = path.join(dir, "ppt", "slides");
const slides = fs
  .readdirSync(slideDir)
  .filter((f) => f.endsWith(".xml"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

let problems = 0;
console.log(`${path.basename(FILE)} — ${slides.length} slides\n`);

for (const file of slides) {
  // Shapes named "deco" are the background circles, drawn hanging off the page
  // on purpose. Everything else has to fit.
  const xml = fs
    .readFileSync(path.join(slideDir, file), "utf8")
    .split("<p:sp>")
    .filter((chunk, i) => i === 0 || !/<p:cNvPr id="\d+" name="deco"/.test(chunk.split("</p:sp>")[0]))
    .join("<p:sp>");
  const n = file.match(/\d+/)[0];

  // every a:off/a:ext pair is one placed shape
  const offs = [...xml.matchAll(/<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/g)];
  const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
  const images = (xml.match(/<a:blip/g) || []).length;
  const dark = /<p:bg>[\s\S]*?srgbClr val="(08090B|0B0C0F)"/.test(xml);

  let worst = null;
  for (const m of offs) {
    const x = +m[1] / EMU, y = +m[2] / EMU, w = +m[3] / EMU, h = +m[4] / EMU;
    const overRight = x + w - W;
    const overBottom = y + h - H;
    const over = Math.max(overRight, overBottom);
    if (over > 0.02 && (!worst || over > worst.over)) {
      worst = { over, x, y, w, h, side: overRight > overBottom ? "right" : "bottom" };
    }
  }

  // Will the words fit inside their own box? Overflow past the page edge is the
  // easy failure; text spilling out of a box that is on the page is the one that
  // actually makes a deck look broken, and the XML cannot show it directly. So
  // estimate: Arial averages about half an em per character, so lines are the
  // text length over what fits in the box width, and height is lines times the
  // font size times the line spacing.
  const spills = [];
  // each shape ends at its own closing tag; without this a table that follows a
  // shape is read as part of it
  for (const sp of xml.split("<p:sp>").slice(1).map((c) => c.split("</p:sp>")[0])) {
    const box = sp.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/);
    if (!box) continue;
    const bw = +box[3] / EMU, bh = +box[4] / EMU;
    if (bw < 0.2 || bh < 0.12) continue;
    const spacing = +(sp.match(/<a:spcPct val="(\d+)"/)?.[1] ?? 100000) / 100000;
    let need = 0;
    for (const para of sp.split("<a:p>").slice(1)) {
      const runs = [...para.matchAll(/<a:rPr[^>]*?sz="(\d+)"[^>]*>[\s\S]*?<a:t>([^<]*)<\/a:t>/g)];
      if (!runs.length) continue;
      const pt = Math.max(...runs.map((r) => +r[1] / 100));
      // count characters as they will be drawn, not as XML escapes them
      const chars = runs.reduce((n, r) => n + r[2].replace(/&[a-z]+;/g, "_").length, 0);
      const perLine = Math.max(1, (bw * 72) / (pt * 0.52));
      // a soft line break inside a paragraph is written as <a:br/>
      const breaks = (para.match(/<a:br\/>/g) || []).length;
      const lines = Math.max(1, Math.ceil(chars / perLine)) + breaks;
      need += (lines * pt * 1.2 * Math.max(spacing, 1)) / 72;
    }
    if (need > bh * 1.15 + 0.05) {
      const t = (sp.match(/<a:t>([^<]*)<\/a:t>/) || [, ""])[1];
      spills.push(`"${t.slice(0, 40)}" needs ~${need.toFixed(2)}in, box is ${bh.toFixed(2)}in`);
    }
  }

  const head = texts.find((t) => t.length > 12) || texts[0] || "(no text)";
  console.log(
    `  slide ${n.padStart(2)}  ${dark ? "dark " : "light"}  ` +
      `${String(offs.length).padStart(2)} shapes  ${images} image(s)  ${texts.length} runs`,
  );
  console.log(`            ${head.slice(0, 74)}`);
  for (const sp of spills) {
    problems++;
    console.log(`            TEXT SPILLS  ${sp}`);
  }
  if (worst) {
    problems++;
    console.log(
      `            OVERFLOWS ${worst.side} by ${worst.over.toFixed(2)}in ` +
        `(box ${worst.x.toFixed(2)},${worst.y.toFixed(2)} ${worst.w.toFixed(2)}x${worst.h.toFixed(2)})`,
    );
  }
}

// the things a reviewer is looking for have to actually be in the file
const all = slides
  .map((f) => fs.readFileSync(path.join(slideDir, f), "utf8"))
  .join(" ")
  .replace(/<[^>]+>/g, "");
console.log("\nmentions:");
for (const want of ["Gemma", "AMD", "Evolus", "lychee", "Vigil", "Contributions"]) {
  const hit = all.includes(want);
  if (!hit) problems++;
  console.log(`  ${hit ? "yes" : "NO "}  ${want}`);
}

fs.rmSync(dir, { recursive: true, force: true });
console.log(problems === 0 ? "\nfits, and says what it needs to." : `\n${problems} problem(s).`);
process.exit(problems === 0 ? 0 : 1);
