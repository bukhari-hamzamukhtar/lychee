"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts to a figure once it scrolls into view.
 *
 * Eased rather than linear, so it decelerates into the final value instead of
 * stopping dead, and it runs once — a number that re-animates every time you
 * scroll past reads as decoration rather than data.
 */
export function CountUp({
  to,
  duration = 1400,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(to);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || done.current) return;
          done.current = true;
          io.unobserve(e.target);
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(to * eased);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  const shown = new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}
