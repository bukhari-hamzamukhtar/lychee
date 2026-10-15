/**
 * The readers, against a real document and the shapes that break them.
 *
 * The Hittite case is the one that matters: its text is the actual OCR output
 * from the PDF, so a pass here is a pass on a document nobody wrote for us.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lastBuyDate, classify, labelled, tickedBoxes, dateIn } from "../lib/notice-read";

// The real OCR output, checked in, so this runs offline and costs nothing.
const real = readFileSync(join(__dirname, "fixtures", "hittite-pcn140002.txt"), "utf8")
  .split(/\r?\n/)
  .filter((l) => !l.startsWith("#"))
  .join("\n");

let failures = 0;
const is = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label.padEnd(46)} ${JSON.stringify(got)}`);
  if (!ok) console.log(`        wanted ${JSON.stringify(want)}`);
};

console.log("Hittite PCN140002, read off the real OCR text");
is("ticked categories", tickedBoxes(real), ["process"]);
is("type", classify(real, "eol").type, "change");
is("type came from", classify(real, "eol").from, 'the ticked category "process"');
is("last-time buy", lastBuyDate(real).date, "2014-02-01");
is("reason", labelled(real, ["reason for change"]), "Changing Sn/Pb plating vendor");

console.log("\nthe model is overridden, not trusted");
is("model says change, box says obsolete", classify("Category: Obsolete [X]", "change").type, "eol");
is("no box, heading says discontinuance", classify("Product Discontinuance Notice\nPDN 24-01", null).type, "eol");
is("no box, heading says PCN", classify("Product Change Notification\nPCN 140002", null).type, "change");
is("nothing to go on, model says change", classify("Dear customer,", "change").type, "change");
is("nothing at all", classify("Dear customer,", null).from, "assumed, because nothing in the document stated it");

console.log("\ndates manufacturers actually write");
is("ISO", dateIn("effective 2026-11-17"), "2026-11-17");
is("17 November 2026", dateIn("by 17 November 2026"), "2026-11-17");
is("November 17, 2026", dateIn("by November 17, 2026"), "2026-11-17");
is("day > 12 settles the order", dateIn("28/03/2014"), "2014-03-28");
is("two-digit year", dateIn("3/28/14"), "2014-03-28");
is("not a date", dateIn("lot code UB01"), null);

console.log("\nthe label wins over the first date on the page");
const many = [
  "PCN Date: 01/17/14",
  "Qualification Samples Available 2/1/2014",
  "Last-Time Buy for Unchanged Product 3/14/2014",
].join("\n");
is("picks the labelled line", lastBuyDate(many).date, "2014-03-14");
is("says which line", lastBuyDate(many).from, "Last-Time Buy for Unchanged Product 3/14/2014");
is("label on the next line", lastBuyDate("Last Time Buy\n2026-04-30").date, "2026-04-30");
is("no label, falls back and admits it", lastBuyDate("Notice dated 2026-01-05").from.startsWith("no last-time-buy label"), true);

console.log(failures === 0 ? "\nall pass" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
