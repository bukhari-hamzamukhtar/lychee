"use client";

/**
 * What the agent knows, and where each piece of it came from.
 *
 * A chat that remembers by keeping the last N messages forgets the moment the
 * window fills, and a chat that remembers by summarising itself keeps the prose
 * and loses the facts. Neither can tell you why it believes something.
 *
 * So nothing is remembered as conversation. Everything is remembered as an
 * assertion: a subject, what is claimed about it, and — the part that matters —
 * who claimed it, out of which source, when, and whether it was read, computed
 * or guessed. An assertion is a node, not an edge, precisely so it can carry
 * that. When the window fills, the transcript is thrown away and the assertions
 * are kept, because the assertions are the part worth keeping.
 *
 * This also means an answer can be checked. A number that came from the engine
 * is replayable arithmetic over the bill of materials; a date that came from a
 * document points at the line it was read from. The two are never confused for
 * one another, and the difference is visible on screen.
 */

/** How much the claim is worth, which is not the same as how confident it sounds. */
export type Standing =
  /** Printed in a document in so many words. */
  | "stated"
  /** Computed from the bill of materials; replayable, exact. */
  | "derived"
  /** A model's reading of something that was not stated outright. */
  | "inferred";

export interface Provenance {
  /** Where the claim physically came from. */
  kind: "document" | "engine" | "conversation";
  /** The document's filename, the traversal, or the turn it was said in. */
  ref: string;
  /** The line of the source that carries it, when there is one. */
  quote?: string;
  /** What produced it: a model name, or the name of the computation. */
  by: string;
  at: string;
}

export interface Assertion {
  id: string;
  subject: string;
  claim: string;
  standing: Standing;
  provenance: Provenance;
}

export const STANDING_LABEL: Record<Standing, string> = {
  stated: "read from a document",
  derived: "computed from the bill of materials",
  inferred: "inferred by a model",
};

let seq = 0;
export function assertion(
  subject: string,
  claim: string,
  standing: Standing,
  provenance: Omit<Provenance, "at"> & { at?: string },
): Assertion {
  seq += 1;
  return {
    id: `A${Date.now().toString(36)}${seq.toString(36)}`,
    subject: subject.trim(),
    claim: claim.trim(),
    standing,
    provenance: { ...provenance, at: provenance.at ?? new Date().toISOString() },
  };
}

/* ------------------------------------------------------------------ sources */

export interface Source {
  id: string;
  filename: string;
  mime: string;
  bytes: number;
  status: "queued" | "reading" | "ready" | "error";
  /** What the document actually said, as read. */
  text: string;
  pageCount?: number;
  error?: string;
  /** Milliseconds the read took, and what it cost. */
  ms?: number;
  costUsd?: number;
  addedAt: string;
}

/* ------------------------------------------------------- the context budget */

/**
 * Tokens, near enough.
 *
 * Four characters per token is the usual rule of thumb for English prose and is
 * close enough for a gauge whose job is to tell someone they are running out of
 * room. It is deliberately not presented as exact anywhere in the interface.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * The window the agent is given.
 *
 * DeepSeek-V4-Flash takes far more than this; the number is a working budget
 * rather than the model's ceiling. It is held below the real limit on purpose,
 * because the reply needs somewhere to go and a context packed to the last
 * token leaves no room to answer in, and because every token in here is read on
 * every turn — a window stuffed with documents nobody asked about makes answers
 * slower and worse, not better.
 */
export const CONTEXT_BUDGET = 64000;

/** Past this, the next turn is likely to lose the oldest part of the history. */
export const COMPACT_AT = 0.8;

export interface ContextSlice {
  label: string;
  tokens: number;
  /** Whether this part survives a compaction. */
  durable: boolean;
}

export interface ContextUse {
  slices: ContextSlice[];
  used: number;
  budget: number;
  ratio: number;
  shouldCompact: boolean;
}

export function measureContext(parts: {
  brief: string;
  facts: string;
  sources: string;
  assertions: string;
  history: string;
}): ContextUse {
  const slices: ContextSlice[] = [
    { label: "how the system works", tokens: estimateTokens(parts.brief), durable: true },
    { label: "the bill of materials", tokens: estimateTokens(parts.facts), durable: true },
    { label: "documents you added", tokens: estimateTokens(parts.sources), durable: true },
    { label: "what has been established", tokens: estimateTokens(parts.assertions), durable: true },
    { label: "this conversation", tokens: estimateTokens(parts.history), durable: false },
  ];
  const used = slices.reduce((n, s) => n + s.tokens, 0);
  return {
    slices,
    used,
    budget: CONTEXT_BUDGET,
    ratio: used / CONTEXT_BUDGET,
    shouldCompact: used / CONTEXT_BUDGET >= COMPACT_AT,
  };
}

/* ------------------------------------------------------------ assembling it */

/** One assertion, as a line the model can read and a person can check. */
export function renderAssertion(a: Assertion): string {
  const where =
    a.provenance.kind === "engine"
      ? `engine: ${a.provenance.ref}`
      : `${a.provenance.ref}${a.provenance.quote ? ` — "${a.provenance.quote}"` : ""}`;
  return `- ${a.subject}: ${a.claim} [${a.standing}; ${where}]`;
}

/**
 * Keep the assertions that matter when there is not room for all of them.
 *
 * Things read from a document and things computed from the bill of materials
 * outrank a model's guesses, and newer outranks older within a band. Nothing is
 * deleted here — this only decides what is sent this turn.
 */
export function selectAssertions(all: Assertion[], maxTokens: number): Assertion[] {
  const rank: Record<Standing, number> = { stated: 0, derived: 1, inferred: 2 };
  const ordered = [...all].sort((a, b) => {
    const r = rank[a.standing] - rank[b.standing];
    return r !== 0 ? r : b.provenance.at.localeCompare(a.provenance.at);
  });
  const kept: Assertion[] = [];
  let used = 0;
  for (const a of ordered) {
    const cost = estimateTokens(renderAssertion(a));
    if (used + cost > maxTokens) break;
    kept.push(a);
    used += cost;
  }
  return kept;
}
