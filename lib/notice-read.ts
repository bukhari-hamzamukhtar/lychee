/**
 * Reading a supplier notice.
 *
 * Everything here is a pure function of the text a document OCR'd to: no
 * network, no model, no state. That is deliberate. The parts of this pipeline
 * that can be checked against a real document should be checkable without
 * spending a request, and the parts that cost money should be the ones that
 * genuinely need a model.
 */
import type { Pcn } from "./types";

export const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Labels a manufacturer might put beside the date that actually matters. */
export const LTB_LABELS = [
  "last time buy", "last-time buy", "lasttime buy", "last time-buy",
  "last order date", "last buy", "ltb", "last time order",
  "final order", "last purchase", "letzter bestelltermin", "last time buy date",
];

export function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Pull a date out of one line of text.
 *
 * Covers what manufacturers actually write: ISO, "17 November 2026",
 * "November 17, 2026", and numeric forms. Numeric day/month order is genuinely
 * ambiguous — 2/1/2014 is February 1st to a US manufacturer and January 2nd to
 * a European one — so a value above twelve settles it and otherwise month-first
 * is assumed, which is the convention in the notices this was tested against.
 */
export function dateIn(text: string): string | null {
  const isoM = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoM) return iso(+isoM[1], +isoM[2], +isoM[3]);

  // Escapes are doubled: inside a template literal "\b" is a backspace and
  // "\d" is just the letter d, so single-escaped patterns match nothing.
  const dmy = text.match(
    new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS.join("|")})\\w*\\s+(20\\d{2})\\b`, "i"),
  );
  if (dmy) return iso(+dmy[3], MONTHS.indexOf(dmy[2].toLowerCase()) + 1, +dmy[1]);

  const mdy = text.match(
    new RegExp(`\\b(${MONTHS.join("|")})\\w*\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b`, "i"),
  );
  if (mdy) return iso(+mdy[3], MONTHS.indexOf(mdy[1].toLowerCase()) + 1, +mdy[2]);

  const num = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2}|\d{2})\b/);
  if (num) {
    let [a, b] = [+num[1], +num[2]];
    const yr = num[3].length === 2 ? 2000 + +num[3] : +num[3];
    if (a > 12 && b <= 12) return iso(yr, b, a);   // unambiguously day-first
    return iso(yr, a, b);                          // otherwise month-first
  }
  return null;
}

/**
 * Prefer the date sitting beside a last-time-buy label, and only fall back to
 * the first date anywhere. A notice is full of dates — qualification samples,
 * first shipment, the notice's own date — and the wrong one is worse than none.
 */
export function lastBuyDate(text: string): { date: string | null; from: string } {
  const lines = text.split(/\n+/);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!LTB_LABELS.some((l) => lower.includes(l))) continue;
    const d = dateIn(line);
    if (d) return { date: d, from: line.trim().slice(0, 90) };
  }
  // the label and its date sometimes land on consecutive lines
  for (let i = 0; i < lines.length - 1; i++) {
    if (!LTB_LABELS.some((l) => lines[i].toLowerCase().includes(l))) continue;
    const d = dateIn(lines[i + 1]);
    if (d) return { date: d, from: `${lines[i].trim()} / ${lines[i + 1].trim()}`.slice(0, 90) };
  }
  for (const line of lines) {
    const d = dateIn(line);
    if (d) return { date: d, from: `no last-time-buy label found; used "${line.trim().slice(0, 60)}"` };
  }
  return { date: null, from: "" };
}

/** Words that, inside a ticked category, mean the part is going away. */
export const EOL_WORDS = ["obsolete", "obsolescence", "discontinu", "end of life", "end-of-life"];

/**
 * Categories the manufacturer ticked on its own form.
 *
 * JEDEC's JESD46 gives a change notice a row of categories with one box marked:
 *
 *   Product Change Category: Process [X] Form [] Fit [] Function []
 *   Reliability [ ] Obsolete [ ]
 *
 * That tick is the manufacturer's own answer to what kind of notice this is,
 * which is better evidence than a model's reading of the prose around it.
 */
export function tickedBoxes(text: string): string[] {
  const out: string[] = [];
  const re = /([A-Za-z][A-Za-z \/-]{1,30}?)\s*\[\s*([xX\u2713\u2714])\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1].trim().toLowerCase());
  return out;
}

/**
 * Decide whether a notice ends a part or changes it.
 *
 * The distinction is not cosmetic. An end-of-life notice means buy the last of
 * it or redesign; a change notice means requalify and keep buying. Treating a
 * plating-vendor change as a discontinuance would put a redesign on a schedule
 * that does not need one.
 *
 * Ticked box first, then the notice's own heading, then the model — and each
 * path reports where it came from, so a wrong call is traceable to the line
 * that caused it instead of appearing as an unexplained label on a screen.
 */
export function classify(text: string, modelSaid: unknown): { type: Pcn["type"]; from: string } {
  const boxes = tickedBoxes(text);
  if (boxes.length) {
    const eol = boxes.find((b) => EOL_WORDS.some((w) => b.includes(w)));
    if (eol) return { type: "eol", from: `the ticked category "${eol}"` };
    return { type: "change", from: `the ticked category "${boxes[0]}"` };
  }

  // A discontinuance notice says so at the top; so does a change notice.
  const head = text.slice(0, 700).toLowerCase();
  if (/product discontinuance|end[- ]of[- ]life|discontinuation notice|\bpdn\b/.test(head)) {
    return { type: "eol", from: "the heading of the notice" };
  }
  if (/process change|product change notification|change notification|\bpcn\b/.test(head)) {
    return { type: "change", from: "the heading of the notice" };
  }

  return modelSaid === "change"
    ? { type: "change", from: "the model's reading of the text" }
    : { type: "eol", from: "assumed, because nothing in the document stated it" };
}

/** The value printed after a label on the same line — "Reason for Change: ...". */
export function labelled(text: string, labels: string[]): string {
  for (const line of text.split(/\n+/)) {
    const lower = line.toLowerCase();
    for (const l of labels) {
      const i = lower.indexOf(l);
      if (i < 0) continue;
      const after = line.slice(i + l.length).replace(/^[\s:\u2013\u2014-]+/, "").trim();
      if (after.length > 3) return after.slice(0, 220);
    }
  }
  return "";
}
