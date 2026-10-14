"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/store";

const TABS = [
  { href: "/notices", label: "Notices" },
  { href: "/parts", label: "Parts" },
  { href: "/approvals", label: "Approvals" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const { notices, approvals, hydrated } = useWorkspace();
  const [scrolled, setScrolled] = useState(false);
  const onLanding = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const count = (href: string) =>
    href === "/notices" ? notices.length : href === "/approvals" ? approvals.length : null;

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled || !onLanding ? "border-b border-line bg-bg/90 backdrop-blur" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-10 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 py-5">
          <span className="h-2 w-2 bg-accent" />
          <span className="text-[14px] font-semibold tracking-tight">LastBuy</span>
        </Link>

        <nav className="flex items-center gap-7">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            const n = hydrated ? count(t.href) : null;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`group relative py-5 text-[13px] transition-colors duration-200 ${
                  active ? "text-fg" : "text-dim hover:text-fg"
                }`}
              >
                {t.label}
                {n !== null && n > 0 && (
                  <span className="ml-1.5 align-super text-[10px] tabular-nums text-dim">{n}</span>
                )}
                <span
                  className={`absolute inset-x-0 bottom-0 h-px origin-left bg-accent transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <span className="ml-auto hidden py-5 text-[11px] text-dim sm:block">synthetic data</span>
      </div>
    </header>
  );
}
