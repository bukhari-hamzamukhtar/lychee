"use client";

import { useMemo, useState } from "react";
import type { ImpactReport } from "@/lib/types";
import { Eyebrow, eur, num } from "./ui";

/**
 * The decision, not the report.
 *
 * A last-time-buy is a bet on how long you must keep supplying the product and
 * how much scrap you expect. Those two assumptions move the cheque by hundreds
 * of thousands of euros, and in a spreadsheet they are buried. Here they are the
 * two things you can actually move, and the consequence recomputes as you drag.
 *
 * The arithmetic is the same the engine uses; only the assumptions change, so
 * nothing here can disagree with the assessment above it.
 */
export function ScenarioControl({ report: r }: { report: ImpactReport }) {
  const [years, setYears] = useState(3);
  const [buffer, setBuffer] = useState(10);

  const unitCost = r.lastBuyQty > 0 ? r.lastBuyCostEur / r.lastBuyQty : 0;

  const scenario = useMemo(() => {
    const weeks = years * 52;
    // Reports saved before the exact figure existed fall back to the rounded one.
    const perWeek = r.weeklyConsumptionExact ?? r.weeklyConsumption;
    const needed = perWeek * weeks * (1 + buffer / 100);
    const qty = Math.max(0, Math.ceil(needed - r.stockQty));
    return { weeks, qty, cost: Math.round(qty * unitCost) };
  }, [years, buffer, r.weeklyConsumptionExact, r.weeklyConsumption, r.stockQty, unitCost]);

  const delta = scenario.cost - r.lastBuyCostEur;
  const isBase = years === 3 && buffer === 10;

  return (
    <div className="border border-line">
      <div className="border-b border-line px-5 py-4">
        <Eyebrow>What are you actually committing to</Eyebrow>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-mid">
          The order size is a bet on two assumptions. Move them and watch the cheque
          change — this is the conversation the procurement lead and the board actually
          have.
        </p>
      </div>

      <div className="grid gap-8 px-5 py-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-7">
          <Slider
            label="Service commitment"
            value={years}
            min={1}
            max={10}
            step={1}
            format={(v) => `${v} ${v === 1 ? "year" : "years"}`}
            hint="How long you keep supplying spares after the last shipment. QP-014 says three."
            onChange={setYears}
          />
          <Slider
            label="Spares buffer"
            value={buffer}
            min={0}
            max={40}
            step={5}
            format={(v) => `${v}%`}
            hint="Cover for scrap, warranty and yield loss on top of forecast demand."
            onChange={setBuffer}
          />
        </div>

        <div className="flex flex-col justify-between gap-6 border-t border-line pt-6 lg:w-72 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
              Order
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none tabular-nums">
              {num(scenario.qty)}
            </div>
            <div className="mt-2 text-[13px] tabular-nums text-mid">{eur(scenario.cost)}</div>
          </div>

          <div>
            {isBase ? (
              <p className="text-[12px] leading-relaxed text-dim">
                The assessment above, at the standing policy.
              </p>
            ) : (
              <p className="text-[12px] leading-relaxed text-dim">
                <span className={delta >= 0 ? "text-crit" : "text-ok"}>
                  {delta >= 0 ? "+" : "−"}
                  {eur(Math.abs(delta))}
                </span>{" "}
                against the standing three-year policy, which orders{" "}
                {num(r.lastBuyQty)}.
              </p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-dim">
              At {r.weeklyConsumption}/week. Buy short and the line stops before the
              product retires; buy long and the money sits on a shelf for{" "}
              {scenario.weeks} weeks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  hint: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] text-mid">{label}</label>
        <span className="text-[13px] tabular-nums">{format(value)}</span>
      </div>

      <div className="relative mt-3 h-4">
        {/* Track and fill are hairlines; the native thumb is hidden and replaced
            by a mark, so this reads as an instrument rather than a toy. */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        <div
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-accent"
          style={{ width: `${pct}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-accent"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-dim">{hint}</p>
    </div>
  );
}
