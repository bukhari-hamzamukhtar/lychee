"use client";

/**
 * Client-side workspace state.
 *
 * Notices a user uploads, assessments that have been run, and orders that have
 * been approved all persist to localStorage, so the app behaves like something
 * you work in across visits rather than a page that resets on every reload.
 *
 * The seeded notices are kept separate from uploaded ones: a user can delete
 * what they added without losing the worked examples the demo relies on.
 */
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PCN_INBOX } from "@/data/factory";
import {
  setActiveDataset,
  resetDataset,
  loadDemoDataset,
  activeDataset,
  type Dataset,
} from "./graph";
import type { Pcn } from "./types";
import type { Assertion, Source } from "./context-graph";
import { newChat, forkOf, titleFrom, type Chat, type Turn } from "./chats";
import { currentAccount, rememberSession, forgetSession, GUEST, type Account } from "./auth";
import {
  ingestDocument,
  type IngestStage,
  type IngestTotals,
} from "./ingest-client";

/**
 * One workspace per account.
 *
 * Keyed rather than global so two people on the same laptop do not read each
 * other's bills of materials. The old unkeyed value is still read once, so a
 * workspace built before accounts existed is not thrown away.
 */
const KEY = "lastbuy.workspace.v1";
const keyFor = (accountId: string) => `${KEY}:${accountId}`;

export interface Approval {
  id: string;
  pcnId: string;
  partId: string;
  qty: number;
  costEur: number;
  supplier: string;
  lastBuyDate: string;
  approvedAt: string;
  approvedBy: string;
}

export interface StoredAssessment {
  pcnId: string;
  ranAt: string;
  payload: unknown;
}

export interface ImportedBom {
  name: string;
  importedAt: string;
  dataset: Dataset;
}

interface Persisted {
  uploaded: Pcn[];
  approvals: Approval[];
  assessments: StoredAssessment[];
  bom: ImportedBom | null;
  /**
   * Whether the worked example has been switched on.
   *
   * Off by default, and deliberately so. Seeded notices and the deadlines that
   * come with them are a claim about what this user has received, and inventing
   * that is how someone ends up staring at a countdown for a part they never
   * ordered. The example lives on the landing page, where it is plainly an
   * example, and only comes into the workspace if it is asked for.
   */
  demo: boolean;
  /** Documents dropped on the Ask page, kept with the text they were read as.
   *  Shared across conversations: they are files the person added, not things
   *  a conversation discovered. */
  sources: Source[];
  /** Conversations, each keeping its own transcript and its own claims. */
  chats: Chat[];
  activeChatId: string | null;
}

const EMPTY: Persisted = {
  uploaded: [],
  approvals: [],
  assessments: [],
  bom: null,
  demo: false,
  sources: [],
  chats: [],
  activeChatId: null,
};

/** A browser store is a few megabytes; a stack of OCR-ed PDFs will fill it. */
const MAX_SOURCES = 12;
const MAX_ASSERTIONS = 400;
const MAX_CHATS = 40;

/**
 * Point the engine at whichever bill of materials this workspace is on.
 *
 * An imported one wins; the example is next, and only if it was asked for;
 * otherwise nothing, and the screens say so rather than showing someone else's
 * factory as though it were theirs.
 */
function applyDataset(state: Persisted) {
  if (state.bom) setActiveDataset(state.bom.dataset);
  else if (state.demo) loadDemoDataset();
  else resetDataset();
}

/** Whose workspace the module-level read and write functions act on. */
let scope: string = GUEST.id;

function read(): Persisted {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw =
      window.localStorage.getItem(keyFor(scope)) ??
      // Anything saved before this app had accounts belongs to whoever is first.
      (scope === GUEST.id ? window.localStorage.getItem(KEY) : null);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      uploaded: parsed.uploaded ?? [],
      approvals: parsed.approvals ?? [],
      assessments: parsed.assessments ?? [],
      bom: parsed.bom ?? null,
      demo: parsed.demo ?? false,
      sources: parsed.sources ?? [],
      chats: parsed.chats ?? [],
      activeChatId: parsed.activeChatId ?? null,
    };
  } catch {
    // A corrupt or blocked store should not take the app down with it.
    return EMPTY;
  }
}

function write(state: Persisted) {
  try {
    window.localStorage.setItem(keyFor(scope), JSON.stringify(state));
  } catch {
    /* private mode, quota, blocked storage — the session still works in memory */
  }
}

/**
 * An upload in flight.
 *
 * This deliberately lives in the workspace rather than in the dropzone. Reading
 * a document takes most of a minute, and state held by the component meant that
 * walking to another tab threw the whole thing away — the request kept running
 * with nowhere to report to. Here it outlives the page that started it.
 *
 * It is not written to localStorage: a reload kills the request anyway, and a
 * stored "still reading" that can never finish is worse than no record.
 */
export interface UploadState {
  status: "idle" | "running" | "done" | "error";
  filename: string;
  startedAt: number;
  stages: IngestStage[];
  /** The stage the server says it is working on right now. */
  current: string | null;
  error: string | null;
  readText: string | null;
  diagnosis: Record<string, unknown> | null;
  totals: IngestTotals | null;
  pcnId: string | null;
}

const NO_UPLOAD: UploadState = {
  status: "idle",
  filename: "",
  startedAt: 0,
  stages: [],
  current: null,
  error: null,
  readText: null,
  diagnosis: null,
  totals: null,
  pcnId: null,
};

interface Workspace {
  /** Who this workspace belongs to. Null until the session has been read. */
  account: Account | null;
  signedIn: boolean;
  adopt: (account: Account) => void;
  signOut: () => void;
  notices: Pcn[];
  uploaded: Pcn[];
  demo: boolean;
  /** Changes whenever the engine is pointed at a different bill of
   *  materials. Screens compute from module state, so they need
   *  something reactive to recompute against. */
  datasetKey: string;
  setDemo: (on: boolean) => void;
  approvals: Approval[];
  assessments: StoredAssessment[];
  hydrated: boolean;
  bom: ImportedBom | null;
  loadBom: (bom: ImportedBom) => void;
  clearBom: () => void;
  addNotice: (pcn: Pcn) => void;
  removeNotice: (id: string) => void;
  approve: (a: Omit<Approval, "id" | "approvedAt">) => void;
  isApproved: (pcnId: string, partId: string) => boolean;
  saveAssessment: (pcnId: string, payload: unknown) => void;
  getAssessment: (pcnId: string) => unknown | null;
  sources: Source[];
  chats: Chat[];
  chat: Chat | null;
  openChat: (id: string) => void;
  startChat: () => void;
  forkChat: (id: string, carried: Assertion[]) => void;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  setTurns: (id: string, turns: Turn[]) => void;
  addSource: (s: Source) => void;
  updateSource: (id: string, patch: Partial<Source>) => void;
  removeSource: (id: string) => void;
  addAssertions: (a: Assertion[]) => void;
  clearKnowledge: () => void;
  upload: UploadState;
  startUpload: (file: File) => void;
  clearUpload: () => void;
  reset: () => void;
}

const Ctx = createContext<Workspace | null>(null);

export function useWorkspaceState(): Workspace {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [upload, setUpload] = useState<UploadState>(NO_UPLOAD);
  const [account, setAccount] = useState<Account | null>(null);
  // Only one document at a time; starting another supersedes the first.
  const inFlight = useRef<AbortController | null>(null);

  // Read after mount only: localStorage does not exist during the server render,
  // and reading it in an initialiser would produce a hydration mismatch.
  useEffect(() => {
    // The session decides which workspace to read, so it is resolved first.
    const who = currentAccount() ?? GUEST;
    scope = who.id;
    setAccount(who);
    const stored = read();
    // The engine is a module singleton, so whichever bill of materials this
    // workspace is on has to be put back before anything renders against it.
    applyDataset(stored);
    setState(stored);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Persisted) => {
    applyDataset(next);
    setState(next);
    write(next);
  }, []);

  const addNotice = useCallback(
    (pcn: Pcn) => persist({ ...read(), uploaded: [pcn, ...read().uploaded] }),
    [persist],
  );

  const removeNotice = useCallback(
    (id: string) => {
      const cur = read();
      persist({
        ...cur,
        uploaded: cur.uploaded.filter((p) => p.id !== id),
        assessments: cur.assessments.filter((a) => a.pcnId !== id),
      });
    },
    [persist],
  );

  const approve = useCallback(
    (a: Omit<Approval, "id" | "approvedAt">) => {
      const cur = read();
      const entry: Approval = {
        ...a,
        id: `AP-${Date.now().toString(36).toUpperCase()}`,
        approvedAt: new Date().toISOString(),
      };
      persist({ ...cur, approvals: [entry, ...cur.approvals] });
    },
    [persist],
  );

  const saveAssessment = useCallback(
    (pcnId: string, payload: unknown) => {
      const cur = read();
      persist({
        ...cur,
        assessments: [
          { pcnId, ranAt: new Date().toISOString(), payload },
          ...cur.assessments.filter((a) => a.pcnId !== pcnId),
        ],
      });
    },
    [persist],
  );

  const loadBom = useCallback(
    (bom: ImportedBom) => persist({ ...read(), bom }),
    [persist],
  );

  const clearBom = useCallback(() => persist({ ...read(), bom: null }), [persist]);

  const addSource = useCallback(
    (source: Source) => {
      const cur = read();
      persist({ ...cur, sources: [source, ...cur.sources].slice(0, MAX_SOURCES) });
    },
    [persist],
  );

  const updateSource = useCallback(
    (id: string, patch: Partial<Source>) => {
      const cur = read();
      persist({
        ...cur,
        sources: cur.sources.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      });
    },
    [persist],
  );

  const removeSource = useCallback(
    (id: string) => {
      const cur = read();
      persist({ ...cur, sources: cur.sources.filter((s) => s.id !== id) });
    },
    [persist],
  );

  /* ------------------------------------------------------- conversations */

  const patchChat = useCallback(
    (id: string, patch: (c: Chat) => Chat) => {
      const cur = read();
      persist({ ...cur, chats: cur.chats.map((c) => (c.id === id ? patch(c) : c)) });
    },
    [persist],
  );

  const openChat = useCallback(
    (id: string) => persist({ ...read(), activeChatId: id }),
    [persist],
  );

  const startChat = useCallback(() => {
    const cur = read();
    const c = newChat();
    persist({ ...cur, chats: [c, ...cur.chats].slice(0, MAX_CHATS), activeChatId: c.id });
  }, [persist]);

  const forkChat = useCallback(
    (id: string, carried: Assertion[]) => {
      const cur = read();
      const parent = cur.chats.find((c) => c.id === id);
      if (!parent) return;
      const child = forkOf(parent, carried);
      persist({
        ...cur,
        chats: [child, ...cur.chats].slice(0, MAX_CHATS),
        activeChatId: child.id,
      });
    },
    [persist],
  );

  const renameChat = useCallback(
    (id: string, title: string) =>
      patchChat(id, (c) => ({ ...c, title: title.slice(0, 80) || c.title })),
    [patchChat],
  );

  const deleteChat = useCallback(
    (id: string) => {
      const cur = read();
      const chats = cur.chats.filter((c) => c.id !== id);
      persist({
        ...cur,
        chats,
        activeChatId: cur.activeChatId === id ? (chats[0]?.id ?? null) : cur.activeChatId,
      });
    },
    [persist],
  );

  const setTurns = useCallback(
    (id: string, turns: Turn[]) =>
      patchChat(id, (c) => ({
        ...c,
        turns,
        // The first question names the conversation; "New conversation" is a
        // placeholder, not a title anyone chose.
        title:
          c.title === "New conversation" && turns[0]?.role === "user"
            ? titleFrom(turns[0].content)
            : c.title,
      })),
    [patchChat],
  );

  const addAssertions = useCallback(
    (incoming: Assertion[]) => {
      if (!incoming.length) return;
      const cur = read();
      const id = cur.activeChatId;
      if (!id) return;
      patchChat(id, (c) => {
        // The same claim can be distilled twice out of one conversation; keep one.
        const seen = new Set(c.assertions.map((a) => a.subject + "|" + a.claim));
        const fresh = incoming.filter((a) => !seen.has(a.subject + "|" + a.claim));
        return { ...c, assertions: [...fresh, ...c.assertions].slice(0, MAX_ASSERTIONS) };
      });
    },
    [patchChat],
  );

  const setDemo = useCallback(
    (on: boolean) => {
      const cur = read();
      // Turning the example off takes its notices with it, but never touches
      // anything the user uploaded or approved themselves.
      persist({ ...cur, demo: on });
    },
    [persist],
  );

  /** Forgetting is per conversation: this one's claims and transcript, nothing else. */
  const clearKnowledge = useCallback(() => {
    const cur = read();
    if (!cur.activeChatId) return;
    patchChat(cur.activeChatId, (c) => ({ ...c, turns: [], assertions: [] }));
  }, [patchChat]);

  /** Switch to this account's workspace. Used by both signing in and signing up. */
  const adopt = useCallback((next: Account) => {
    scope = next.id;
    rememberSession(next.id);
    setAccount(next);
    const stored = read();
    applyDataset(stored);
    setState(stored);
  }, []);

  const signOut = useCallback(() => {
    forgetSession();
    scope = GUEST.id;
    setAccount(GUEST);
    const stored = read();
    applyDataset(stored);
    setState(stored);
    setUpload(NO_UPLOAD);
  }, []);

  const startUpload = useCallback(
    (file: File) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setUpload({
        ...NO_UPLOAD,
        status: "running",
        filename: file.name,
        startedAt: Date.now(),
      });

      const known = activeDataset()
        .nodes.filter((n) => n.kind !== "product")
        .map((n) => n.id);

      void ingestDocument(
        file,
        known,
        {
          onBegin: (name) => setUpload((u) => ({ ...u, current: name })),
          onStage: (stage) =>
            setUpload((u) => ({ ...u, stages: [...u.stages, stage], current: null })),
          onDone: (result) => {
            // Persist the notice first, so the page it links to exists.
            persist({ ...read(), uploaded: [result.pcn, ...read().uploaded] });
            setUpload((u) => ({
              ...u,
              status: "done",
              current: null,
              stages: result.stages,
              totals: result.totals,
              pcnId: result.pcn.id,
            }));
          },
          onError: (failure) =>
            setUpload((u) => ({
              ...u,
              status: "error",
              current: null,
              stages: failure.stages.length ? failure.stages : u.stages,
              totals: failure.totals ?? u.totals,
              error: failure.error,
              readText: failure.readText ?? null,
              diagnosis: failure.diagnosis ?? null,
            })),
        },
        controller.signal,
      );
    },
    [persist],
  );

  const clearUpload = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    setUpload(NO_UPLOAD);
  }, []);

  const reset = useCallback(() => persist(EMPTY), [persist]);

  return useMemo(
    () => ({
      // Only what this user actually added, unless the example is switched on.
      account,
      signedIn: account !== null && account.id !== GUEST.id,
      adopt,
      signOut,
      notices: state.demo ? [...state.uploaded, ...PCN_INBOX] : state.uploaded,
      uploaded: state.uploaded,
      demo: state.demo,
      setDemo,
      datasetKey: state.bom
        ? `bom:${state.bom.name}:${state.bom.importedAt}`
        : state.demo
          ? "demo"
          : "empty",
      approvals: state.approvals,
      assessments: state.assessments,
      hydrated,
      bom: state.bom,
      loadBom,
      clearBom,
      addNotice,
      removeNotice,
      approve,
      isApproved: (pcnId, partId) =>
        state.approvals.some((a) => a.pcnId === pcnId && a.partId === partId),
      saveAssessment,
      getAssessment: (pcnId) =>
        state.assessments.find((a) => a.pcnId === pcnId)?.payload ?? null,
      sources: state.sources,
      chats: state.chats,
      chat: state.chats.find((c) => c.id === state.activeChatId) ?? null,
      openChat,
      startChat,
      forkChat,
      renameChat,
      deleteChat,
      setTurns,
      addSource,
      updateSource,
      removeSource,
      addAssertions,
      clearKnowledge,
      upload,
      startUpload,
      clearUpload,
      reset,
    }),
    [
      state,
      hydrated,
      upload,
      account,
      adopt,
      signOut,
      addNotice,
      removeNotice,
      approve,
      saveAssessment,
      reset,
      loadBom,
      clearBom,
      startUpload,
      clearUpload,
      addSource,
      updateSource,
      removeSource,
      addAssertions,
      clearKnowledge,
      setDemo,
      openChat,
      startChat,
      forkChat,
      renameChat,
      deleteChat,
      setTurns,
      patchChat,
    ],
  );
}

export const WorkspaceContext = Ctx;

export function useWorkspace(): Workspace {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
