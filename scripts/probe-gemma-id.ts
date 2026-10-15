/** Which Gemma id, if any, Token Factory will actually answer to right now. */
import { loadEnv } from "./load-env";

loadEnv();
const BASE = process.env.AMD_BASE_URL!;
const KEY = process.env.AMD_API_KEY!;

const ids = [
  "Gemma-4-31B-IT",
  "self-dploy/Gemma-4-31B-IT",
  "google/Gemma-4-31B-IT",
  "gemma-4-31b-it",
  "Gemma-4-31B-IT-FP8",
];

const main = async () => {
  const cat = await fetch(BASE + "/models", { headers: { Authorization: "Bearer " + KEY } });
  const listed = ((await cat.json())?.data ?? []).map((m: { id: string }) => m.id);
  console.log("catalogue entries containing 'emma':", listed.filter((i: string) => /emma/i.test(i)));
  console.log("");

  for (const model of ids) {
    const res = await fetch(BASE + "/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with one word: ready" }],
        max_tokens: 12,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(90_000),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }) as unknown as Response);

    const text = await res.text();
    let note = text.slice(0, 120);
    if (res.ok) {
      try {
        note = "ANSWERED: " + JSON.stringify(JSON.parse(text)?.choices?.[0]?.message?.content);
      } catch { /* leave raw */ }
    }
    console.log(String(model).padEnd(28) + " HTTP " + res.status + "  " + note);
  }
};
main();
