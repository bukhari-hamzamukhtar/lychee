/**
 * LastBuy impact engine.
 *
 * Deliberately contains no language model. Propagating a part change through a
 * multi-level bill of materials is exact arithmetic over a DAG; an LLM asked to
 * do it will invent quantities. The model's job is reading the notice and
 * writing the memo. This file's job is deciding what is actually affected, and
 * showing the path it used so a human can check it.
 */
import { NODES, EDGES, SUPPLIERS, CUSTOMERS, CERTIFICATIONS } from "@/data/factory";
import type {
  BomNode,
  BomEdge,
  Supplier,
  Customer,
  Certification,
  ImpactReport,
  AffectedProduct,
} from "./types";

/**
 * The engine runs against whichever dataset is active.
 *
 * It ships with the demo factory loaded, but a company's bill of materials is
 * its own — no obsolescence tool can know yours, which is why every product in
 * this category asks you to bring it. `setActiveDataset` swaps it, rebuilds the
 * adjacency and clears the memos, and every function below keeps working
 * unchanged because they all read through this one object.
 */
export interface Dataset {
  nodes: BomNode[];
  edges: BomEdge[];
  suppliers: Supplier[];
  customers: Customer[];
  certifications: Certification[];
}

export const DEMO_DATASET: Dataset = {
  nodes: NODES,
  edges: EDGES,
  suppliers: SUPPLIERS,
  customers: CUSTOMERS,
  certifications: CERTIFICATIONS,
};

/**
 * Nothing loaded.
 *
 * The default, deliberately. A workspace that opens showing the demo factory's
 * sixteen components and three parts at risk is making a claim about what this
 * company builds, and it is wrong. An empty graph produces empty screens, which
 * is honest, and the screens say how to fill them.
 */
export const EMPTY_DATASET: Dataset = {
  nodes: [],
  edges: [],
  suppliers: [],
  customers: [],
  certifications: [],
};

let active: Dataset = EMPTY_DATASET;

const WEEKS_PER_MONTH = 4.333;
/** How long the company contracts to keep supplying spares. */
export const SERVICE_HORIZON_WEEKS = 156;
/** Extra cover bought on top of forecast demand, for scrap and warranty. */
export const SPARES_BUFFER = 0.1;
/** Finished-goods price as a multiple of BOM cost. Industry rule of thumb. */
const PRICE_MULTIPLE = 3;

const qtyMemo = new Map<string, Record<string, number>>();
const costMemo = new Map<string, number>();

let byId = new Map<string, BomNode>();
let supplierById = new Map<string, Supplier>();
let parentsOf = new Map<string, { id: string; qtyPer: number }[]>();
let childrenOf = new Map<string, { id: string; qtyPer: number }[]>();

function rebuild() {
  byId = new Map(active.nodes.map((n) => [n.id, n]));
  supplierById = new Map(active.suppliers.map((s) => [s.id, s]));
  parentsOf = new Map();
  childrenOf = new Map();
  for (const e of active.edges) {
    if (!parentsOf.has(e.child)) parentsOf.set(e.child, []);
    parentsOf.get(e.child)!.push({ id: e.parent, qtyPer: e.qtyPer });
    if (!childrenOf.has(e.parent)) childrenOf.set(e.parent, []);
    childrenOf.get(e.parent)!.push({ id: e.child, qtyPer: e.qtyPer });
  }
  // Memos are keyed by node id, which means nothing once the dataset changes.
  qtyMemo.clear();
  costMemo.clear();
}

/** Swap in an imported bill of materials. */
export function setActiveDataset(ds: Dataset) {
  active = ds;
  rebuild();
}

/** Back to nothing loaded. */
export function resetDataset() {
  active = EMPTY_DATASET;
  rebuild();
}

/** The shipped example, when someone asks to see it. */
export function loadDemoDataset() {
  active = DEMO_DATASET;
  rebuild();
}

export function activeDataset(): Dataset {
  return active;
}

export function node(id: string): BomNode | undefined {
  return byId.get(id);
}

/**
 * Quantity of `id` consumed per unit of each product that contains it.
 *
 * For a product P the answer is trivially { P: 1 }. Otherwise, for every parent
 * p that consumes q of this node, this node inherits q times whatever p needs
 * per product — summed over every parent, because a component can reach the
 * same product through more than one route.
 */
export function qtyPerProduct(id: string): Record<string, number> {
  const hit = qtyMemo.get(id);
  if (hit) return hit;

  const n = byId.get(id);
  if (!n) return {};

  let out: Record<string, number> = {};
  const parents = parentsOf.get(id) ?? [];
  if (n.kind === "product" || parents.length === 0) {
    out = n.kind === "product" ? { [id]: 1 } : {};
  } else {
    for (const p of parents) {
      const up = qtyPerProduct(p.id);
      for (const [root, qty] of Object.entries(up)) {
        out[root] = (out[root] ?? 0) + qty * p.qtyPer;
      }
    }
  }
  qtyMemo.set(id, out);
  return out;
}

/** Every route from `id` up to a product, for auditability. */
export function pathsToProducts(id: string, limitPerRoot = 3): string[][] {
  const paths: string[][] = [];
  const walk = (cur: string, acc: string[]) => {
    if (acc.length > 8) return;
    const n = byId.get(cur);
    const parents = parentsOf.get(cur) ?? [];
    if (n?.kind === "product" || parents.length === 0) {
      paths.push([...acc, cur]);
      return;
    }
    for (const p of parents) walk(p.id, [...acc, cur]);
  };
  walk(id, []);

  const seen = new Map<string, number>();
  return paths.filter((p) => {
    const root = p[p.length - 1];
    const n = (seen.get(root) ?? 0) + 1;
    seen.set(root, n);
    return n <= limitPerRoot;
  });
}

/** Rolled-up material cost of a node, by walking the BOM downward. */
export function rolledUpCost(id: string): number {
  const hit = costMemo.get(id);
  if (hit !== undefined) return hit;
  const n = byId.get(id);
  if (!n) return 0;
  const kids = childrenOf.get(id) ?? [];
  const cost = kids.length === 0
    ? n.unitCostEur ?? 0
    : kids.reduce((sum, k) => sum + k.qtyPer * rolledUpCost(k.id), 0);
  costMemo.set(id, cost);
  return cost;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Full downstream impact of a part going end-of-life.
 * `asOf` is injected rather than read from the clock so results are reproducible.
 */
export function impactOf(partId: string, lastBuyDate: string, asOf: Date): ImpactReport | null {
  const part = byId.get(partId);
  if (!part) return null;

  const qtyMap = qtyPerProduct(partId);
  const allPaths = pathsToProducts(partId);

  const affectedProducts: AffectedProduct[] = Object.entries(qtyMap)
    .map(([productId, qtyPerUnit]) => {
      const p = byId.get(productId)!;
      return {
        productId,
        productName: p.name,
        qtyPerUnit,
        monthlyDemand: p.monthlyDemand ?? 0,
        paths: allPaths.filter((path) => path[path.length - 1] === productId),
      };
    })
    .sort((a, b) => b.qtyPerUnit * b.monthlyDemand - a.qtyPerUnit * a.monthlyDemand);

  const productIds = new Set(affectedProducts.map((p) => p.productId));

  // Assemblies between the part and the products, in BOM order.
  const affectedAssemblies = [
    ...new Set(allPaths.flatMap((p) => p.slice(1, -1))),
  ].filter((id) => byId.get(id)?.kind === "assembly");

  const affectedCustomers = active.customers.filter((c) =>
    c.productIds.some((p) => productIds.has(p)),
  ).map((c) => ({
    customerId: c.id,
    name: c.name,
    annualUnits: c.annualUnits,
    productIds: c.productIds.filter((p) => productIds.has(p)),
  }));

  // A certificate only re-opens if this part is named critical in it.
  const affectedCertifications = active.certifications.filter(
    (c) => c.criticalPartIds.includes(partId) && c.productIds.some((p) => productIds.has(p)),
  ).map((c) => ({
    id: c.id,
    name: c.name,
    clause: c.clause,
    requalWeeks: c.requalWeeks,
    requalCostEur: c.requalCostEur,
  }));

  const weeklyConsumption = affectedProducts.reduce(
    (sum, p) => sum + (p.monthlyDemand / WEEKS_PER_MONTH) * p.qtyPerUnit,
    0,
  );

  const stockQty = part.stockQty ?? 0;
  const runwayWeeks = weeklyConsumption > 0 ? stockQty / weeklyConsumption : Infinity;
  const leadTimeWeeks = part.leadTimeWeeks ?? 0;
  const coverGapWeeks = Number.isFinite(runwayWeeks)
    ? Math.max(0, round1(leadTimeWeeks - runwayWeeks))
    : 0;

  const needed = weeklyConsumption * SERVICE_HORIZON_WEEKS * (1 + SPARES_BUFFER);
  const lastBuyQty = Math.max(0, Math.ceil(needed - stockQty));
  const lastBuyCostEur = lastBuyQty * (part.unitCostEur ?? 0);

  const revenueAtRiskEur = affectedProducts.reduce(
    (sum, p) => sum + (p.monthlyDemand ?? 0) * 12 * rolledUpCost(p.productId) * PRICE_MULTIPLE,
    0,
  );

  const daysToLastBuy = daysBetween(asOf, new Date(lastBuyDate));

  // ---- criticality ----
  // Each term is clamped to 0..1 then weighted, so the score stays explainable.
  const urgency = clamp01(1 - daysToLastBuy / 365);
  const reach = clamp01(affectedProducts.length / 4);
  const coverGap = clamp01(1 - runwayWeeks / Math.max(1, leadTimeWeeks || 1));
  const sole = part.altSources === 0 ? 1 : part.altSources === 1 ? 0.5 : 0;
  const certHit = affectedCertifications.length > 0 ? 1 : 0;

  const criticality = Math.round(
    100 * (0.3 * urgency + 0.2 * reach + 0.2 * coverGap + 0.15 * sole + 0.15 * certHit),
  );

  return {
    partId,
    partName: part.name,
    supplierName: supplierById.get(part.supplierId ?? "")?.name ?? "unknown",
    lastBuyDate,
    daysToLastBuy,
    affectedAssemblies,
    affectedProducts,
    affectedCustomers,
    affectedCertifications,
    stockQty,
    weeklyConsumption: round1(weeklyConsumption),
    runwayWeeks: Number.isFinite(runwayWeeks) ? round1(runwayWeeks) : Infinity,
    leadTimeWeeks,
    coverGapWeeks,
    coverageWeeks: weeklyConsumption > 0 ? Math.round((stockQty + lastBuyQty) / weeklyConsumption) : 0,
    lastBuyQty,
    lastBuyCostEur: Math.round(lastBuyCostEur),
    revenueAtRiskEur: Math.round(revenueAtRiskEur),
    criticality,
    verdict: criticality >= 70 ? "critical" : criticality >= 40 ? "high" : "watch",
  };
}

/**
 * Forward-looking obsolescence risk, from graph structure rather than from any
 * announcement. Pure features for now; this is the slot a trained graph model
 * drops into, and the feature vector is already the one it would consume.
 */
export function obsolescenceRisk(partId: string) {
  const part = byId.get(partId);
  if (!part || part.kind !== "part") return null;
  const supplier = supplierById.get(part.supplierId ?? "");
  const fanIn = (parentsOf.get(partId) ?? []).length;
  const reach = Object.keys(qtyPerProduct(partId)).length;

  const features = {
    supplierEolRate: supplier?.eolRate ?? 0.05,
    soleSourced: part.altSources === 0 ? 1 : 0,
    lowAltSources: clamp01(1 - (part.altSources ?? 0) / 4),
    longLeadTime: clamp01((part.leadTimeWeeks ?? 0) / 36),
    nrnd: part.lifecycle === "nrnd" ? 1 : 0,
    fanIn: clamp01(fanIn / 4),
    productReach: clamp01(reach / 4),
  };

  const score = Math.round(
    100 *
      clamp01(
        2.2 * features.supplierEolRate +
          0.2 * features.soleSourced +
          0.15 * features.lowAltSources +
          0.15 * features.longLeadTime +
          0.25 * features.nrnd +
          0.1 * features.fanIn +
          0.1 * features.productReach,
      ),
  );
  return { partId, name: part.name, score, features };
}

/**
 * Annual revenue of one finished product, at a standard price multiple.
 *
 * Exposed separately so callers aggregating across several notices can take the
 * union of affected products rather than summing each notice's total — two
 * notices on different parts usually threaten overlapping products, and adding
 * their totals counts the same revenue twice.
 */
export function productAnnualRevenue(productId: string): number {
  const p = byId.get(productId);
  if (!p || p.kind !== "product") return 0;
  return (p.monthlyDemand ?? 0) * 12 * rolledUpCost(productId) * PRICE_MULTIPLE;
}

/** Every component beneath a node, with how many go into one unit of it. */
export function partsUnder(id: string): { partId: string; qtyPer: number }[] {
  const totals = new Map<string, number>();
  const walk = (cur: string, mult: number) => {
    const kids = childrenOf.get(cur) ?? [];
    if (kids.length === 0) {
      if (byId.get(cur)?.kind === "part") totals.set(cur, (totals.get(cur) ?? 0) + mult);
      return;
    }
    for (const k of kids) walk(k.id, mult * k.qtyPer);
  };
  walk(id, 1);
  return [...totals.entries()]
    .map(([partId, qtyPer]) => ({ partId, qtyPer }))
    .sort((a, b) => b.qtyPer - a.qtyPer);
}

/** Products are the graph's roots. */
export function allProducts(): BomNode[] {
  return active.nodes.filter((n) => n.kind === "product");
}

/** Annual build cost of a product line at standard cost. */
export function annualMaterialCost(productId: string): number {
  const p = byId.get(productId);
  if (!p) return 0;
  return (p.monthlyDemand ?? 0) * 12 * rolledUpCost(productId);
}

export function allPartsByRisk() {
  return active.nodes.filter((n) => n.kind === "part")
    .map((n) => obsolescenceRisk(n.id)!)
    .sort((a, b) => b.score - a.score);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function round1(x: number) {
  return Math.round(x * 10) / 10;
}

rebuild();
