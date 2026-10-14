"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { impactOf } from "@/lib/graph";
import { SUPPLIERS } from "@/data/factory";
import { ImpactPanel } from "@/components/ImpactPanel";
import { AssessPanel, type AssessResult } from "@/components/AssessPanel";
import { Badge, Button, Card, Empty, SkeletonRows } from "@/components/ui";

const ASOF = new Date("2026-10-14T00:00:00Z");

export default function NoticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { notices, uploaded, removeNotice, saveAssessment, getAssessment, hydrated } =
    useWorkspace();

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<AssessResult | null>(null);

  const pcn = notices.find((p) => p.id === decodeURIComponent(id));
  const isUpload = uploaded.some((u) => u.id === pcn?.id);
  const supplier = SUPPLIERS.find((s) => s.id === pcn?.supplierId);

  const reports = useMemo(() => {
    if (!pcn) return [];
    return pcn.partIds
      .map((p) => impactOf(p, pcn.lastBuyDate, ASOF))
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.criticality - a.criticality);
  }, [pcn]);

  // A saved run survives navigation and reload; a fresh one supersedes it.
  const result = fresh ?? ((pcn ? getAssessment(pcn.id) : null) as AssessResult | null);

  async function assess() {
    if (!pcn) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pcnId: pcn.id, pcn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `request failed (${res.status})`);
      setFresh(data as AssessResult);
      saveAssessment(pcn.id, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown failure");
    } finally {
      setRunning(false);
    }
  }

  if (!hydrated) return <SkeletonRows n={5} />;

  if (!pcn) {
    return (
      <Empty
        title="No such notice"
        body="It may have been removed from this workspace, or the link is stale."
        action={{ href: "/", label: "Back to notices" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-[12px] text-faint transition-colors hover:text-muted">
            &larr; Notices
          </Link>
          <h1 className="mt-1.5 font-mono text-lg font-semibold tracking-tight">{pcn.id}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {supplier?.name} &middot; received {pcn.receivedAt} &middot;{" "}
            {pcn.type === "eol" ? "end of life" : "product change"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="muted">{pcn.language.toUpperCase()}</Badge>
          {isUpload && <Badge tone="info">uploaded</Badge>}
          <Badge tone="muted">last buy {pcn.lastBuyDate}</Badge>
          {isUpload && (
            <Button
              variant="ghost"
              onClick={() => {
                removeNotice(pcn.id);
                router.push("/");
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      <Card className="px-5 py-4">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-faint">
          As it arrived
        </p>
        <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted">
          {pcn.rawText}
        </pre>
      </Card>

      {reports.length === 0 ? (
        <Empty
          title="Nothing to assess"
          body="This notice names no component in the bill of materials, so there is no downstream impact to compute."
          action={{ href: "/parts", label: "Browse parts" }}
        />
      ) : (
        <div className="space-y-6">
          {reports.map((r) => (
            <ImpactPanel key={r.partId} report={r} />
          ))}

          <AssessPanel
            pcnId={pcn.id}
            report={reports[0]}
            supplierName={supplier?.name ?? pcn.supplierId}
            result={result}
            running={running}
            error={error}
            onRun={assess}
          />
        </div>
      )}
    </div>
  );
}
