/**
 * Evolus REST client.
 *
 * Server-side only. The workspace is capped at 60 requests per minute, so
 * callers that fan out should batch rather than race.
 *
 * Only the pieces LastBuy actually uses are wrapped: the AI Tools we drive per
 * notice, and workflow execution for the end-to-end run.
 */

// Read lazily, never captured at module scope. An importer that loads its
// environment after the import statement would otherwise bind empty strings
// here for the lifetime of the process, since imports are hoisted.
const base = () => process.env.EVOLUS_BASE_URL ?? "https://api.evolus.ai/api/v1";
const key = () => process.env.EVOLUS_API_KEY ?? "";
const app = () => process.env.EVOLUS_APPLICATION_ID ?? "";

export type ToolSlug =
  | "doc-structure"
  | "translate"
  | "summarize"
  | "email"
  | "rewrite"
  | "simplify"
  | "anonymize"
  | "tables"
  | "minutes";

export interface ToolResult {
  tool: string;
  output: string;
  creditsConsumed: number;
  truncated: boolean;
}

export class EvolusError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function headers() {
  if (!key() || !app()) throw new EvolusError("Evolus credentials are not set", 401);
  return {
    "X-ApiKey": key(),
    "X-Application-Id": app(),
    "Content-Type": "application/json",
  };
}

/** Run one of the ready-made AI Tools over text. */
export async function runTool(
  tool: ToolSlug,
  text: string,
  options: Record<string, string> = {},
): Promise<ToolResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 120_000);
  try {
    const res = await fetch(`${base()}/ai-tools/${tool}/run`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ text, options }),
      signal: ctl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new EvolusError(`${tool} ${res.status}: ${body.slice(0, 300)}`, res.status);
    }
    const d = await res.json();
    return {
      tool: d.tool ?? tool,
      output: d.output ?? "",
      creditsConsumed: d.creditsConsumed ?? 0,
      truncated: Boolean(d.truncated),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask the workspace agent. The agent runs on the team's own model, connected in
 * the workspace as an AMD Token Factory endpoint, which is what the track
 * requires — so this call reaches an open model served on AMD by way of Evolus,
 * not a model Evolus chose.
 *
 * Uses the OpenAI-compatible surface, where the model identifier is
 * "<applicationId>:<agentId>".
 */
export async function askAgent(
  question: string,
  context: string,
  { timeoutMs = 120_000 }: { timeoutMs?: number } = {},
): Promise<{ text: string; conversationId: string | null; model: string }> {
  const agentId = process.env.EVOLUS_AGENT_ID;
  if (!key() || !app() || !agentId) {
    throw new EvolusError("Evolus agent is not configured", 401);
  }
  const model = `${app()}:${agentId}`;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.evolus.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            // The workspace defaults to Italian, so the language is stated per
            // call rather than left to a setting in the console that the
            // deployed app has no visibility of.
            content: [
              context,
              context ? "\n---\n" : "",
              `QUESTION:\n${question}`,
              "\nAnswer in English, regardless of the language of the documents above.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      }),
      signal: ctl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new EvolusError(`agent ${res.status}: ${body.slice(0, 300)}`, res.status);
    }
    const d = await res.json();
    return {
      text: d?.choices?.[0]?.message?.content ?? "",
      conversationId: res.headers.get("x-conversation-id"),
      model,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function agentConfigured(): boolean {
  return Boolean(key() && app() && process.env.EVOLUS_AGENT_ID);
}

export async function listTools() {
  const res = await fetch(`${base()}/ai-tools`, { headers: headers() });
  if (!res.ok) throw new EvolusError(`ai-tools ${res.status}`, res.status);
  return (await res.json()) as { slug: string; inputs: string[] }[];
}

/**
 * Kick off a configured Evolus workflow and poll until it settles.
 * Returns null if the workflow is not configured, so the app degrades to the
 * direct tool calls rather than failing the request.
 */
export async function runWorkflow(
  workflowId: string,
  text: string,
  { timeoutMs = 180_000, pollMs = 2500 } = {},
) {
  const start = await fetch(`${base()}/workflows/${workflowId}/execute`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ text }),
  });
  if (!start.ok) {
    const body = await start.text().catch(() => "");
    throw new EvolusError(`workflow start ${start.status}: ${body.slice(0, 300)}`, start.status);
  }
  const { executionId, id } = await start.json();
  const execId = executionId ?? id;
  if (!execId) return null;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    const res = await fetch(`${base()}/workflows/${workflowId}/executions/${execId}`, {
      headers: headers(),
    });
    if (!res.ok) continue;
    const d = await res.json();
    const status = String(d.status ?? "").toLowerCase();
    if (status === "completed" || status === "failed") return d;
  }
  throw new EvolusError("workflow timed out", 504);
}
