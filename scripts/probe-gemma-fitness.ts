/**
 * Is Gemma usable for the work this application actually does?
 *
 * Not "does it answer" — whether it survives the three shapes the pipeline
 * needs: strict JSON for notice normalisation, grounded prose for a memo, and
 * a short answer for the agent. The failure on 14 October was degeneration
 * into repeated fragments on longer generations and leaked `<|tool_call>`
 * markers, so generation length is varied here on purpose.
 *
 * Goes through lib/amd.ts rather than raw fetch, so the shared-key backoff and
 * the degeneracy guard are exercised too — which is the point, since those are
 * what the application would be relying on.
 *
 *   npx tsx scripts/probe-gemma-fitness.ts [model-id]
 */
import { loadEnv } from "./load-env";

loadEnv();
process.env.AMD_MODEL_GENERATE = process.argv[2] ?? "Gemma-4-31B-IT";

import { chat, MODEL, looksDegenerate } from "../lib/amd";

interface Case {
  name: string;
  messages: { role: "system" | "user"; content: string }[];
  max: number;
  json?: boolean;
  /**
   * Whether the prose degeneracy guard applies.
   *
   * looksDegenerate is tuned for English prose — it rejects anything under
   * forty characters, anything with fewer than twelve words, and anything
   * mostly punctuation. All three are true of a correct one-word answer and of
   * valid JSON, so applying it to those is a category error. The application
   * only ever guards prose (chatGuarded is used for memos and emails; the JSON
   * paths call chat directly), and this mirrors that.
   */
  prose?: boolean;
}

const NOTICE = [
  "NOTICE: Product Change Notification PCN140002. Sn/Pb plating vendor change.",
  "Last-Time Buy for Unchanged Product 2/1/2014. Parts: HMC174MS8, HMC187MS8.",
  'Return {"supplier":string|null,"partNumbers":string[],"type":"eol"|"change","lastBuyDate":"YYYY-MM-DD"|null}',
].join("\n");

const MEMO = [
  "ADUM1201ARZ is discontinued. Last-time buy 2026-11-17, 34 days away.",
  "It reaches 5 finished products. Stock 14,200 = 21 weeks cover against a 26 week lead time.",
  "Buy 504,798 for EUR 1,433,626. Revenue exposed EUR 9,058,546 a year.",
  "Write the approval memo.",
].join(" ");

const cases: Case[] = [
  {
    name: "short answer",
    messages: [{ role: "user", content: "Reply with one word: ready" }],
    max: 16,
  },
  {
    name: "strict JSON, notice shape",
    messages: [
      { role: "system", content: "Output JSON only, no prose." },
      { role: "user", content: NOTICE },
    ],
    max: 300,
    json: true,
  },
  {
    name: "memo, long generation",
    messages: [
      { role: "system", content: "Write for a procurement lead. No greeting, no sign-off." },
      { role: "user", content: MEMO },
    ],
    max: 420,
    prose: true,
  },
];

/** The leak that made Gemma unusable before: raw special tokens in the output. */
const SPECIAL_TOKEN = /<\|[a-z_]+\|?>/i;

async function main() {
  console.log(`model under test: ${MODEL.generate}\n`);
  let bad = 0;

  for (const c of cases) {
    const t0 = Date.now();
    try {
      const r = await chat(c.messages, {
        model: MODEL.generate,
        maxTokens: c.max,
        temperature: 0.2,
        json: c.json,
      });
      const text = r.text.trim();
      const secs = ((Date.now() - t0) / 1000).toFixed(1);

      const degenerate = c.prose ? looksDegenerate(text) : false;
      const leaks = SPECIAL_TOKEN.test(text);
      let jsonOk = true;
      if (c.json) {
        try {
          JSON.parse(text.replace(/^```(?:json)?|```$/g, "").trim());
        } catch {
          jsonOk = false;
        }
      }

      const ok = Boolean(text) && !degenerate && !leaks && jsonOk;
      if (!ok) bad++;

      const flags = [
        degenerate ? "DEGENERATE" : "",
        !c.prose && !c.json && text.length === 0 ? "EMPTY" : "",
        leaks ? "LEAKS-SPECIAL-TOKENS" : "",
        c.json && !jsonOk ? "JSON-UNPARSEABLE" : "",
      ]
        .filter(Boolean)
        .join(" ");

      console.log(
        `  ${ok ? "pass" : "FAIL"}  ${c.name.padEnd(26)} ${secs}s  ${text.length} chars  ${flags}`,
      );
      console.log(`        ${text.replace(/\s+/g, " ").slice(0, 150)}`);
    } catch (e) {
      bad++;
      console.log(
        `  FAIL  ${c.name.padEnd(26)} ${e instanceof Error ? e.message.slice(0, 100) : "failed"}`,
      );
    }
  }

  console.log(
    bad === 0
      ? "\nUsable for every shape this pipeline needs."
      : `\n${bad} case(s) failed — leave the default generator alone.`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

void main();
