"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/store";

/**
 * Work that costs money, behind an account.
 *
 * Reading the workspace is free and open — the bill of materials, the risk
 * scores, every figure the engine computes. None of that calls a model, so
 * there is nothing to protect.
 *
 * Asking a question, assessing a notice or talking to Vigil each spend real
 * inference on a key shared by the whole team, and they write into a workspace
 * that belongs to somebody. Those sit behind a sign-in, so there is a person
 * attached to what was spent and to what was decided.
 */
export function RequireAccount({
  what,
  why,
  children,
}: {
  /** What is being gated, named the way the person would name it. */
  what: string;
  /** One line on why it needs an account, in terms of what they get. */
  why: string;
  children: React.ReactNode;
}) {
  const { hydrated, signedIn } = useWorkspace();

  // Render nothing rather than a flash of the wrong state.
  if (!hydrated) return null;
  if (signedIn) return <>{children}</>;

  return (
    <div className="border border-line px-7 py-7">
      <p className="text-[16px] text-fg">{what} needs an account.</p>
      <p className="mt-2.5 max-w-[62ch] text-[14px] leading-relaxed text-mid">{why}</p>
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <Link
          href="/sign-in"
          className="border border-fg px-5 py-2.5 text-[14px] text-fg transition-opacity hover:opacity-70"
        >
          Sign in
        </Link>
        <Link
          href="/sign-in"
          className="text-[14px] text-dim underline-offset-4 transition-colors hover:text-fg hover:underline"
        >
          Or create one — it takes a moment
        </Link>
      </div>
    </div>
  );
}

/** The same rule, for somewhere a whole panel would be too much. */
export function useAccountGate() {
  const { hydrated, signedIn } = useWorkspace();
  return { ready: hydrated, allowed: signedIn };
}
