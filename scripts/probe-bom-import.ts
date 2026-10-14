/**
 * Does column inference survive headers it has never seen?
 *
 * The test file uses a third party's spellings on purpose — MPN, QTY per assy,
 * Next Assembly, Qty On Hand — none of which match our own field names.
 */
import { readFileSync } from "node:fs";
import { parseCsv, inferColumns, buildDataset, FIELD_LABELS, type Field } from "../lib/bom-import";

const path = process.argv[2];
const csv = readFileSync(path, "utf8");

const parsed = parseCsv(csv);
console.log("headers :", parsed.headers.join(" | "));
console.log("rows    :", parsed.rows.length);

const cols = inferColumns(parsed.headers);
console.log("\n--- inferred mapping ---");
for (const f of Object.keys(FIELD_LABELS) as Field[]) {
  const i = cols[f];
  console.log(
    `  ${FIELD_LABELS[f].padEnd(24)} ${i === undefined ? "— not found" : `"${parsed.headers[i]}"`}`,
  );
}

const result = buildDataset(parsed, cols, "Radar X1");
console.log("\n--- built ---");
console.log("  stats:", JSON.stringify(result.stats));
console.log("  products  :", result.dataset.nodes.filter((n) => n.kind === "product").map((n) => n.id).join(", "));
console.log("  assemblies:", result.dataset.nodes.filter((n) => n.kind === "assembly").map((n) => n.id).join(", "));
console.log("  suppliers :", result.dataset.suppliers.map((s) => s.name).join(", "));
if (result.warnings.length) {
  console.log("\n--- warnings ---");
  for (const w of result.warnings) console.log("  ·", w);
}

// run the engine against the imported dataset
import { setActiveDataset, impactOf, qtyPerProduct, allPartsByRisk } from "../lib/graph";
setActiveDataset(result.dataset);

console.log("\n--- engine, now running on the imported BOM ---");
console.log("  qtyPerProduct(HMC311ST89):", JSON.stringify(qtyPerProduct("HMC311ST89")));
const r = impactOf("HMC311ST89", "2027-03-31", new Date("2026-10-15T00:00:00Z"));
if (r) {
  console.log(`  ${r.partId}: ${r.verdict} (${r.criticality})`);
  console.log(`    reaches ${r.affectedProducts.length} product(s): ${r.affectedProducts.map((p) => `${p.productId} x${p.qtyPerUnit}`).join(", ")}`);
  console.log(`    stock ${r.stockQty}, ${r.runwayWeeks} wk cover vs ${r.leadTimeWeeks} wk lead, buy ${r.lastBuyQty} for EUR ${r.lastBuyCostEur}`);
}
console.log("  top risk:", allPartsByRisk().slice(0, 3).map((x) => `${x.partId} ${x.score}`).join(", "));
