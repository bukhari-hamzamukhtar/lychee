"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/store";
import { Wordmark } from "./Logo";
import { impactOf } from "@/lib/graph";

const TABS = [
  { href: "/notices", label: "Notices" },
  { href: "/parts", label: "Parts" },
  { href: "/products", label: "Products" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/certifications", label: "Certifications" },
  { href: "/approvals", label: "Approvals" },
] as const;

const ASOF = new Date("2026-10-14T00:00:00Z");

export function Nav() {
  const pathname = usePathname();
  const { notices, approvals, hydrated } = useWorkspace();
  const [scrolled, setScrolled] = useState(false);
  const onLanding = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The nearest deadline across the whole workspace, so the header always
  // carries the one number that decides what to do next.
  const soonest = hydrated
    ? notices
        .flatMap((p) => p.partIds.map((id) => impactOf(id, p.lastBuyDate, ASOF)))
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => r.daysToLastBuy)
        .sort((a, b) => a - b)[0]
    : undefined;

  const count = (href: string) =>
    href === "/notices" ? notices.length : href === "/approvals" ? approvals.length : null;

  return (
    <header
      className={`sticky top-0 z-40 bg-bg/90 backdrop-blur transition-[border-color] duration-300 ${
        scrolled || !onLanding ? "border-b border-line" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-stretch px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center pr-7 text-fg transition-opacity hover:opacity-70"
        >
          <Wordmark />
        </Link>

        <div className="hidden w-px bg-line lg:block" />

        <nav className="hidden flex-1 items-stretch lg:flex">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            const n = hydrated ? count(t.href) : null;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`group relative flex items-center gap-1.5 px-5 text-[13.5px] transition-colors duration-200 ${
                  active ? "text-fg" : "text-dim hover:text-fg"
                }`}
              >
                {t.label}
                {n !== null && n > 0 && (
                  <span className="text-[11px] tabular-nums text-dim">{n}</span>
                )}
                <span
                  className={`absolute inset-x-0 bottom-0 h-[2px] origin-left bg-accent transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Compact nav for narrow screens. */}
        <nav className="flex flex-1 items-center gap-4 overflow-x-auto lg:hidden">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`whitespace-nowrap py-5 text-[13px] ${active ? "text-fg" : "text-dim"}`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden w-px bg-line lg:block" />

        <div className="hidden shrink-0 items-center gap-2.5 pl-6 lg:flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              soonest !== undefined && soonest < 60 ? "animate-pulse-soft bg-accent" : "bg-ok"
            }`}
          />
          <span className="text-[12.5px] text-dim">
            {soonest !== undefined ? (
              <>
                next deadline <span className="tabular-nums text-fg">{soonest}d</span>
              </>
            ) : (
              "all clear"
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
