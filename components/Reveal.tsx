"use client";

import { useEffect, useRef } from "react";

/**
 * Releases its children when they scroll into view, so the page tells its
 * story as you move through it instead of arriving all at once.
 *
 * Unobserves after firing: a section that has been read should not fade out and
 * back in when you scroll up again.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: 0 | 1 | 2 | 3 | 4;
  className?: string;
  as?: "div" | "section" | "li" | "p";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cls = `reveal ${delay ? `reveal-${delay}` : ""} ${className}`;
  // @ts-expect-error -- polymorphic tag with a shared ref type
  return <Tag ref={ref} className={cls}>{children}</Tag>;
}
