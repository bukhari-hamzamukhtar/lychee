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
const W = 13.333;
const H = 7.5;

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
const slideDir = path.join(dir, "ppt", "slides");
const slides = fs
  .readdirSync(slideDir)
  .filter((f) => f.endsWith(".xml"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

let problems = 0;
console.log(`${path.basename(FILE)} — ${slides.length} slides\n`);

for (const file of slides) {
  const xml = fs.readFileSync(path.join(slideDir, file), "utf8");
  const n = file.match(/\d+/)[0];

  // every a:off/a:ext pair is one placed shape
  const offs = [...xml.matchAll(/<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/g)];
  const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
  const images = (xml.match(/<a:blip/g) || []).length;
  const dark = /srgbClr val="08090B"/.test(xml);

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

  const head = texts.find((t) => t.length > 12) || texts[0] || "(no text)";
  console.log(
    `  slide ${n.padStart(2)}  ${dark ? "dark " : "light"}  ` +
      `${String(offs.length).padStart(2)} shapes  ${images} image(s)  ${texts.length} runs`,
  );
  console.log(`            ${head.slice(0, 74)}`);
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
for (const want of ["Gemma", "AMD", "Evolus", "lychee", "graph traversal", "lychee-seven.vercel.app"]) {
  const hit = all.includes(want);
  if (!hit) problems++;
  console.log(`  ${hit ? "yes" : "NO "}  ${want}`);
}

fs.rmSync(dir, { recursive: true, force: true });
console.log(problems === 0 ? "\nfits, and says what it needs to." : `\n${problems} problem(s).`);
process.exit(problems === 0 ? 0 : 1);
