/**
 * Gemma-4-31B is emitting raw special tokens on long generations. Find out
 * whether short or constrained generations still work, because that decides
 * whether Gemma can stay in the pipeline at all.
 */
import { loadEnv } from "./load-env";

loadEnv();
const BASE = process.env.AMD_BASE_URL!;
const KEY = process.env.AMD_API_KEY!;

async function raw(label: string, payload: Record<string, unknown>) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "Gemma-4-31B-IT", temperature: 0.3, top_p: 1.0, ...payload }),
  });
  if (!res.ok) {
    console.log(`${label.padEnd(30)} HTTP ${res.status} ${(await res.text()).slice(0, 100)}`);
    return;
  }
  const d = await res.json();
  const c = d.choices?.[0];
  const text: string = c?.message?.content ?? "";
  const special = /<\|[a-z_]+\|?>/i.test(text);
  console.log(
    `${label.padEnd(30)} finish=${String(c?.finish_reason).padEnd(7)} chars=${String(
      text.length,
    ).padStart(4)} special=${special ? "YES" : "no "}  ${JSON.stringify(text.slice(0, 90))}`,
  );
}

(async () => {
  console.log("--- the exact call that worked this morning ---");
  await raw("GEMMA OK, 60 tokens", {
    max_tokens: 60,
    messages: [
      { role: "system", content: "You are terse." },
      { role: "user", content: "Reply with exactly: GEMMA OK" },
    ],
  });

  console.log("\n--- short bounded generations ---");
  for (const n of [10, 30, 80, 150]) {
    await raw(`max_tokens=${n}, one date`, {
      max_tokens: n,
      messages: [
        { role: "system", content: "Answer with the date only." },
        { role: "user", content: "Last time buy is 17 November 2026. Return it as YYYY-MM-DD." },
      ],
    });
  }

  console.log("\n--- constrained json ---");
  await raw("json_object, small schema", {
    max_tokens: 160,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return JSON only." },
      {
        role: "user",
        content:
          'Notice: "ADUM1201ARZ discontinued, last time buy 17 Nov 2026, no replacement." ' +
          'Return {"part":string,"lastBuyDate":"YYYY-MM-DD","hasReplacement":boolean}',
      },
    ],
  });

  console.log("\n--- no system message at all ---");
  await raw("user-only, 120 tokens", {
    max_tokens: 120,
    messages: [{ role: "user", content: "In two sentences, why does a last-time-buy deadline matter?" }],
  });

  console.log("\n--- tool call, which worked this morning ---");
  await raw("tool call", {
    max_tokens: 120,
    messages: [
      { role: "system", content: "Use tools when relevant." },
      { role: "user", content: "What is the stock of part BQ-7741?" },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "get_stock",
          description: "Stock for a part",
          parameters: { type: "object", properties: { part: { type: "string" } }, required: ["part"] },
        },
      },
    ],
  });
})();
