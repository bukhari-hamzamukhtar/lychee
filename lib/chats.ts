"use client";

/**
 * Conversations, and what carries between them.
 *
 * One endless thread is the wrong shape for this. A person works on the Hittite
 * notice, settles it, and then starts on something unrelated — and the first
 * conversation's leftovers are now noise in the second one, eating the window
 * and pulling answers sideways. So conversations are separate, and what each
 * one has established stays inside it.
 *
 * Documents are the exception and are shared. They are files the person added
 * to the workspace, not things a conversation discovered, and making someone
 * re-upload a datasheet to ask a second question about it would be silly.
 *
 * Forking is the deliberate way to carry memory across. The parent's transcript
 * is distilled into assertions, those are copied into the child along with the
 * parent's existing ones, and the child starts with an empty transcript — which
 * is the point. You keep what was established and get the room back.
 */
import type { Assertion } from "./context-graph";

export interface Turn {
  role: "user" | "assistant";
  content: string;
  ms?: number;
  costUsd?: number;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  /** The live transcript. Discarded on a distillation; not what is remembered. */
  turns: Turn[];
  /** What this conversation has established. Survives, and is what it is given. */
  assertions: Assertion[];
  forkedFrom?: { id: string; title: string; at: string };
}

let seq = 0;
const id = (p: string) => `${p}${Date.now().toString(36)}${(seq += 1).toString(36)}`;

export function newChat(title = "New conversation"): Chat {
  return { id: id("C"), title, createdAt: new Date().toISOString(), turns: [], assertions: [] };
}

/**
 * A title taken from the first thing asked.
 *
 * Better than "Conversation 3" and cheaper than asking a model to name it,
 * which would cost a round trip to produce something no more useful.
 */
export function titleFrom(question: string): string {
  const clean = question.replace(/\s+/g, " ").trim();
  if (!clean) return "New conversation";
  const cut = clean.length > 52 ? clean.slice(0, 52).replace(/\s\S*$/, "") + "…" : clean;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

/**
 * A child of this conversation, holding what it established and none of its
 * transcript. `carried` is whatever the parent's transcript distilled into.
 */
export function forkOf(parent: Chat, carried: Assertion[]): Chat {
  const seen = new Set<string>();
  const assertions = [...carried, ...parent.assertions].filter((a) => {
    const k = a.subject + "|" + a.claim;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return {
    id: id("C"),
    title: `${parent.title} — continued`,
    createdAt: new Date().toISOString(),
    turns: [],
    assertions,
    forkedFrom: { id: parent.id, title: parent.title, at: new Date().toISOString() },
  };
}
