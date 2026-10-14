"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/store";

const TABS = [
  { href: "/", label: "Notices", hint: "incoming supplier changes" },
  { href: "/parts", label: "Parts", hint: "the bill of materials" },
  { href: "/approvals", label: "Approvals", hint: "orders awaiting a person" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const { notices, approvals, hydrated } = useWorkspace();

  const count = (href: string) =>
    href === "/" ? notices.length : href === "/approvals" ? approvals.length : null;

  return (
    <header className="sticky top-0 z-30 border-b border-hair bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 py-4">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-[13px] font-bold text-white">
            L
          </span>
          <span className="text-[15px] font-semibold tracking-tight">LastBuy</span>
        </Link>

        <nav className="flex items-end gap-1">
          {TABS.map((t) => {
            const active = pathname === t.href;
            const n = hydrated ? count(t.href) : null;
            return (
              <Link
                key={t.href}
                href={t.href}
                title={t.hint}
                className={`relative px-3.5 pb-3.5 pt-4 text-sm transition-colors ${
                  active ? "text-body" : "text-muted hover:text-body"
                }`}
              >
                <span className="flex items-center gap-2">
                  {t.label}
                  {n !== null && n > 0 && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums transition-colors ${
                        active ? "bg-primary/20 text-primary-soft" : "bg-panel text-faint"
                      }`}
                    >
                      {n}
                    </span>
                  )}
                </span>
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 origin-left animate-grow rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3 py-4">
          <span className="hidden text-[11px] text-faint sm:block">
            synthetic data &middot; demo workspace
          </span>
        </div>
      </div>
    </header>
  );
}
