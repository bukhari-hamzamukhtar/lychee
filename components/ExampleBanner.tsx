"use client";

import { useWorkspace } from "@/lib/store";

/**
 * Says, on every screen, that the figures below are not yours.
 *
 * The example is useful — it is hard to understand what a dependency graph buys
 * you by staring at an empty table. It is only harmful when it is silent, which
 * is what it used to be: three notices and a countdown, indistinguishable from
 * work the person had actually done.
 */
export function ExampleBanner() {
  const { demo, setDemo, hydrated } = useWorkspace();
  if (!hydrated || !demo) return null;
  return (
    <div className="border-b border-line bg-bg-raised">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2 px-8 py-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
        <p className="text-[13px] text-mid">
          You are looking at the example factory. None of these notices were sent to you.
        </p>
        <button
          onClick={() => setDemo(false)}
          className="text-[13px] text-dim underline-offset-4 transition-colors hover:text-fg hover:underline"
        >
          Clear it
        </button>
      </div>
    </div>
  );
}
