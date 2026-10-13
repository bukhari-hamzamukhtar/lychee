"use client";

import type { Pcn } from "@/lib/types";

const FLAG: Record<string, string> = { de: "DE", ja: "JA", en: "EN", it: "IT", zh: "ZH" };

export function PcnInbox({
  items,
  selectedId,
  onSelect,
}: {
  items: Pcn[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-edge rounded-lg border border-edge">
      {items.map((p) => (
        <li key={p.id}>
          <button
            onClick={() => onSelect(p.id)}
            className={`w-full px-3 py-3 text-left transition hover:bg-white/5 ${
              p.id === selectedId ? "bg-white/5" : ""
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs">{p.id}</span>
              <span className="shrink-0 rounded border border-edge px-1.5 text-[10px] text-white/40">
                {FLAG[p.language] ?? p.language.toUpperCase()}
              </span>
            </span>
            <span className="mt-1 block text-xs text-white/40">
              {p.partIds.join(", ")}
            </span>
            <span className="mt-0.5 block text-[11px] text-white/30">
              {p.type === "eol" ? "end of life" : "change"} &middot; last buy {p.lastBuyDate}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
