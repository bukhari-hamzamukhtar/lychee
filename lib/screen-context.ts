"use client";

/**
 * A plain-text snapshot of whatever the person is looking at.
 *
 * Built on the client from the same sources the page renders from, so the
 * assistant sees the same figures the person does rather than a second,
 * possibly stale copy fetched on the server. Deliberately terse: it is prompt
 * context, and every line of it competes with the question for attention.
 */
import { PCN_INBOX, SUPPLIERS, CERTIFICATIONS, CUSTOMERS, NODES } from "@/data/factory";
import { impactOf, allPartsByRisk, obsolescenceRisk, qtyPerProduct, node } from "@/lib/graph";
import type { Pcn } from "./types";
import type { Approval } from "./store";

const ASOF = new Date("2026-10-14T00:00:00Z");
const eur = (n: number) => `EUR ${Math.round(n).toLocaleString("en-GB")}`;

export function buildScreenContext({
  pathname,
  notices,
  uploaded,
  approvals,
}: {
  pathname: string;
  notices: Pcn[];
  uploaded: Pcn[];
  approvals: Approval[];
}): string {
  const lines: string[] = [];
  const seg = pathname.split("/").filter(Boolean);

  lines.push(`Screen: ${pathname}`);
  lines.push(
    `Workspace: ${notices.length} notices (${uploaded.length} uploaded by this user), ${approvals.length} approvals recorded.`,
  );

  // ---- a single notice -----------------------------------------------------
  if (seg[0] === "notices" && seg[1]) {
    const id = decodeURIComponent(seg[1]);
    const pcn = notices.find((p) => p.id === id);
    if (!pcn) return [...lines, `No notice with id ${id} is in the workspace.`].join("\n");

    const supplier = SUPPLIERS.find((s) => s.id === pcn.supplierId)?.name ?? pcn.supplierId;
    lines.push(
      `Viewing notice ${pcn.id} from ${supplier}, received ${pcn.receivedAt}, arrived in ${pcn.language.toUpperCase()}, type ${pcn.type}, last-time-buy ${pcn.lastBuyDate}.`,
    );
    if (uploaded.some((u) => u.id === pcn.id)) {
      lines.push("This notice was uploaded by the user, not seeded.");
    }

    for (const partId of pcn.partIds) {
      const r = impactOf(partId, pcn.lastBuyDate, ASOF);
      if (!r) continue;
      lines.push(
        `Part ${r.partId} (${r.partName}): ${r.verdict}, criticality ${r.criticality}. ` +
          `${r.daysToLastBuy} days to last buy. Stock ${r.stockQty} = ${r.runwayWeeks} weeks cover against ${r.leadTimeWeeks} weeks lead time` +
          (r.coverGapWeeks > 0 ? `, so ${r.coverGapWeeks} weeks short already` : "") +
          `. Consumption ${r.weeklyConsumption}/week. Must buy ${r.lastBuyQty} for ${eur(r.lastBuyCostEur)}. Revenue exposed ${eur(r.revenueAtRiskEur)}/yr.`,
      );
      lines.push(
        `  Reaches: ${r.affectedProducts.map((p) => `${p.productId} (${p.qtyPerUnit}/unit, ${p.monthlyDemand}/mo)`).join(", ")}.`,
      );
      if (r.affectedAssemblies.length) {
        lines.push(`  Via assemblies: ${r.affectedAssemblies.join(", ")}.`);
      }
      lines.push(
        r.affectedCertifications.length
          ? `  Certifications re-opened: ${r.affectedCertifications.map((c) => `${c.id} ${c.clause} (${c.requalWeeks} wk, ${eur(c.requalCostEur)})`).join("; ")}.`
          : "  No certification names this part as critical.",
      );
      lines.push(`  Customers under contract: ${r.affectedCustomers.map((c) => c.name).join(", ")}.`);
    }

    lines.push(`Original notice text as received:\n${pcn.rawText.slice(0, 1200)}`);
    return lines.join("\n");
  }

  // ---- a single part -------------------------------------------------------
  if (seg[0] === "parts" && seg[1]) {
    const id = decodeURIComponent(seg[1]);
    const part = node(id);
    if (!part) return [...lines, `No part with id ${id} exists.`].join("\n");
    const risk = obsolescenceRisk(id);
    const supplier = SUPPLIERS.find((s) => s.id === part.supplierId);
    const qty = qtyPerProduct(id);
    lines.push(
      `Viewing part ${part.id} (${part.name}) from ${supplier?.name}. Unit cost ${eur(part.unitCostEur ?? 0)}, lead time ${part.leadTimeWeeks} weeks, stock ${part.stockQty}, ${part.altSources} alternative sources, lifecycle ${part.lifecycle}.`,
    );
    if (risk) lines.push(`Obsolescence risk score ${risk.score}/100.`);
    lines.push(
      `Used in: ${Object.entries(qty).map(([p, q]) => `${p} (${q}/unit)`).join(", ") || "no product"}.`,
    );
    const certs = CERTIFICATIONS.filter((c) => c.criticalPartIds.includes(id));
    lines.push(
      certs.length
        ? `Named critical in: ${certs.map((c) => `${c.id} ${c.clause}`).join("; ")}.`
        : "Not named critical in any certification.",
    );
    return lines.join("\n");
  }

  // ---- list screens --------------------------------------------------------
  switch (seg[0]) {
    case undefined:
      lines.push("Viewing the landing page, which explains what LastBuy does.");
      break;

    case "notices": {
      lines.push("Viewing the notice inbox.");
      for (const p of notices) {
        const r = p.partIds.map((id) => impactOf(id, p.lastBuyDate, ASOF)).find(Boolean);
        lines.push(
          `- ${p.id}: ${p.partIds.join(", ")} from ${SUPPLIERS.find((s) => s.id === p.supplierId)?.name}, ${p.language.toUpperCase()}, last buy ${p.lastBuyDate}` +
            (r ? `, ${r.daysToLastBuy} days away, ${r.verdict}, order ${eur(r.lastBuyCostEur)}` : ""),
        );
      }
      break;
    }

    case "parts": {
      lines.push("Viewing all parts, ranked by obsolescence risk.");
      for (const r of allPartsByRisk().slice(0, 10)) {
        const n = node(r.partId);
        lines.push(
          `- ${r.partId} (${n?.name}): risk ${r.score}, stock ${n?.stockQty}, lead ${n?.leadTimeWeeks} wk, ${n?.altSources} alternatives`,
        );
      }
      break;
    }

    case "products": {
      lines.push("Viewing product lines.");
      for (const p of NODES.filter((n) => n.kind === "product")) {
        const customers = CUSTOMERS.filter((c) => c.productIds.includes(p.id)).length;
        lines.push(`- ${p.id} ${p.name}: ${p.monthlyDemand}/month, ${customers} customers under contract`);
      }
      break;
    }

    case "suppliers": {
      lines.push("Viewing suppliers, ranked by how often they discontinue parts.");
      for (const s of SUPPLIERS) {
        const parts = NODES.filter((n) => n.kind === "part" && n.supplierId === s.id);
        lines.push(
          `- ${s.name} (${s.country}): ${parts.length} components, discontinues ${(s.eolRate * 100).toFixed(1)}% of catalogue per year`,
        );
      }
      break;
    }

    case "certifications": {
      lines.push("Viewing certifications.");
      for (const c of CERTIFICATIONS) {
        lines.push(
          `- ${c.id} ${c.name}, clause ${c.clause}. Covers ${c.productIds.join(", ")}. Critical parts: ${c.criticalPartIds.join(", ")}. Requalification ${c.requalWeeks} wk, ${eur(c.requalCostEur)} per product.`,
        );
      }
      break;
    }

    case "approvals": {
      lines.push("Viewing the approvals queue.");
      if (approvals.length === 0) lines.push("Nothing has been approved yet.");
      for (const a of approvals) {
        lines.push(
          `- ${a.id}: ${a.qty} of ${a.partId} for ${eur(a.costEur)} from ${a.supplier}, order by ${a.lastBuyDate}, approved by ${a.approvedBy}`,
        );
      }
      break;
    }
  }

  return lines.join("\n");
}

/** Seeded notices exist so the demo has something to show; say so if asked. */
export const SAMPLE_NOTE = `The three notices starting PCN-ADI, PCN-TDK and PCN-INF are samples shipped with the demo. Anything the user uploads is marked as uploaded.`;

export { PCN_INBOX };
