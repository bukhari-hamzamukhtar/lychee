"use client";

import Link from "next/link";
import type { Severity } from "@/lib/types";

export function Card({
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
      className={`rounded-xl border border-edge/70 bg-surface ${
        interactive ? "transition-colors hover:border-edge hover:bg-panel/40" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-faint">{children}</h2>
      {aside}
    </div>
  );
}

const TONE = {
  crit: "border-crit/40 bg-crit/10 text-crit",
  warn: "border-warn/40 bg-warn/10 text-warn",
  ok: "border-ok/40 bg-ok/10 text-ok",
  info: "border-primary/40 bg-primary/10 text-primary-soft",
  muted: "border-edge bg-panel/60 text-muted",
} as const;

export type Tone = keyof typeof TONE;

export function Badge({ tone = "muted", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function verdictTone(v: "critical" | "high" | "watch"): Tone {
  return v === "critical" ? "crit" : v === "high" ? "warn" : "muted";
}

export function severityTone(s: Severity): Tone {
  return s === "crit" ? "crit" : s === "warn" ? "warn" : "ok";
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "crit" | "warn" | "ok";
}) {
  const color = tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-body";
  return (
    <div className="px-4 py-3.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-faint">{label}</div>
      <div className={`mt-1 text-[22px] font-semibold leading-tight tabular-nums ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-faint">{sub}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "ok" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "bg-primary text-white hover:bg-primary-strong",
    ghost: "border border-edge text-muted hover:border-faint hover:text-body",
    ok: "border border-ok/50 text-ok hover:bg-ok/10",
    danger: "border border-crit/50 text-crit hover:bg-crit/10",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
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
    <Card className="animate-fade-in px-6 py-14 text-center">
      <p className="text-sm font-medium text-body">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-faint">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-strong"
        >
          {action.label}
        </Link>
      )}
    </Card>
  );
}

export function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton h-14 rounded-xl" />
      ))}
    </div>
  );
}

export const eur = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
export const num = (n: number) => new Intl.NumberFormat("en-GB").format(n);
