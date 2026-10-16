"use client";

import { useEffect, useRef, useState } from "react";
import { VigilAvatar } from "./VigilAvatar";

/**
 * Vigil standing watch, for the half of a section that would otherwise be empty.
 *
 * The cost argument is a sentence and a number, and a sentence and a number do
 * not fill a screen. Rather than stretch the type to cover the gap, the figure
 * does what the paragraph is describing: notices arrive, each one is read, and
 * the light stays on.
 *
 * Drawn in the same stroke language as the mark — hairlines, no fills, nothing
 * that glows. The motion is slow and finite on purpose; a loop that never
 * settles is a distraction, and this sits beside something a person is reading.
 */

const ARRIVALS = [
  { label: "PCN-ADI-2026-4471", cost: "$0.00012" },
  { label: "PCN-TDK-2026-0912", cost: "$0.00011" },
  { label: "PCN-INF-2026-7733", cost: "$0.00013" },
  { label: "PCN-STM-2026-1180", cost: "$0.00012" },
] as const;

export function VigilWatch() {
  const [seen, setSeen] = useState(0);
  const host = useRef<HTMLDivElement>(null);

  // Starts when it is actually looked at, and stops once every notice has
  // landed. Nothing moves while the section is off screen.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let timers: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      timers.forEach(clearTimeout);
      timers = ARRIVALS.map((_, i) => setTimeout(() => setSeen(i + 1), 500 + i * 900));
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div ref={host} className="flex items-center justify-center py-6">
      <div className="w-full max-w-[380px]">
        <div className="flex items-end gap-5">
          <VigilAvatar size={84} thinking={seen > 0 && seen < ARRIVALS.length} />
          <div className="flex-1 pb-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-dim">On watch</p>
            <p className="mt-1.5 text-[13.5px] leading-snug text-mid">
              Every notice is read. None are triaged out.
            </p>
          </div>
        </div>

        <ul className="mt-7 space-y-px border-t border-line pt-5">
          {ARRIVALS.map((a, i) => {
            const done = i < seen;
            return (
              <li
                key={a.label}
                className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0 transition-opacity duration-700"
                style={{ opacity: done ? 1 : 0.18 }}
              >
                <span className="flex items-baseline gap-2.5 min-w-0">
                  <span
                    className={`h-1 w-1 shrink-0 translate-y-[-2px] rounded-full ${
                      done ? "bg-accent" : "bg-line-bright"
                    }`}
                  />
                  <span className="truncate font-mono text-[12px] text-mid">{a.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-[12px] text-dim">
                  {done ? a.cost : "—"}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-[12px] leading-relaxed text-dim">
          Four notices, read end to end, for less than a twentieth of a cent.
        </p>
      </div>
    </div>
  );
}
