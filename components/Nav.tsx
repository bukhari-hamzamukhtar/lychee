"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { Wordmark } from "./Logo";

/**
 * Fixed 64px bar with a permanent bottom rule.
 *
 * Google runs 64px and ChatGPT 52px, both with a hard edge. The previous
 * version went transparent over the landing hero, which is what made it melt
 * into the browser chrome — there was nothing separating the page from the
 * address bar. It is now always a distinct band.
 */

const TABS = [
  { href: "/notices", label: "Notices" },
  { href: "/parts", label: "Parts" },
  { href: "/products", label: "Products" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/certifications", label: "Certifications" },
  { href: "/approvals", label: "Approvals" },
  { href: "/import", label: "Bill of materials" },
  { href: "/ask", label: "Ask" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const { notices, approvals, hydrated, upload, account, signedIn, signOut } = useWorkspace();

  const count = (href: string) =>
    href === "/notices" ? notices.length : href === "/approvals" ? approvals.length : null;

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-line bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center px-8">
        <Link href="/" className="shrink-0 transition-opacity hover:opacity-70">
          <Wordmark />
        </Link>

        <nav className="ml-10 hidden items-center gap-7 xl:flex">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            const n = hydrated ? count(t.href) : null;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`group relative flex h-16 shrink-0 items-center gap-1.5 whitespace-nowrap text-[15px] transition-colors duration-200 ${
                  active ? "text-fg" : "text-dim hover:text-fg"
                }`}
              >
                {t.label}
                {n !== null && n > 0 && (
                  <span className="text-[12px] tabular-nums text-dim">{n}</span>
                )}
                <span
                  className={`absolute inset-x-0 -bottom-px h-[2px] origin-left bg-accent transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <nav className="ml-8 flex items-center gap-6 overflow-x-auto xl:hidden">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap text-[14px] ${
                pathname.startsWith(t.href) ? "text-fg" : "text-dim"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2.5 pl-6 lg:flex">
          {/* Only ever says something when something is actually happening.
              A standing countdown here was announcing a deadline to people who
              had not uploaded anything, which reads as the app inventing work
              for them rather than reporting theirs. */}
          {upload.status === "running" ? (
            <UploadTicker since={upload.startedAt} what={upload.current} />
          ) : upload.status === "done" && upload.pcnId ? (
            <Link
              href={`/notices/${upload.pcnId}`}
              className="flex items-center gap-2.5 text-[14px] text-dim transition-colors hover:text-fg"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              document read
            </Link>
          ) : hydrated && signedIn ? (
            <div className="flex items-center gap-3.5">
              <span className="text-[13.5px] text-dim">{account?.name}</span>
              <button
                onClick={signOut}
                className="text-[13.5px] text-dim transition-colors hover:text-fg"
              >
                Sign out
              </button>
            </div>
          ) : hydrated ? (
            <Link
              href="/sign-in"
              className="text-[13.5px] text-dim transition-colors hover:text-fg"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/** Live elapsed time for an upload running somewhere else in the app. */
function UploadTicker({ since, what }: { since: number; what: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <Link href="/notices" className="flex items-center gap-2.5 text-[14px] transition-opacity hover:opacity-70">
      <span className="h-3 w-3 animate-spin rounded-full border border-line border-t-accent" />
      <span className="text-dim">
        {what ?? "reading"}{" "}
        <span className="tabular-nums text-fg">{((now - since) / 1000).toFixed(0)}s</span>
      </span>
    </Link>
  );
}
