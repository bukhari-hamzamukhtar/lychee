/** Sanity-check the impact engine by hand-checkable arithmetic. */
import { impactOf, qtyPerProduct, pathsToProducts, allPartsByRisk, rolledUpCost } from "../lib/graph";

const ASOF = new Date("2026-10-14T00:00:00Z");

console.log("=== qtyPerProduct(ADUM1201ARZ) ===");
console.log(qtyPerProduct("ADUM1201ARZ"));
console.log("\nexpected by hand:");
console.log("  MD-3000 : gate module 2 x 3 per power board x 1 board = 6, plus 1 on control board = 7");
console.log("  MD-7500 : 6 per power board x 2 boards = 12, plus 1 on control board = 13");
console.log("  PSU-240 : 6 x 1 power board = 6");
console.log("  SRV-100 : control board only = 1");
console.log("  HMI-7   : control board only = 1");

console.log("\n=== paths ===");
for (const p of pathsToProducts("ADUM1201ARZ")) console.log("  " + p.join(" -> "));

const r = impactOf("ADUM1201ARZ", "2026-11-17", ASOF);
if (!r) throw new Error("no report");

console.log("\n=== IMPACT REPORT ===");
console.log(`part            ${r.partId} (${r.partName})`);
console.log(`supplier        ${r.supplierName}`);
console.log(`last buy        ${r.lastBuyDate}  (${r.daysToLastBuy} days)`);
console.log(`assemblies      ${r.affectedAssemblies.join(", ")}`);
console.log(`products        ${r.affectedProducts.map((p) => `${p.productId} x${p.qtyPerUnit}`).join(", ")}`);
console.log(`customers       ${r.affectedCustomers.map((c) => c.name).join(", ")}`);
console.log(`certifications  ${r.affectedCertifications.map((c) => c.id).join(", ") || "none"}`);
console.log(`stock           ${r.stockQty.toLocaleString()} pcs`);
console.log(`consumption     ${r.weeklyConsumption}/week`);
console.log(`runway          ${r.runwayWeeks} weeks  (lead time 26)`);
console.log(`LAST BUY QTY    ${r.lastBuyQty.toLocaleString()} pcs = EUR ${r.lastBuyCostEur.toLocaleString()}`);
console.log(`revenue at risk EUR ${r.revenueAtRiskEur.toLocaleString()}/yr`);
console.log(`criticality     ${r.criticality} -> ${r.verdict}`);

console.log("\n=== cross-check consumption by hand ===");
const hand =
  (450 / 4.333) * 7 + (180 / 4.333) * 13 + (1200 / 4.333) * 6 + (95 / 4.333) * 1 + (320 / 4.333) * 1;
console.log(`  hand: ${Math.round(hand * 10) / 10}   engine: ${r.weeklyConsumption}`);
console.log(`  match: ${Math.abs(hand - r.weeklyConsumption) < 0.2 ? "YES" : "NO"}`);

console.log("\n=== rolled-up BOM cost ===");
for (const p of ["MD-3000", "MD-7500", "PSU-240", "SRV-100", "HMI-7"]) {
  console.log(`  ${p.padEnd(9)} EUR ${rolledUpCost(p).toFixed(2)}`);
}

console.log("\n=== forward risk ranking (top 6) ===");
for (const x of allPartsByRisk().slice(0, 6)) {
  console.log(`  ${String(x.score).padStart(3)}  ${x.partId}`);
}

console.log("\n=== a part that should be low impact ===");
const low = impactOf("LCD-TX18D42", "2027-09-30", ASOF)!;
console.log(`  ${low.partId}: ${low.affectedProducts.length} product, criticality ${low.criticality} -> ${low.verdict}`);
