/**
 * ============================================================================
 *  EVERY MODEL CALL IN THIS APPLICATION GOES THROUGH THIS FILE.
 *
 *  Endpoint:  https://developer.amd.com.cn/radeon/api/v1     (AMD Token Factory)
 *  Hardware:  AMD Instinct GPUs
 *  Models:    MinerU2.5-Pro (OCR), DeepSeek-V4-Flash (generation)
 *
 *  There is no other inference provider anywhere in the codebase. Nothing is
 *  called on OpenAI, Anthropic, or any hosted API other than the AMD endpoint
 *  above and Evolus — and the Evolus agent is itself bound to that same AMD
 *  endpoint as a custom model, so its answers are generated on AMD too.
 *
 *  The two functions at the bottom of this file are the only ways out:
 *    ocr()   -> POST https://developer.amd.com.cn/radeon/api/v1/ocr
 *    chat()  -> POST https://developer.amd.com.cn/radeon/api/v1/chat/completions
 * ============================================================================
 *
 * Server-side only — the key is a shared team credential and must never reach
 * the browser. Rate limits are enforced per key, not per caller, so a burst
 * from anywhere on the team throttles everyone; every call here backs off.
 */

// Read lazily; see the note in evolus.ts about imports being hoisted above
// any environment loading the importer does.
const base = () => process.env.AMD_BASE_URL ?? "https://developer.amd.com.cn/radeon/api/v1";
const key = () => process.env.AMD_API_KEY ?? "";

/**
 * Generation and OCR can be served from different places.
 *
 * Token Factory is AMD's own hosted inference and serves both. An open model
 * you serve yourself on an AMD Developer Cloud droplet serves only what you
 * started it with, and MinerU is not something vLLM will give you — so OCR
 * stays on Token Factory while generation can be pointed at your own endpoint
 * by setting AMD_GENERATE_BASE_URL. Unset, everything behaves exactly as before.
 *
 * This is also the escape hatch if a self-hosted droplet dies mid-demo: unset
 * one variable and generation falls back to Token Factory with no code change.
 */
const genBase = () => process.env.AMD_GENERATE_BASE_URL?.replace(/\/+$/, "") || base();
const genKey = () => process.env.AMD_GENERATE_API_KEY ?? key();
/** True when generation is being served from something other than Token Factory. */
export const selfHostedGeneration = () => Boolean(process.env.AMD_GENERATE_BASE_URL);

/**
 * Which hosted model does what.
 *
 * `generate` is deliberately configuration rather than a hardcoded choice.
 * Gemma-4-31B-IT would be the preferred generator — it is Google's open model
 * and the only one in this catalogue — but as of 14 Oct 2026 it is collapsing
 * into repeated fragments and leaking raw special tokens on every call, short
 * or long, so the default is a model that works. Setting
 * AMD_MODEL_GENERATE=Gemma-4-31B-IT switches back with no code change, and the
 * guard below keeps a bad generation out of the response either way.
 */
export const MODEL = {
  get generate() {
    return process.env.AMD_MODEL_GENERATE ?? "DeepSeek-V4-Flash";
  },
  get fallback() {
    return process.env.AMD_MODEL_FALLBACK ?? "DeepSeek-V4-Flash";
  },
  get ocr() {
    return process.env.AMD_MODEL_OCR ?? "MinerU2.5-Pro";
  },
};

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AmdError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Reasoning is opt-in, never inferred from the model name.
 *
 * Thinking tokens are drawn from the same max_tokens budget as the answer, and
 * DeepSeek does not think unless asked. Switching it on "because the model
 * supports it" spent the whole budget on reasoning and returned empty content
 * with finish_reason=length — and worse on short prompts, where the model
 * wanders further. Omitting the field lets each model use its documented
 * default, which is what we want for drafting from supplied figures.
 */
function acceptsReasoningEffort(model: string) {
  return model.startsWith("DeepSeek") || model.startsWith("GLM") || model.startsWith("Qwen");
}

type Target = "generate" | "ocr";

async function post(path: string, body: unknown, timeoutMs: number, target: Target = "generate") {
  const url = target === "ocr" ? base() : genBase();
  const token = target === "ocr" ? key() : genKey();
  // A self-hosted vLLM may legitimately be served without a key.
  if (!token && !(target === "generate" && selfHostedGeneration())) {
    throw new AmdError("AMD_API_KEY is not set", 401);
  }

  const MAX_TRIES = 4;
  let lastErr: AmdError | null = null;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      // -> https://developer.amd.com.cn/radeon/api/v1{path} unless an
      //    AMD Developer Cloud endpoint has been configured for generation.
      const res = await fetch(`${url}${path}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });

      if (res.ok) return await res.json();

      const text = await res.text().catch(() => "");
      // Only 429 and gateway saturation are worth retrying; a 400 will not fix itself.
      if (res.status === 429 || res.status === 502 || res.status === 503) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        const backoff = retryAfter * 1000 || Math.min(16_000, 1000 * 2 ** attempt);
        const jitter = Math.random() * 400;
        lastErr = new AmdError(`${res.status}: ${text.slice(0, 200)}`, res.status);
        if (attempt < MAX_TRIES - 1) {
          await new Promise((r) => setTimeout(r, backoff + jitter));
          continue;
        }
      }
      throw new AmdError(`${res.status}: ${text.slice(0, 300)}`, res.status);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new AmdError("exhausted retries", 500);
}

export interface ChatOpts {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  json?: boolean;
  /** Omitted by default; see acceptsReasoningEffort. */
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
}

export async function chat(
  messages: ChatMessage[],
  opts: ChatOpts = {},
): Promise<{ text: string; costUsd: number; model: string; finishReason: string }> {
  const model = opts.model ?? MODEL.generate;

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: opts.maxTokens ?? 1200,
    temperature: opts.temperature ?? 0.3,
    // Always explicit. Left unset, the gateway's default sends Gemma into
    // repetition loops on long prompts; pinned low it is stable.
    top_p: opts.topP ?? 1.0,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  if (opts.reasoningEffort && acceptsReasoningEffort(model)) {
    body.reasoning_effort = opts.reasoningEffort;
  }

  const data = await post("/chat/completions", body, 180_000);
  const choice = data?.choices?.[0];
  return {
    text: choice?.message?.content ?? "",
    costUsd: data?.usage?.cost ?? 0,
    model,
    finishReason: choice?.finish_reason ?? "unknown",
  };
}

/**
 * Detect a collapsed generation.
 *
 * Measured against Gemma-4-31B on this endpoint on 14 Oct 2026, which emits
 * the correct opening tokens and then diverges into repeated fragments and raw
 * special tokens. Four independent signals, because no single one caught every
 * observed failure:
 *
 *   - a long run of one character          "GEMs-//s-//s//////"
 *   - a leaked special token               "<|tool_call>"
 *   - one word repeated far too often      "own own own own own"
 *   - almost no repeated words at all      gibberish tokens, unique ratio ~1
 *
 * `askedShort` adds the strongest signal available: a request capped at a few
 * sentences that runs to the token limit has not answered the question.
 */
export function looksDegenerate(
  text: string,
  { finishReason, askedShort = false }: { finishReason?: string; askedShort?: boolean } = {},
): boolean {
  const t = text.trim();
  if (t.length < 40) return true;
  if (/(.)\1{9,}/.test(t)) return true;
  if (/<\|[a-z_]+\|?>/i.test(t)) return true;
  if (askedShort && finishReason === "length") return true;

  const words = t.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length < 12) return true;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const maxRepeat = Math.max(...counts.values());
  const uniqueRatio = counts.size / words.length;
  if (maxRepeat > 15) return true;
  // Real English repeats common words. A ratio near 1 over a long passage means
  // the tokens are gibberish rather than prose.
  if (words.length > 60 && (uniqueRatio < 0.35 || uniqueRatio > 0.97)) return true;

  const alpha = (t.match(/[A-Za-z\s]/g) ?? []).length / t.length;
  return alpha < 0.6;
}

/**
 * Generate with the preferred model, and if the result is unusable try once
 * more before dropping to the fallback. The model that actually produced the
 * text is returned, so the UI never misreports which one ran.
 */
export async function chatGuarded(
  messages: ChatMessage[],
  opts: ChatOpts & { fallbackModel?: string; askedShort?: boolean } = {},
) {
  const primary = opts.model ?? MODEL.generate;
  const fallback = opts.fallbackModel ?? MODEL.fallback;
  // Trying a known-broken model first would cost two wasted calls and most of
  // the latency on every run, so the order is configuration, not a guess.
  const order = primary === fallback ? [primary, primary] : [primary, primary, fallback];

  let costUsd = 0;
  const attempts: { model: string; finishReason: string; degenerate: boolean }[] = [];

  for (const model of order) {
    const r = await chat(messages, { ...opts, model });
    costUsd += r.costUsd;
    const degenerate = looksDegenerate(r.text, {
      finishReason: r.finishReason,
      askedShort: opts.askedShort,
    });
    attempts.push({ model, finishReason: r.finishReason, degenerate });
    if (!degenerate) return { text: r.text, costUsd, model, attempts };
  }
  return { text: "", costUsd, model: order[order.length - 1], attempts };
}

/** MinerU2.5-Pro: a PDF or image goes in, Markdown per page comes out. */
export async function ocr(documentUrl: string, pages?: string) {
  const data = await post(
    "/ocr",
    {
      model: MODEL.ocr,
      document: { type: "document_url", document_url: documentUrl },
      ...(pages ? { pages } : {}),
    },
    300_000,
    // MinerU lives on Token Factory. A droplet you started yourself serves the
    // one model you asked for, and that is not this one.
    "ocr",
  );
  return {
    markdown: (data?.pages ?? []).map((p: { markdown?: string }) => p.markdown ?? "").join("\n\n"),
    pageCount: data?.usage_info?.pages_processed ?? 0,
  };
}

export async function usage() {
  if (!key()) throw new AmdError("AMD_API_KEY is not set", 401);
  const res = await fetch(`${base()}/usage`, { headers: { Authorization: `Bearer ${key()}` } });
  if (!res.ok) throw new AmdError(`usage ${res.status}`, res.status);
  const d = await res.json();
  return {
    usedUsd: d.daily_cost_used_usd as number,
    limitUsd: d.daily_cost_limit_usd as number,
    rpmLimit: d.rpm_limit as number,
    resetsAt: d.daily_reset_at as string,
  };
}
