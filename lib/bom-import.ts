"use client";

/**
 * Importing someone else's bill of materials.
 *
 * No two companies export a BOM the same way. One calls it "MPN", the next
 * "Manufacturer Part Number", the next just "Part". Quantity is "Qty", "QTY per
 * assy" or "Amount". Demanding a fixed template would make this unusable for
 * everyone who is not already set up for it — which is the same reason the
 * notice reader does not demand a fixed PDF layout.
 *
 * So columns are inferred from their headers, the guess is shown to the person,
 * and they can correct any of it before anything is loaded.
 */
import type { BomNode, BomEdge, Supplier, Customer, Certification } from "./types";
import type { Dataset } from "./graph";

export type Field =
  | "partNumber"
  | "description"
  | "quantity"
  | "parent"
  | "manufacturer"
  | "unitCost"
  | "stock"
  | "leadTime"
  | "altSources";

/** Header spellings seen in real exports, lowercased and stripped of punctuation. */
const SYNONYMS: Record<Field, string[]> = {
  partNumber: ["partnumber", "mpn", "manufacturerpartnumber", "partno", "pn", "part", "component", "componentpartnumber", "itemnumber", "item", "sku", "cpn"],
  description: ["description", "desc", "name", "componentname", "value", "comment", "partdescription", "title"],
  quantity: ["qty", "quantity", "qnty", "amount", "qtyper", "qtyperassembly", "qtyperassy", "count", "usage"],
  parent: ["parent", "parentassembly", "assembly", "subassembly", "usedin", "parentpart", "nextassembly", "level", "parentitem"],
  manufacturer: ["manufacturer", "mfr", "mfg", "supplier", "vendor", "brand", "make", "mfrname", "suppliername"],
  unitCost: ["unitcost", "cost", "price", "unitprice", "costeach", "priceeach", "unitpriceeur", "unitpriceusd"],
  stock: ["stock", "onhand", "qtyonhand", "inventory", "stockonhand", "available", "instock"],
  leadTime: ["leadtime", "lead", "leadtimeweeks", "leadweeks", "leadtimedays"],
  altSources: ["altsources", "alternatives", "alternates", "secondsource", "approvedalternates", "altcount"],
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** Minimal RFC-4180 reader: quoted fields, escaped quotes, CRLF or LF. */
export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === "," || c === ";" || c === "\t") {
      row.push(cell.trim());
      cell = "";
    } else if (c === "\n") {
      row.push(cell.trim());
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  row.push(cell.trim());
  if (row.some((v) => v !== "")) rows.push(row);

  const headers = rows.shift() ?? [];
  return { headers, rows };
}

/** Best-guess column index per field, by header spelling. */
export function inferColumns(headers: string[]): Partial<Record<Field, number>> {
  const normed = headers.map(norm);
  const out: Partial<Record<Field, number>> = {};
  const taken = new Set<number>();

  // Exact matches first, so "part" cannot steal the column "partnumber" wanted.
  for (const pass of [0, 1]) {
    for (const field of Object.keys(SYNONYMS) as Field[]) {
      if (out[field] !== undefined) continue;
      for (const syn of SYNONYMS[field]) {
        const i = normed.findIndex(
          (h, idx) => !taken.has(idx) && (pass === 0 ? h === syn : h.includes(syn)),
        );
        if (i >= 0) {
          out[field] = i;
          taken.add(i);
          break;
        }
      }
    }
  }
  return out;
}

const numberFrom = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const n = Number(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

export interface ImportResult {
  dataset: Dataset;
  stats: {
    rows: number;
    parts: number;
    assemblies: number;
    products: number;
    edges: number;
    suppliers: number;
    skipped: number;
  };
  warnings: string[];
}

/**
 * Turn mapped rows into a dataset the engine can run on.
 *
 * A flat BOM — no parent column — is one product built from every listed part,
 * which is what a single-board export means. With a parent column the hierarchy
 * is honoured, and anything never named as a child becomes a product.
 */
export function buildDataset(
  parsed: ParsedCsv,
  cols: Partial<Record<Field, number>>,
  productName: string,
): ImportResult {
  const warnings: string[] = [];
  const at = (row: string[], f: Field) =>
    cols[f] !== undefined ? (row[cols[f]!] ?? "").trim() : "";

  if (cols.partNumber === undefined) {
    throw new Error("No part-number column was identified. Pick one before importing.");
  }

  const nodes = new Map<string, BomNode>();
  const edges: BomEdge[] = [];
  const suppliers = new Map<string, Supplier>();
  const childIds = new Set<string>();
  let skipped = 0;

  const ROOT = "ASSEMBLY";
  const flat = cols.parent === undefined;

  for (const row of parsed.rows) {
    const id = at(row, "partNumber");
    if (!id) {
      skipped++;
      continue;
    }

    const mfr = at(row, "manufacturer");
    const supplierId = mfr ? mfr.slice(0, 24) : "UNKNOWN";
    if (!suppliers.has(supplierId)) {
      suppliers.set(supplierId, {
        id: supplierId,
        name: mfr || "Unknown supplier",
        country: "",
        // No history for an imported supplier; a neutral rate, not a flattering one.
        eolRate: 0.06,
      });
    }

    const existing = nodes.get(id);
    const leadRaw = numberFrom(at(row, "leadTime"));
    nodes.set(id, {
      id,
      kind: "part",
      name: at(row, "description") || existing?.name || id,
      supplierId,
      unitCostEur: numberFrom(at(row, "unitCost")) ?? existing?.unitCostEur,
      leadTimeWeeks: leadRaw ?? existing?.leadTimeWeeks,
      stockQty: numberFrom(at(row, "stock")) ?? existing?.stockQty,
      lifecycle: "active",
      altSources: numberFrom(at(row, "altSources")) ?? existing?.altSources,
    });

    const parent = flat ? ROOT : at(row, "parent") || ROOT;
    const qty = numberFrom(at(row, "quantity")) ?? 1;
    edges.push({ parent, child: id, qtyPer: qty });
    childIds.add(id);
  }

  // Anything that is a parent but never a child is a finished product.
  for (const e of edges) {
    if (!nodes.has(e.parent)) {
      nodes.set(e.parent, {
        id: e.parent,
        kind: "part",
        name: e.parent === ROOT ? productName : e.parent,
      });
    }
  }
  for (const [id, n] of nodes) {
    if (!childIds.has(id)) {
      n.kind = "product";
      n.monthlyDemand = n.monthlyDemand ?? 100;
    } else if ((edges.some((e) => e.parent === id))) {
      n.kind = "assembly";
    }
  }

  const list = [...nodes.values()];
  const products = list.filter((n) => n.kind === "product");
  const parts = list.filter((n) => n.kind === "part");

  if (products.length === 0) warnings.push("No top-level product was found; the hierarchy may be circular.");
  if (cols.quantity === undefined) warnings.push("No quantity column: every line counted as one per unit.");
  if (cols.stock === undefined) warnings.push("No stock column: runway cannot be computed until stock is supplied.");
  if (cols.leadTime === undefined) warnings.push("No lead-time column: the cover gap cannot be computed.");
  if (cols.unitCost === undefined) warnings.push("No cost column: order values will read as zero.");
  if (skipped) warnings.push(`${skipped} rows had no part number and were skipped.`);

  // An imported BOM carries no customer contracts or certificates of its own.
  const customers: Customer[] = [];
  const certifications: Certification[] = [];

  return {
    dataset: { nodes: list, edges, suppliers: [...suppliers.values()], customers, certifications },
    stats: {
      rows: parsed.rows.length,
      parts: parts.length,
      assemblies: list.filter((n) => n.kind === "assembly").length,
      products: products.length,
      edges: edges.length,
      suppliers: suppliers.size,
      skipped,
    },
    warnings,
  };
}

export const FIELD_LABELS: Record<Field, string> = {
  partNumber: "Part number",
  description: "Description",
  quantity: "Quantity per assembly",
  parent: "Parent assembly",
  manufacturer: "Manufacturer",
  unitCost: "Unit cost",
  stock: "Stock on hand",
  leadTime: "Lead time (weeks)",
  altSources: "Alternative sources",
};

export const REQUIRED_FIELDS: Field[] = ["partNumber"];
