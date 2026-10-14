"use client";

import Link from "next/link";

/**
 * Visual language.
 *
 * Type and rule, not boxes. Nothing is a filled, tinted, glowing chip — colour
 * carries meaning only on the glyph itself, and a hairline or a dot does the
 * work a background tint would otherwise do. One accent, used rarely.
 */

export function Panel({
  children,
  className = "",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`border border-line ${
        interactive ? "transition-colors duration-200 hover:border-line-bright" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">{children}</p>
  );
}

export function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-dim">{children}</h2>
      {aside}
    </div>
  );
}

type Tone = "crit" | "warn" | "ok" | "accent" | "none";

const DOT: Record<Exclude<Tone, "none">, string> = {
  crit: "bg-crit",
  warn: "bg-warn",
  ok: "bg-ok",
  accent: "bg-accent",
};
const TEXT: Record<Tone, string> = {
  crit: "text-crit",
  warn: "text-warn",
  ok: "text-ok",
  accent: "text-accent",
  none: "text-dim",
};

/** A dot and a word. No pill, no fill. */
export function Tag({ tone = "none", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider ${TEXT[tone]}`}>
      {tone !== "none" && <span className={`h-1 w-1 rounded-full ${DOT[tone]}`} />}
      {children}
    </span>
  );
}

/** Outline only, for things that are categories rather than states. */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center border border-line px-1.5 py-[1px] text-[10px] uppercase tracking-wider text-dim">
      {children}
    </span>
  );
}

export function verdictTone(v: "critical" | "high" | "watch"): Tone {
  return v === "critical" ? "crit" : v === "high" ? "warn" : "none";
}

export function Figure({
  label,
  value,
  sub,
  tone = "none",
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  size?: "md" | "lg";
}) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">{label}</div>
      <div
        className={`mt-1.5 font-semibold tabular-nums leading-none ${
          size === "lg" ? "text-[40px]" : "text-[26px]"
        } ${tone === "none" ? "text-fg" : TEXT[tone]}`}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-dim">{sub}</div>}
    </div>
  );
}

/**
 * Page header for the working screens.
 *
 * ChatGPT puts a single 24px line of weight 400 above its input and nothing
 * else — no heading hierarchy, no paragraph explaining the product to someone
 * already inside it. These screens follow that: a name, an optional one-line
 * orientation, and actions. Everything that explains the product lives on the
 * landing page, where someone is still deciding.
 */
export function PageHead({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-b border-line pb-5">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
        <h1 className="text-[24px] font-normal tracking-tight">{title}</h1>
        {meta && <span className="text-[14px] text-dim">{meta}</span>}
      </div>
      {actions}
    </div>
  );
}

/** A row of figures under a page head. Numbers, not cards. */
export function FigureRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-12 flex flex-wrap gap-x-16 gap-y-7 border-b border-line pb-8">{children}</div>
  );
}

export function Button({
  children,
  onClick,
  href,
  disabled,
  tone = "default",
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  tone?: "default" | "accent" | "ok" | "quiet";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    default: "border-line-bright text-fg hover:bg-fg hover:text-bg",
    accent: "border-accent text-accent hover:bg-accent hover:text-bg",
    ok: "border-ok/60 text-ok hover:bg-ok hover:text-bg",
    quiet: "border-line text-dim hover:border-line-bright hover:text-fg",
  }[tone];

  const cls = `inline-flex items-center gap-2 border px-5 py-2.5 text-[13px] font-medium uppercase tracking-wider transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-30 ${styles} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border border-line px-6 py-16 text-center">
      <p className="text-[15px] text-fg">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-dim">{body}</p>
      {action && (
        <div className="mt-6">
          <Button href={action.href}>{action.label}</Button>
        </div>
      )}
    </div>
  );
}

export function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-px">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton h-16" />
      ))}
    </div>
  );
}

/** A bare horizontal meter. Line, not a filled bar in a rounded track. */
export function Meter({ value, tone = "none" }: { value: number; tone?: Tone }) {
  const bar = tone === "none" ? "bg-dim" : DOT[tone];
  return (
    <div className="h-px w-full bg-line">
      <div
        className={`h-px origin-left animate-grow ${bar}`}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export const eur = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
export const num = (n: number) => new Intl.NumberFormat("en-GB").format(n);
