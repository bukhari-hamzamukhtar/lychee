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
import { setActiveDataset, resetDataset, activeDataset, type Dataset } from "./graph";
import type { Pcn } from "./types";
import {
  ingestDocument,
  type IngestStage,
  type IngestTotals,
} from "./ingest-client";

const KEY = "lastbuy.workspace.v1";

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
}

const EMPTY: Persisted = { uploaded: [], approvals: [], assessments: [], bom: null };

function read(): Persisted {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      uploaded: parsed.uploaded ?? [],
      approvals: parsed.approvals ?? [],
      assessments: parsed.assessments ?? [],
      bom: parsed.bom ?? null,
    };
  } catch {
    // A corrupt or blocked store should not take the app down with it.
    return EMPTY;
  }
}

function write(state: Persisted) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
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
  notices: Pcn[];
  uploaded: Pcn[];
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
  // Only one document at a time; starting another supersedes the first.
  const inFlight = useRef<AbortController | null>(null);

  // Read after mount only: localStorage does not exist during the server render,
  // and reading it in an initialiser would produce a hydration mismatch.
  useEffect(() => {
    const stored = read();
    // The engine is a module singleton, so a bill of materials imported in an
    // earlier visit has to be put back before anything renders against it.
    if (stored.bom) setActiveDataset(stored.bom.dataset);
    setState(stored);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Persisted) => {
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
    (bom: ImportedBom) => {
      setActiveDataset(bom.dataset);
      persist({ ...read(), bom });
    },
    [persist],
  );

  const clearBom = useCallback(() => {
    resetDataset();
    persist({ ...read(), bom: null });
  }, [persist]);

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

  const reset = useCallback(() => {
    resetDataset();
    persist(EMPTY);
  }, [persist]);

  return useMemo(
    () => ({
      notices: [...state.uploaded, ...PCN_INBOX],
      uploaded: state.uploaded,
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
      upload,
      startUpload,
      clearUpload,
      reset,
    }),
    [
      state,
      hydrated,
      upload,
      addNotice,
      removeNotice,
      approve,
      saveAssessment,
      reset,
      loadBom,
      clearBom,
      startUpload,
      clearUpload,
    ],
  );
}

export const WorkspaceContext = Ctx;

export function useWorkspace(): Workspace {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
