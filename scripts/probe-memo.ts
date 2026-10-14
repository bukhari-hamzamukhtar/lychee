/**
 * The ADI notice collapses the generator while the other two notices do not.
 * Vary only the notice portion of the prompt to find out which part of the
 * Evolus-translated text is responsible.
 */
import { loadEnv } from "./load-env";

loadEnv();
const BASE = process.env.AMD_BASE_URL!;
const KEY = process.env.AMD_API_KEY!;
const MODEL_ID = process.env.AMD_MODEL_GENERATE ?? "DeepSeek-V4-Flash";

/** Exactly what Evolus returned when translating the German notice. */
const TRANSLATED =
  "PRODUCT DISCONTINUATION (PDN 26_4471)\n\nDear Customer,\n\nWe hereby inform you that the " +
  "component ADUM1201ARZ (Dual-Channel Digital-Isolator)\nwill be discontinued due to the " +
  "transition of our wafer fab. The 180-nm process\nwill be discontinued at the end of the " +
  "year.\n\nLast Order Date (Last Time Buy): November 17, 2026  \nLast Delivery Date: " +
  "February 28, 2027  \n\nA direct replacement is not currently available. We recommend " +
  "covering\nrequirements through to the end of the product’s life.\n\nKind regards\n" +
  "Analog Devices Product Management";

const FIGURES = [
  "VERIFIED FIGURES, computed from our bill of materials:",
  "- part: ADUM1201ARZ, Digital isolator, dual channel, from Analog Devices",
  "- last-time-buy date: 2026-11-17, which is 34 days away",
  "- reaches 5 products via assemblies ASM-GATE-D, ASM-PWR-A, ASM-CTRL-B",
  "- per-unit usage: PSU-240 needs 6, MD-3000 needs 7, MD-7500 needs 13, HMI-7 needs 1, SRV-100 needs 1",
  "- consumption: 3024.5 pieces per week",
  "- stock on hand: 14200, which is 4.7 weeks of cover",
  "- replenishment lead time: 26 weeks",
  "- last-time-buy quantity required: 504798 pieces, EUR 1433626",
  "- annual revenue exposed: EUR 9058546",
  "- certifications requiring requalification: EN61800-3 (6.3.2 - galvanic isolation barrier components); UL61800-5-1 (4.4 - reinforced insulation components)",
  "- customers under contract affected: 6",
  "",
  "Write the memo for the procurement lead. State the decision required and the",
  "deadline first. End with the single action you recommend.",
].join("\n");

const SYSTEM =
  "You write procurement memos for a manufacturer. Be concrete and brief. " +
  "Use only the figures supplied; never invent or recompute a number. " +
  "No greeting, no sign-off. Six sentences at most.";

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const toAscii = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ");

async function probe(label: string, user: string) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL_ID,
      max_tokens: 500,
      temperature: 0.3,
      top_p: 1.0,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    console.log(`${label.padEnd(36)} HTTP ${res.status}`);
    return;
  }
  const d = await res.json();
  const c = d.choices?.[0];
  const t: string = c?.message?.content ?? "";
  const ok = c?.finish_reason === "stop" && t.trim().length > 60;
  console.log(
    `${label.padEnd(36)} ${ok ? "ok        " : "DEGENERATE"} finish=${String(
      c?.finish_reason,
    ).padEnd(7)} chars=${String(t.length).padStart(5)} promptChars=${user.length}`,
  );
  if (ok) console.log("     " + collapse(t).slice(0, 150));
}

(async () => {
  console.log(`model: ${MODEL_ID}\n`);
  await probe("A. full prompt, as the route sends", `SUPPLIER NOTICE (excerpt):\n${collapse(TRANSLATED).slice(0, 600)}\n\n${FIGURES}`);
  await probe("B. figures only, no notice", FIGURES);
  await probe("C. notice ascii-sanitised", `SUPPLIER NOTICE (excerpt):\n${toAscii(collapse(TRANSLATED)).slice(0, 600)}\n\n${FIGURES}`);
  await probe("D. notice trimmed to 200 chars", `SUPPLIER NOTICE (excerpt):\n${toAscii(collapse(TRANSLATED)).slice(0, 200)}\n\n${FIGURES}`);
  await probe("E. figures without cert clauses", FIGURES.replace(/- certifications.*\n/, "- certifications requiring requalification: EN61800-3, UL61800-5-1\n"));
  await probe("F. figures without per-unit line", FIGURES.replace(/- per-unit usage.*\n/, ""));
})();
