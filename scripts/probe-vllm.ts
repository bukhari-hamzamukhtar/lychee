/**
 * Is a self-hosted vLLM endpoint actually usable?
 *
 * The Evolus track wants the main agent answering from an open model served on
 * AMD. If that is a vLLM server on an AMD Developer Cloud droplet, there are
 * four things worth knowing before pointing anything at it, and finding them
 * out from Evolus's error messages is miserable:
 *
 *   1. Is it reachable at all from outside the droplet?
 *   2. Which model id does it actually answer to? vLLM serves the full
 *      Hugging Face path, and sending the short name gets a 404.
 *   3. Does it accept the key, or no key?
 *   4. Does it do tool calls? Evolus agents need them, which is what
 *      --tool-call-parser hermes is for, and it is the thing people miss.
 *
 * Run before changing the Evolus workspace, not after:
 *
 *   npx tsx scripts/probe-vllm.ts http://<droplet-ip>:8000/v1 [api-key]
 */
import { loadEnv } from "./load-env";

try {
  loadEnv();
} catch {
  // The endpoint can be given on the command line, so a missing .env is fine.
}

const raw = process.argv[2] ?? process.env.AMD_GENERATE_BASE_URL ?? "";
const key = process.argv[3] ?? process.env.AMD_GENERATE_API_KEY ?? "";

if (!raw) {
  console.error("usage: npx tsx scripts/probe-vllm.ts http://<droplet-ip>:8000/v1 [api-key]");
  process.exit(2);
}
const base = raw.replace(/\/+$/, "");
// A droplet that is off does not refuse the connection, it swallows it, so
// every request here is bounded rather than left to hang.
const REACH_MS = 20_000;
// Hosted inference on a shared endpoint has been seen to take over a minute;
// a self-hosted droplet is usually far quicker, but this has to pass on both.
const ANSWER_MS = 120_000;
const headers: Record<string, string> = { "Content-Type": "application/json" };
if (key) headers.Authorization = `Bearer ${key}`;

const ok = (b: boolean) => (b ? "pass" : "FAIL");
let failures = 0;
const check = (label: string, passed: boolean, detail = "") => {
  if (!passed) failures++;
  console.log(`  ${ok(passed)}  ${label.padEnd(42)} ${detail}`);
};
/** Worth knowing about, but an agent that only answers questions does not need it. */
const note = (label: string, passed: boolean, detail = "") =>
  console.log(`  ${passed ? "pass" : "warn"}  ${label.padEnd(42)} ${detail}`);

async function main() {
  console.log(`endpoint: ${base}`);
  console.log(`auth    : ${key ? "bearer key supplied" : "none"}\n`);

  // 1. reachable, and what it serves
  let modelId = "";
  try {
    const res = await fetch(`${base}/models`, { headers, signal: AbortSignal.timeout(REACH_MS) });
    const body = await res.json();
    const ids = (body?.data ?? []).map((m: { id: string }) => m.id);
    modelId = ids[0] ?? "";
    check("reachable", res.ok, `HTTP ${res.status}`);
    check("serves at least one model", ids.length > 0, ids.join(", ") || "none listed");
  } catch (e) {
    check("reachable", false, e instanceof Error ? e.message : "no response");
    console.log("\nNothing else can be checked until it answers. Usual causes:");
    console.log("  · the droplet is powered off, or was destroyed");
    console.log("  · vLLM was started without --host 0.0.0.0, so it only listens inside");
    console.log("  · the port is not the one in the URL");
    process.exit(1);
  }

  // 2. it completes
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(ANSWER_MS),
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: "Reply with the single word: ready" }],
        max_tokens: 12,
        temperature: 0,
      }),
    });
    const body = await res.json();
    const text = body?.choices?.[0]?.message?.content ?? "";
    check("answers a completion", res.ok && Boolean(text), text.trim().slice(0, 40) || `HTTP ${res.status}`);
  } catch (e) {
    check("answers a completion", false, e instanceof Error ? e.message : "failed");
  }

  // 3. tool calls, which Evolus agents depend on
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(ANSWER_MS),
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: "What is the stock of part ADUM1201ARZ?" }],
        max_tokens: 120,
        temperature: 0,
        tools: [
          {
            type: "function",
            function: {
              name: "get_stock",
              description: "Stock on hand for a part number",
              parameters: {
                type: "object",
                properties: { partId: { type: "string" } },
                required: ["partId"],
              },
            },
          },
        ],
      }),
    });
    const body = await res.json();
    const calls = body?.choices?.[0]?.message?.tool_calls;
    note(
      "makes tool calls",
      res.ok && Array.isArray(calls) && calls.length > 0,
      Array.isArray(calls) && calls.length
        ? calls[0]?.function?.name
        : "none — serve with --tool-call-parser hermes if an agent needs them",
    );
  } catch (e) {
    note("makes tool calls", false, e instanceof Error ? e.message : "no answer in time");
  }

  console.log(
    failures === 0
      ? `\nUsable. Point Evolus at ${base} with model id "${modelId}", and set\n` +
          `AMD_GENERATE_BASE_URL=${base} to route this app's generation there too.`
      : `\n${failures} check(s) failed. Fix those before changing the Evolus workspace.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
