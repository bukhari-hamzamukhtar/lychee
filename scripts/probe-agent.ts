/** Check the Evolus agent answers from the standards documents, with citations. */
import { loadEnv } from "./load-env";

loadEnv();

import { askAgent } from "../lib/evolus";
import { docsMentioning, asContext } from "../lib/library";

const QUESTIONS = [
  "ADUM1201ARZ is being discontinued with no drop-in replacement. Which certifications re-open if we substitute it, and what evidence would the approval file need?",
  "Does stock bought under a last-time-buy keep the existing UL approval?",
  "Who has to approve a last-time-buy of EUR 1,433,626?",
  "What is the thermal derating curve for ADUM1201ARZ above 85 degrees?",
];

(async () => {
  const docs = docsMentioning("ADUM1201ARZ");
  console.log("documents in context:", docs.map((d) => d.id).join(", "));
  const context = asContext(docs);
  console.log("context size:", context.length, "chars");

  for (const q of QUESTIONS) {
    const t0 = Date.now();
    console.log("\n" + "=".repeat(72));
    console.log("Q: " + q);
    try {
      const r = await askAgent(q, context);
      console.log(`   [${((Date.now() - t0) / 1000).toFixed(1)}s via ${r.model}]\n`);
      console.log(r.text.trim());
    } catch (e) {
      console.log("FAILED: " + (e instanceof Error ? e.message : String(e)));
    }
  }
})();
