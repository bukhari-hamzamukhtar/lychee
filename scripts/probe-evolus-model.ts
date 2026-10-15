/**
 * What the Evolus agent is actually running on.
 *
 * The track is audited on this: the main agent has to answer from an open
 * model served on AMD, not from whatever Evolus would pick by default. This
 * asks the workspace rather than trusting the console screenshot.
 */
import { loadEnv } from "./load-env";

loadEnv();

const base = process.env.EVOLUS_BASE_URL ?? "https://api.evolus.ai/api/v1";
const chat = base.replace(/\/api\/v1$/, "/v1");
const key = process.env.EVOLUS_API_KEY ?? "";
const app = process.env.EVOLUS_APPLICATION_ID ?? "";
const agent = process.env.EVOLUS_AGENT_ID ?? "";

const rest = (p: string) =>
  fetch(`${base}${p}`, { headers: { "X-ApiKey": key, "X-Application-Id": app } });

async function show(label: string, res: Response) {
  const text = await res.text();
  console.log(`\n--- ${label} -> ${res.status}`);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2).slice(0, 6000));
  } catch {
    console.log(text.slice(0, 600));
  }
}

const main = async () => {
  await show("GET /v1/models (agents this key can reach)", await fetch(`${chat}/models`, {
    headers: { Authorization: `Bearer ${key}` },
  }));
  for (const p of [`/agents/${agent}`, "/models", "/custom-models", "/applications/" + app]) {
    await show(`GET ${p}`, await rest(p));
  }
};
main();
