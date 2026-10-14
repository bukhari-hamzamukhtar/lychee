/**
 * Find out what actually makes Gemma-4-31B collapse into repetition, by
 * varying one thing at a time against the real endpoint. Built as a script
 * rather than shell so prompt text survives intact.
 */
import { loadEnv } from "./load-env";

loadEnv();

const BASE = process.env.AMD_BASE_URL!;
const KEY = process.env.AMD_API_KEY!;

const FIGURES = [
  "VERIFIED FIGURES, computed from our bill of materials:",
  "- part: ADUM1201ARZ, digital isolator, from Analog Devices",
  "- last-time-buy date: 2026-11-17, which is 34 days away",
  "- reaches 5 products via assemblies ASM-GATE-D, ASM-PWR-A, ASM-CTRL-B",
  "- consumption: 3024.5 pieces per week",
  "- stock on hand: 14200, which is 4.7 weeks of cover",
  "- replenishment lead time: 26 weeks",
  "- last-time-buy quantity required: 504798 pieces, EUR 1433626",
  "- certifications requiring requalification: EN61800-3, UL61800-5-1",
  "",
  "Write the memo for the procurement lead. State the decision required and the",
  "deadline first. End with the single action you recommend.",
].join("\n");

const NOTICE = [
  "PRODUCT DISCONTINUATION (PDN 26_4471)",
  "Dear Customer,",
  "We hereby inform you that the component ADUM1201ARZ (Dual-Channel Digital-Isolator)",
  "will be discontinued due to the transition of our wafer fab. The 180-nm process will",
  "be discontinued at the end of the year.",
  "Last Order Date (Last Time Buy): November 17, 2026",
  "Last Delivery Date: February 28, 2027",
  "A direct replacement is not currently available.",
].join("\n");

const SYSTEM =
  "You write procurement memos for a manufacturer. Be concrete and brief. " +
  "Use only the figures supplied; never invent or recompute a number. " +
  "No greeting, no sign-off. Six sentences at most.";

interface Metrics {
  finish: string;
  chars: number;
  words: number;
  uniqueRatio: number;
  maxWordRepeat: number;
  charRun: boolean;
  verdict: string;
}

function measure(text: string, finish: string): Metrics {
  const t = text.trim();
  const words = t.toLowerCase().match(/[a-z']+/g) ?? [];
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const maxWordRepeat = Math.max(0, ...counts.values());
  const uniqueRatio = words.length ? counts.size / words.length : 0;
  const charRun = /(.)\1{14,}/.test(t);
  const bad =
    t.length < 40 || charRun || maxWordRepeat > 15 || (words.length > 60 && uniqueRatio < 0.35);
  return {
    finish,
    chars: t.length,
    words: words.length,
    uniqueRatio: Math.round(uniqueRatio * 100) / 100,
    maxWordRepeat,
    charRun,
    verdict: bad ? "DEGENERATE" : "ok",
  };
}

async function call(
  label: string,
  user: string,
  body: Record<string, unknown> = {},
  model = "Gemma-4-31B-IT",
) {
  const payload = {
    model,
    max_tokens: 500,
    temperature: 0.3,
    top_p: 1.0,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    ...body,
  };
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.log(`${label.padEnd(34)} HTTP ${res.status}  ${(await res.text()).slice(0, 120)}`);
    return;
  }
  const d = await res.json();
  const c = d.choices?.[0];
  const m = measure(c?.message?.content ?? "", c?.finish_reason ?? "?");
  console.log(
    `${label.padEnd(34)} ${m.verdict.padEnd(11)} finish=${m.finish.padEnd(7)} chars=${String(
      m.chars,
    ).padStart(5)} uniq=${m.uniqueRatio} maxRepeat=${m.maxWordRepeat}`,
  );
  if (m.verdict === "ok") console.log("     " + (c.message.content as string).replace(/\s+/g, " ").slice(0, 170));
  return m;
}

(async () => {
  console.log("--- varying the prompt ---");
  await call("figures only", FIGURES);
  await call("notice + figures", `SUPPLIER NOTICE:\n${NOTICE}\n\n${FIGURES}`);
  await call("notice only", `SUPPLIER NOTICE:\n${NOTICE}\n\nWrite a short memo.`);

  console.log("\n--- varying max_tokens, figures only ---");
  await call("max_tokens=200", FIGURES, { max_tokens: 200 });
  await call("max_tokens=300", FIGURES, { max_tokens: 300 });
  await call("max_tokens=800", FIGURES, { max_tokens: 800 });

  console.log("\n--- penalties, notice + figures ---");
  await call("frequency_penalty=0.3", `SUPPLIER NOTICE:\n${NOTICE}\n\n${FIGURES}`, {
    frequency_penalty: 0.3,
  });
  await call("presence+frequency=0.5", `SUPPLIER NOTICE:\n${NOTICE}\n\n${FIGURES}`, {
    frequency_penalty: 0.5,
    presence_penalty: 0.5,
  });

  console.log("\n--- same prompts, other models ---");
  await call("DeepSeek notice+figures", `SUPPLIER NOTICE:\n${NOTICE}\n\n${FIGURES}`, {}, "DeepSeek-V4-Flash");
  await call("GLM notice+figures", `SUPPLIER NOTICE:\n${NOTICE}\n\n${FIGURES}`, {}, "GLM-5.3-Flash");

  console.log("\n--- repeat the good case 3x to check stability ---");
  for (let i = 1; i <= 3; i++) await call(`figures only run ${i}`, FIGURES, { max_tokens: 300 });
})();
