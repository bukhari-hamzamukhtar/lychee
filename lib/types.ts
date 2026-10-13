/** LastBuy domain model. A bill of materials is a directed acyclic graph. */

export type NodeKind = "part" | "assembly" | "product";
export type Lifecycle = "active" | "nrnd" | "eol" | "obsolete";

export interface Supplier {
  id: string;
  name: string;
  country: string;
  /** Historical share of this supplier's catalogue that went EOL. Feeds risk scoring. */
  eolRate: number;
}

export interface BomNode {
  id: string;
  kind: NodeKind;
  name: string;
  supplierId?: string;
  unitCostEur?: number;
  leadTimeWeeks?: number;
  stockQty?: number;
  lifecycle?: Lifecycle;
  /** Products only: units built per month. */
  monthlyDemand?: number;
  /** Parts only: how many other manufacturers make a drop-in equivalent. */
  altSources?: number;
}

/** parent consumes `qtyPer` of child. */
export interface BomEdge {
  parent: string;
  child: string;
  qtyPer: number;
}

export interface Customer {
  id: string;
  name: string;
  country: string;
  productIds: string[];
  annualUnits: number;
  contractUntil: string;
}

export interface Certification {
  id: string;
  name: string;
  clause: string;
  productIds: string[];
  /** Re-approval is triggered only if one of these parts changes. */
  criticalPartIds: string[];
  requalWeeks: number;
  requalCostEur: number;
}

/** A supplier Product Change Notification / End-of-Life notice. */
export interface Pcn {
  id: string;
  supplierId: string;
  receivedAt: string;
  language: string;
  type: "eol" | "change";
  partIds: string[];
  lastBuyDate: string;
  lastShipDate?: string;
  replacementPartId?: string;
  reason: string;
  /** Raw notice text as it arrived, before translation. */
  rawText: string;
}

// ---- engine output ----

export interface AffectedProduct {
  productId: string;
  productName: string;
  qtyPerUnit: number;
  monthlyDemand: number;
  /** Explicit path through the graph, so a human can audit the claim. */
  paths: string[][];
}

export interface ImpactReport {
  partId: string;
  partName: string;
  supplierName: string;
  lastBuyDate: string;
  daysToLastBuy: number;
  affectedAssemblies: string[];
  affectedProducts: AffectedProduct[];
  affectedCustomers: { customerId: string; name: string; annualUnits: number; productIds: string[] }[];
  affectedCertifications: { id: string; name: string; clause: string; requalWeeks: number; requalCostEur: number }[];
  stockQty: number;
  weeklyConsumption: number;
  runwayWeeks: number;
  /** Units to buy before the deadline to cover the service horizon. */
  lastBuyQty: number;
  lastBuyCostEur: number;
  revenueAtRiskEur: number;
  criticality: number;
  verdict: "critical" | "high" | "watch";
}
