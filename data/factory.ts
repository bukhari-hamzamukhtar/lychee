/**
 * Synthetic but structurally realistic data for a mid-size Italian drives
 * manufacturer. Three BOM levels: product -> board -> module -> component.
 * Part numbers follow real manufacturer conventions so the demo reads true.
 */
import type { Supplier, BomNode, BomEdge, Customer, Certification, Pcn } from "@/lib/types";

export const SUPPLIERS: Supplier[] = [
  { id: "ADI", name: "Analog Devices", country: "US", eolRate: 0.11 },
  { id: "TI", name: "Texas Instruments", country: "US", eolRate: 0.07 },
  { id: "STM", name: "STMicroelectronics", country: "IT/FR", eolRate: 0.06 },
  { id: "MUR", name: "Murata", country: "JP", eolRate: 0.04 },
  { id: "VIS", name: "Vishay", country: "US", eolRate: 0.05 },
  { id: "INF", name: "Infineon", country: "DE", eolRate: 0.09 },
  { id: "TDK", name: "TDK-Lambda", country: "JP", eolRate: 0.08 },
];

export const NODES: BomNode[] = [
  // ---- products (graph roots) ----
  { id: "MD-3000", kind: "product", name: "Motor Drive 3 kW", monthlyDemand: 450 },
  { id: "MD-7500", kind: "product", name: "Motor Drive 7.5 kW", monthlyDemand: 180 },
  { id: "PSU-240", kind: "product", name: "Industrial PSU 240 W", monthlyDemand: 1200 },
  { id: "SRV-100", kind: "product", name: "Servo Controller", monthlyDemand: 95 },
  { id: "HMI-7", kind: "product", name: "Operator Panel 7 inch", monthlyDemand: 320 },

  // ---- assemblies ----
  { id: "ASM-PWR-A", kind: "assembly", name: "Power board rev A" },
  { id: "ASM-CTRL-B", kind: "assembly", name: "Control board rev B" },
  { id: "ASM-IO-C", kind: "assembly", name: "I/O board rev C" },
  { id: "ASM-GATE-D", kind: "assembly", name: "Gate driver module rev D" },
  { id: "ASM-FILT-E", kind: "assembly", name: "EMC input filter" },

  // ---- components ----
  { id: "ADUM1201ARZ", kind: "part", name: "Digital isolator, dual channel", supplierId: "ADI", unitCostEur: 2.84, leadTimeWeeks: 26, stockQty: 14200, lifecycle: "active", altSources: 0 },
  { id: "TPS54560DDAR", kind: "part", name: "Buck converter 5 A", supplierId: "TI", unitCostEur: 1.92, leadTimeWeeks: 18, stockQty: 9100, lifecycle: "active", altSources: 2 },
  { id: "IKW40N120H3", kind: "part", name: "IGBT 1200 V 40 A", supplierId: "INF", unitCostEur: 7.4, leadTimeWeeks: 32, stockQty: 3850, lifecycle: "nrnd", altSources: 1 },
  { id: "STM32F407VGT6", kind: "part", name: "MCU Cortex-M4 168 MHz", supplierId: "STM", unitCostEur: 9.15, leadTimeWeeks: 24, stockQty: 2600, lifecycle: "active", altSources: 1 },
  { id: "STGW40H65DFB", kind: "part", name: "IGBT 650 V 40 A", supplierId: "STM", unitCostEur: 4.1, leadTimeWeeks: 22, stockQty: 6400, lifecycle: "active", altSources: 2 },
  { id: "SN65HVD1782D", kind: "part", name: "RS-485 transceiver", supplierId: "TI", unitCostEur: 1.55, leadTimeWeeks: 16, stockQty: 18400, lifecycle: "active", altSources: 3 },
  { id: "OPA2188AIDR", kind: "part", name: "Zero-drift op-amp, dual", supplierId: "TI", unitCostEur: 2.21, leadTimeWeeks: 20, stockQty: 11200, lifecycle: "active", altSources: 2 },
  { id: "GRM188R71H104KA93D", kind: "part", name: "MLCC 100 nF 50 V X7R", supplierId: "MUR", unitCostEur: 0.018, leadTimeWeeks: 12, stockQty: 940000, lifecycle: "active", altSources: 6 },
  { id: "CRCW0805100RFKEA", kind: "part", name: "Resistor 100R 0.125 W 1%", supplierId: "VIS", unitCostEur: 0.009, leadTimeWeeks: 8, stockQty: 1250000, lifecycle: "active", altSources: 8 },
  { id: "B32774D8106K000", kind: "part", name: "Film capacitor 10 uF 500 V", supplierId: "TDK", unitCostEur: 3.65, leadTimeWeeks: 28, stockQty: 4100, lifecycle: "active", altSources: 1 },
  { id: "ACS712ELCTR-20A", kind: "part", name: "Hall current sensor 20 A", supplierId: "ADI", unitCostEur: 3.08, leadTimeWeeks: 24, stockQty: 7700, lifecycle: "nrnd", altSources: 1 },
  { id: "LM2904DR", kind: "part", name: "Op-amp, dual, general purpose", supplierId: "TI", unitCostEur: 0.21, leadTimeWeeks: 10, stockQty: 86000, lifecycle: "active", altSources: 5 },
  { id: "TLP2361", kind: "part", name: "Optocoupler, logic output", supplierId: "TDK", unitCostEur: 1.12, leadTimeWeeks: 20, stockQty: 22500, lifecycle: "active", altSources: 3 },
  { id: "MKP1848C61050JY5", kind: "part", name: "DC-link capacitor 100 uF", supplierId: "VIS", unitCostEur: 11.9, leadTimeWeeks: 30, stockQty: 1900, lifecycle: "active", altSources: 1 },
  { id: "NTC-B57861S", kind: "part", name: "NTC thermistor 10 k", supplierId: "TDK", unitCostEur: 0.42, leadTimeWeeks: 14, stockQty: 48000, lifecycle: "active", altSources: 4 },
  { id: "LCD-TX18D42", kind: "part", name: "TFT panel 7 inch 800x480", supplierId: "MUR", unitCostEur: 28.5, leadTimeWeeks: 20, stockQty: 1400, lifecycle: "active", altSources: 1 },
];

/** parent consumes qtyPer of child. */
export const EDGES: BomEdge[] = [
  // products -> boards
  { parent: "MD-3000", child: "ASM-PWR-A", qtyPer: 1 },
  { parent: "MD-3000", child: "ASM-CTRL-B", qtyPer: 1 },
  { parent: "MD-3000", child: "ASM-FILT-E", qtyPer: 1 },
  { parent: "MD-7500", child: "ASM-PWR-A", qtyPer: 2 },
  { parent: "MD-7500", child: "ASM-CTRL-B", qtyPer: 1 },
  { parent: "MD-7500", child: "ASM-IO-C", qtyPer: 1 },
  { parent: "MD-7500", child: "ASM-FILT-E", qtyPer: 1 },
  { parent: "PSU-240", child: "ASM-PWR-A", qtyPer: 1 },
  { parent: "SRV-100", child: "ASM-CTRL-B", qtyPer: 1 },
  { parent: "SRV-100", child: "ASM-IO-C", qtyPer: 2 },
  { parent: "HMI-7", child: "ASM-CTRL-B", qtyPer: 1 },
  { parent: "HMI-7", child: "LCD-TX18D42", qtyPer: 1 },

  // power board -> gate module + components
  { parent: "ASM-PWR-A", child: "ASM-GATE-D", qtyPer: 3 },
  { parent: "ASM-PWR-A", child: "IKW40N120H3", qtyPer: 6 },
  { parent: "ASM-PWR-A", child: "MKP1848C61050JY5", qtyPer: 2 },
  { parent: "ASM-PWR-A", child: "TPS54560DDAR", qtyPer: 2 },
  { parent: "ASM-PWR-A", child: "NTC-B57861S", qtyPer: 3 },
  { parent: "ASM-PWR-A", child: "GRM188R71H104KA93D", qtyPer: 64 },
  { parent: "ASM-PWR-A", child: "CRCW0805100RFKEA", qtyPer: 88 },

  // gate driver module -> components (the deep level)
  { parent: "ASM-GATE-D", child: "ADUM1201ARZ", qtyPer: 2 },
  { parent: "ASM-GATE-D", child: "TLP2361", qtyPer: 2 },
  { parent: "ASM-GATE-D", child: "GRM188R71H104KA93D", qtyPer: 12 },
  { parent: "ASM-GATE-D", child: "CRCW0805100RFKEA", qtyPer: 14 },

  // control board
  { parent: "ASM-CTRL-B", child: "STM32F407VGT6", qtyPer: 1 },
  { parent: "ASM-CTRL-B", child: "SN65HVD1782D", qtyPer: 2 },
  { parent: "ASM-CTRL-B", child: "OPA2188AIDR", qtyPer: 4 },
  { parent: "ASM-CTRL-B", child: "ADUM1201ARZ", qtyPer: 1 },
  { parent: "ASM-CTRL-B", child: "GRM188R71H104KA93D", qtyPer: 48 },

  // I/O board
  { parent: "ASM-IO-C", child: "SN65HVD1782D", qtyPer: 1 },
  { parent: "ASM-IO-C", child: "LM2904DR", qtyPer: 6 },
  { parent: "ASM-IO-C", child: "ACS712ELCTR-20A", qtyPer: 4 },
  { parent: "ASM-IO-C", child: "CRCW0805100RFKEA", qtyPer: 52 },

  // EMC filter
  { parent: "ASM-FILT-E", child: "B32774D8106K000", qtyPer: 2 },
  { parent: "ASM-FILT-E", child: "STGW40H65DFB", qtyPer: 2 },
];

export const CUSTOMERS: Customer[] = [
  { id: "C-ACM", name: "Acimall Packaging SpA", country: "IT", productIds: ["MD-3000", "MD-7500"], annualUnits: 2400, contractUntil: "2028-06-30" },
  { id: "C-BRE", name: "Brevini Fluid Power", country: "IT", productIds: ["MD-7500", "SRV-100"], annualUnits: 860, contractUntil: "2027-12-31" },
  { id: "C-SCH", name: "Schmidt Foerdertechnik GmbH", country: "DE", productIds: ["MD-3000", "PSU-240"], annualUnits: 5100, contractUntil: "2027-09-30" },
  { id: "C-TEC", name: "Tecnomatic Srl", country: "IT", productIds: ["PSU-240"], annualUnits: 7200, contractUntil: "2029-03-31" },
  { id: "C-VAL", name: "Valmet Automation", country: "FI", productIds: ["SRV-100", "HMI-7"], annualUnits: 1150, contractUntil: "2027-06-30" },
  { id: "C-OMR", name: "Omron Europe BV", country: "NL", productIds: ["HMI-7"], annualUnits: 2800, contractUntil: "2028-01-31" },
];

export const CERTIFICATIONS: Certification[] = [
  {
    id: "EN61800-3",
    name: "EN 61800-3 EMC for adjustable speed drives",
    clause: "6.3.2 - galvanic isolation barrier components",
    productIds: ["MD-3000", "MD-7500"],
    criticalPartIds: ["ADUM1201ARZ", "TLP2361", "B32774D8106K000"],
    requalWeeks: 14,
    requalCostEur: 38000,
  },
  {
    id: "UL61800-5-1",
    name: "UL 61800-5-1 electrical safety",
    clause: "4.4 - reinforced insulation components",
    productIds: ["MD-3000", "MD-7500", "PSU-240"],
    criticalPartIds: ["ADUM1201ARZ", "MKP1848C61050JY5"],
    requalWeeks: 20,
    requalCostEur: 52000,
  },
  {
    id: "IEC61508",
    name: "IEC 61508 SIL-2 functional safety",
    clause: "7.4.4 - safety-related sensing elements",
    productIds: ["SRV-100"],
    criticalPartIds: ["ACS712ELCTR-20A", "STM32F407VGT6"],
    requalWeeks: 26,
    requalCostEur: 74000,
  },
];

/** Incoming notices for the demo. Deliberately not all in English. */
export const PCN_INBOX: Pcn[] = [
  {
    id: "PCN-ADI-2026-4471",
    supplierId: "ADI",
    receivedAt: "2026-10-14",
    language: "de",
    type: "eol",
    partIds: ["ADUM1201ARZ"],
    lastBuyDate: "2026-11-17",
    lastShipDate: "2027-02-28",
    reason: "Wafer-Fab Umstellung, 180 nm Prozess wird eingestellt.",
    rawText: [
      "PRODUKT-ABKUENDIGUNG (PDN 26_4471)",
      "",
      "Sehr geehrter Kunde,",
      "",
      "wir informieren Sie, dass das Bauteil ADUM1201ARZ (Dual-Channel Digital-Isolator)",
      "aufgrund der Umstellung unserer Wafer-Fab abgekuendigt wird. Der 180-nm-Prozess",
      "wird zum Jahresende eingestellt.",
      "",
      "Letzter Bestelltermin (Last Time Buy): 17. November 2026",
      "Letzter Liefertermin: 28. Februar 2027",
      "",
      "Ein direkter Ersatz ist derzeit nicht verfuegbar. Wir empfehlen eine",
      "Bedarfsdeckung bis zum Ende der Produktlebensdauer.",
      "",
      "Mit freundlichen Gruessen",
      "Analog Devices Produktmanagement",
    ].join("\n"),
  },
  {
    id: "PCN-TDK-2026-0912",
    supplierId: "TDK",
    receivedAt: "2026-10-11",
    language: "ja",
    type: "eol",
    partIds: ["TLP2361"],
    lastBuyDate: "2027-03-31",
    reason: "End of production notice.",
    rawText: [
      "製品生産終了のご案内",
      "",
      "平素は格別のご高配を賜り厚く御礼申し上げます。",
      "",
      "標記の件、TLP2361 につきまして生産終了とさせていただきます。",
      "最終発注期限: 2027年3月31日",
      "代替品: TLP2368 をご検討ください。",
    ].join("\n"),
  },
  {
    id: "PCN-INF-2026-7733",
    supplierId: "INF",
    receivedAt: "2026-10-09",
    language: "en",
    type: "change",
    partIds: ["IKW40N120H3"],
    lastBuyDate: "2027-06-30",
    replacementPartId: "IKW40N120H5",
    reason: "Package supplier change, H3 to H5 revision.",
    rawText: [
      "PRODUCT CHANGE NOTIFICATION PCN 26_7733",
      "",
      "The IKW40N120H3 will transition to the H5 revision. The change affects the",
      "moulding compound supplier. Electrical parameters are unchanged.",
      "Last time buy for H3: 30 June 2027. Qualification data available on request.",
    ].join("\n"),
  },
];
