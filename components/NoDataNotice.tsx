"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { activeDataset } from "@/lib/graph";

/**
 * What to do with an empty workspace.
 *
 * Every screen here is computed from a bill of materials, so without one they
 * are all honestly blank. Blank with a row of zeros and no explanation is its
 * own kind of unhelpful, though, so this says which of the two things to do —
 * load your own, or look at the example — and gets out of the way the moment
 * either has happened.
 */

const DATA_ROUTES = [
  "/notices",
  "/parts",
  "/products",
  "/suppliers",
  "/certifications",
  "/approvals",
];

export function NoDataNotice() {
  const pathname = usePathname();
  const { hydrated, demo, bom, setDemo } = useWorkspace();

  if (!hydrated || demo || bom) return null;
  if (!DATA_ROUTES.some((r) => pathname.startsWith(r))) return null;
  if (activeDataset().nodes.length > 0) return null;

  return (
    <div className="mx-auto max-w-[1320px] px-8 pt-10">
      <div className="border border-line px-7 py-7">
        <p className="text-[16px] text-fg">Nothing is loaded yet.</p>
        <p className="mt-2.5 max-w-[64ch] text-[14px] leading-relaxed text-mid">
          Every figure in this workspace is computed from your bill of materials — which
          components go into which products, and in what quantity. Load one and these
          screens fill in. Until then they are empty, which is the truth.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <Link
            href="/import"
            className="border border-fg px-5 py-2.5 text-[14px] text-fg transition-opacity hover:opacity-70"
          >
            Load your bill of materials
          </Link>
          <button
            onClick={() => setDemo(true)}
            className="text-[14px] text-dim underline-offset-4 transition-colors hover:text-fg hover:underline"
          >
            Or try the example factory
          </button>
        </div>
      </div>
    </div>
  );
}
