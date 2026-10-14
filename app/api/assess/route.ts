/**
 * Assess one supplier notice, end to end.
 *
 *   Evolus translate      notice -> English, whatever language it arrived in
 *   Evolus doc-structure  prose  -> structured fields
 *   graph engine          exact impact, no model involved
 *   Gemma on AMD          the memo a buyer actually reads
 *   Evolus email          drafts for the supplier and the customers
 *
 * Each stage reports what it cost, because a judge will ask and because a
 * buyer deciding whether to run this on every notice needs the number.
 */
import { NextResponse } from "next/server";
import { PCN_INBOX, SUPPLIERS } from "@/data/factory";
import { impactOf } from "@/lib/graph";
import { chatGuarded, MODEL } from "@/lib/amd";
import { runTool, askAgent, agentConfigured } from "@/lib/evolus";
import { docsMentioning, asContext } from "@/lib/library";
import type { ImpactReport } from "@/lib/types";

export const runtime = "nodejs";
// Vercel Hobby caps a function at 60s. The pipeline runs in well under that
// now that the memo and the two drafts go out concurrently.
export const maxDuration = 60;

const ASOF = new Date("2026-10-14T00:00:00Z");

interface Stage {
  order: number;
  name: string;
  provider: "evolus" | "amd" | "local";
  ms: number;
  credits?: number;
  costUsd?: number;
}

export async function POST(req: Request) {
  let pcnId: string;
  try {
    ({ pcnId } = await req.json());
  } catch {
    return NextResponse.json({ error: "expected JSON body with pcnId" }, { status: 400 });
  }

  const pcn = PCN_INBOX.find((p) => p.id === pcnId);
  if (!pcn) return NextResponse.json({ error: `unknown notice ${pcnId}` }, { status: 404 });

  const supplier = SUPPLIERS.find((s) => s.id === pcn.supplierId);
  const startedAt = Date.now();
  const stages: Stage[] = [];

  /**
   * `order` is passed in rather than taken from completion order, because the
   * last three stages run concurrently and would otherwise be listed in
   * whatever sequence they happened to finish.
   */
  const timed = async <T>(
    order: number,
    name: string,
    provider: Stage["provider"],
    fn: () => Promise<T>,
    cost?: (r: T) => Pick<Stage, "credits" | "costUsd">,
  ): Promise<T> => {
    const t0 = Date.now();
    const out = await fn();
    stages.push({ order, name, provider, ms: Date.now() - t0, ...(cost ? cost(out) : {}) });
    return out;
  };

  try {
    // 1. Translation. Notices arrive in the supplier's language, not yours.
    const english =
      pcn.language === "en"
        ? pcn.rawText
        : (
            await timed(
              1,
              "translate notice",
              "evolus",
              () => runTool("translate", pcn.rawText, { target: "English", style: "formal" }),
              (r) => ({ credits: r.creditsConsumed }),
            )
          ).output;

    // 2. Structured extraction, so the deadline is a date and not a sentence.
    const extracted = await timed(
      2,
      "extract fields",
      "evolus",
      () => runTool("doc-structure", english, { format: "json", content: "data" }),
      (r) => ({ credits: r.creditsConsumed }),
    );

    // 3. The impact itself. Arithmetic over the BOM graph, no model.
    const reports = await timed(3, "propagate through BOM", "local", async () =>
      pcn.partIds
        .map((id) => impactOf(id, pcn.lastBuyDate, ASOF))
        .filter((r): r is ImpactReport => r !== null),
    );

    if (reports.length === 0) {
      return NextResponse.json(
        { error: "notice names no part present in this BOM", pcnId },
        { status: 422 },
      );
    }
    const lead = reports[0];

    // 4. Memo and drafts all depend only on the impact, so they run together.
    //    Sequentially this took ~17s of the budget; Vercel's Hobby plan caps a
    //    function at 60s and the Evolus tools are the slow part.
    const [memo, supplierEmail, customerEmail, ruling] = await Promise.all([
    timed(
      4,
      "write impact memo",
      "amd",
      () =>
        chatGuarded(
          [
            {
              role: "system",
              content:
                "You write procurement memos for a manufacturer. Be concrete and brief. " +
                "Use only the figures supplied; never invent or recompute a number. " +
                "No greeting, no sign-off. Six sentences at most.",
            },
            { role: "user", content: memoPrompt(english, lead) },
          ],
          { model: MODEL.generate, fallbackModel: MODEL.fallback, maxTokens: 900, temperature: 0.3, topP: 1.0, askedShort: true },
        ),
      (r) => ({ costUsd: r.costUsd }),
    ),

    // 5. Drafts. Nothing is addressed or sent until a person approves.
    timed(
      5,
      "draft supplier order",
      "evolus",
      () =>
        runTool(
          "email",
          `Write to ${supplier?.name} referencing notice ${pcn.id}. Place a last-time-buy order ` +
            `for ${lead.lastBuyQty} pieces of ${lead.partId} before ${lead.lastBuyDate}. ` +
            `Ask them to confirm the order and the final ship date, and to confirm whether a ` +
            `qualified drop-in replacement exists.`,
          { mode: "write", tone: "commercial" },
        ),
      (r) => ({ credits: r.creditsConsumed }),
    ),

    timed(
      6,
      "draft customer notice",
      "evolus",
      () =>
        runTool(
          "email",
          `Write to customers under supply contract. A component in our ${lead.affectedProducts
            .slice(0, 3)
            .map((p) => p.productId)
            .join(", ")} is being discontinued by its manufacturer. We have secured coverage ` +
            `for the contracted service life. No action is needed from them, no price change, ` +
            `and no change to form, fit or function. Reassuring but factual.`,
          { mode: "write", tone: "formal" },
        ),
      (r) => ({ credits: r.creditsConsumed }),
    ),

    // 6. Certification consequence, answered by the workspace agent from the
    //    standards documents. Only asked when a certificate is actually at
    //    risk, because otherwise there is nothing for it to rule on.
    lead.affectedCertifications.length > 0 && agentConfigured()
      ? timed(
          7,
          "rule on certification impact",
          "evolus",
          () =>
            askAgent(
              `${lead.partId} is being discontinued. A last-time-buy is one option and ` +
                `substitution is the other. In no more than four sentences, state which ` +
                `certifications re-open on substitution, cite the clause, and say what ` +
                `evidence the approval file would need. Do not restate quantities or costs.`,
              asContext(docsMentioning(lead.partId)),
            ).catch((e) => ({
              // A failed ruling must not lose the rest of the assessment.
              text: "",
              conversationId: null,
              model: "",
              error: e instanceof Error ? e.message : "agent unavailable",
            })),
        )
      : Promise.resolve(null),
    ]);

    stages.sort((a, b) => a.order - b.order);

    const totals = {
      // Wall clock, not the sum of the stages: the last three overlap, so
      // adding them would report a duration nobody actually waited.
      ms: Date.now() - startedAt,
      evolusCredits: Number(
        stages.reduce((s, x) => s + (x.credits ?? 0), 0).toFixed(3),
      ),
      amdCostUsd: Number(stages.reduce((s, x) => s + (x.costUsd ?? 0), 0).toFixed(6)),
    };

    return NextResponse.json({
      pcnId: pcn.id,
      originalLanguage: pcn.language,
      translated: english,
      extracted: extracted.output,
      reports,
      memo: memo.text,
      /** Agent ruling, grounded in the standards documents. Null when no
          certificate is affected, or empty when the agent could not answer. */
      certificationRuling: ruling && "text" in ruling ? ruling.text : null,
      agentModel: ruling && "model" in ruling ? ruling.model : null,
      drafts: {
        supplier: supplierEmail.output,
        customer: customerEmail.output,
      },
      /** Drafts only. Dispatch requires an explicit human approval. */
      approved: false,
      stages,
      totals,
      model: memo.model,
      /** Which models were tried, so a degenerate generation is visible not hidden. */
      modelAttempts: memo.attempts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown failure";
    // Surface which stage broke rather than a blanket 500.
    return NextResponse.json({ error: message, stages }, { status: 502 });
  }
}

function memoPrompt(notice: string, r: ImpactReport): string {
  const certs = r.affectedCertifications.map((c) => `${c.id} (${c.clause})`).join("; ") || "none";
  // The notice is context, not the subject. Trimmed, because the figures below
  // are authoritative and a long quote only gives the model room to drift.
  const excerpt = notice.replace(/\s+/g, " ").trim().slice(0, 600);
  return [
    "SUPPLIER NOTICE (excerpt):",
    excerpt,
    "",
    "VERIFIED FIGURES, computed from our bill of materials:",
    `- part: ${r.partId}, ${r.partName}, from ${r.supplierName}`,
    `- last-time-buy date: ${r.lastBuyDate}, which is ${r.daysToLastBuy} days away`,
    `- number of finished products affected: ${r.affectedProducts.length}`,
    `- number of intermediate assemblies affected: ${r.affectedAssemblies.length} (${r.affectedAssemblies.join(", ")})`,
    `- per-unit usage: ${r.affectedProducts.map((p) => `${p.productId} needs ${p.qtyPerUnit}`).join(", ")}`,
    `- consumption: ${r.weeklyConsumption} pieces per week`,
    `- stock on hand: ${r.stockQty}, which is ${r.runwayWeeks} weeks of cover`,
    `- replenishment lead time for this part: ${r.leadTimeWeeks} weeks`,
    `- shortfall of cover against lead time: ${r.coverGapWeeks} weeks`,
    `- last-time-buy quantity required: ${r.lastBuyQty} pieces, EUR ${r.lastBuyCostEur}`,
    "- that quantity covers the contracted service horizon of 156 weeks (3 years) plus a 10% spares buffer",
    `- annual revenue exposed: EUR ${r.revenueAtRiskEur}`,
    `- certifications requiring requalification: ${certs}`,
    `- customers under contract affected: ${r.affectedCustomers.length}`,
    "",
    "Write the memo for the procurement lead. State the decision required and the",
    "deadline first. Call out the gap between stock cover and lead time explicitly if",
    "one exists. End with the single action you recommend.",
    "",
    `The only date you may mention is ${r.lastBuyDate}. Do not state any other date,`,
    "and do not compute a figure that is not listed above.",
  ].join("\n");
}
